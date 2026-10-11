"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import MascotSvg, { type Mood } from "./MascotSvg";
import { Rig } from "./rig";
import {
  ANGRY_LINES,
  CLICK_LINES,
  DIZZY_LINE,
  INTRO_LINES,
  PICKUP_LINES,
  SOFT_LANDING,
  WELCOME_BACK,
  hoverLines,
  pick,
} from "./lines";
import "./mascot.css";

type Pose = "idle" | "run" | "dash" | "wave" | "cheer" | "held" | "fall" | "splat" | "stomp";
type Mode = "wait" | "intro-run" | "intro-talk" | "follow" | "held" | "falling";
type Bubble = { id: number; text: string; intro?: boolean };
type Pt = { x: number; y: number };

const W = 120; // artwork size at scale 1
const H = 170;
const FIG_W = 64; // visible figure width (artwork units)
const FIG_H = 146; // feet to top of hijab (artwork units)
const INTRO_KEY = "mini-zikra-intro-seen";

const RUN_SPEED = 380; // px/s
const DASH_SPEED = 980;
const ACCEL = 1800; // px/s²: she speeds up and slows down instead of starting/stopping instantly
const DASH_POINTER = 1700; // cursor speed (px/s) that triggers the Naruto run
const DASH_SCROLL = 1900; // scroll speed (px/s) that triggers it
const GRAVITY = 2600; // px/s² when you drop her
const BIG_FALL = 140; // px; falls higher than this make her angry

// What she tries not to stand on: interactive things count triple, readable content once.
const INTERACTIVE = "a, button, input, textarea, select, label, summary, [role='tab']";
const CONTENT = "h1, h2, h3, h4, p, li, dt, dd, img, .project-card, [data-mascot]";

const smallScale = () => (window.innerWidth < 640 ? 0.7 : 0.9);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * Mini Zikra. Runs in on first load and introduces herself in comic bubbles, then shrinks and roams the
 * whole page: she follows the cursor from a safe distance, choosing a spot that covers as little text and
 * as few buttons as possible. Fast cursor moves or fast scrolling send her into a Naruto run with her abaya
 * streaming behind like a cape. She reacts to clicks and to hovering [data-mascot] elements.
 * Positions are written straight to the DOM in a rAF loop; React only re-renders on pose/mood/bubble changes.
 */
export default function Mascot() {
  const rootRef = useRef<HTMLDivElement>(null);
  const hopRef = useRef<HTMLDivElement>(null);
  const flipRef = useRef<HTMLDivElement>(null);
  const lookRef = useRef<SVGGElement>(null);
  const rigRef = useRef<Rig | null>(null);
  const poseRef = useRef<Pose>("idle");
  const bubbleRef = useRef<HTMLDivElement>(null);

  const [walkPose, setWalkPose] = useState<Pose>("idle");
  const [emotePose, setEmotePose] = useState<Pose | null>(null);
  const [emoteMood, setEmoteMood] = useState<Mood | null>(null);
  const [bubble, setBubble] = useState<Bubble | null>(null);
  const [typed, setTyped] = useState(0);
  const [hearts, setHearts] = useState<{ id: number; dx: number }[]>([]);

  const sim = useRef({
    mode: "wait" as Mode,
    x: -200,
    y: 0,
    tx: -200,
    ty: 0,
    s: 1,
    targetS: 1,
    dir: 1,
    freezeUntil: 0,
    dashUntil: 0,
    pointer: null as Pt | null,
    pointerAt: 0,
    pointerSpeed: 0,
    pointerAngle: null as number | null,
    lastPick: 0,
    lastAnchor: null as Pt | null,
    scrollY: 0,
    scrollAt: 0,
    scrollSpeed: 0,
    reduced: false,
    overHer: false,
    holdUntil: 0,
    raf: 0,
    last: 0,
    walkPose: "idle" as Pose,
    // on-screen velocity/acceleration fed to the physics rig
    px: 0,
    speed: 0,
    py: 0,
    rvx: 0,
    rvy: 0,
    rax: 0,
    ray: 0,
    dashDir: 1,
    vx: 0,
    vy: 0,
    dropY: 0,
    press: null as null | { x: number; y: number; id: number; t: number },
    dragged: false,
  });
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const ids = useRef(0);
  const introStep = useRef(0);
  const clicks = useRef<number[]>([]);
  const hover = useRef<{ el: Element | null; until: number }>({ el: null, until: 0 });

  const later = (key: string, ms: number, fn: () => void) => {
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(fn, ms);
  };

  /* --------------------------- choosing where to stand --------------------------- */

  const navBottom = () => (document.querySelector("header")?.getBoundingClientRect().bottom ?? 0) + 8;

  /** Keep a feet position fully on screen and below the nav. */
  const clampSpot = useCallback((x: number, y: number): Pt => {
    const m = sim.current;
    const fw = FIG_W * m.s;
    const fh = FIG_H * m.s;
    return {
      x: clamp(x, fw / 2 + 8, window.innerWidth - fw / 2 - 8),
      y: clamp(y, navBottom() + fh, window.innerHeight - 8),
    };
  }, []);

  /** How much of the page she'd cover standing with her feet at (x, y). 0 = empty background. */
  const coverage = useCallback((x: number, y: number) => {
    const m = sim.current;
    const fw = FIG_W * m.s;
    const fh = FIG_H * m.s;
    let total = 0;
    for (const px of [x - fw * 0.35, x, x + fw * 0.35]) {
      for (const py of [y - fh * 0.82, y - fh * 0.45, y - fh * 0.1]) {
        const el = document.elementsFromPoint(px, py).find((e) => !rootRef.current?.contains(e));
        if (!el) continue;
        if (el.closest(INTERACTIVE)) total += 3;
        else if (el.closest(CONTENT)) total += 1;
      }
    }
    return total / 9;
  }, []);

  /**
   * Pick a spot around `anchor` (the cursor) at a safe distance: the least-covering one, preferring spots
   * trailing behind the cursor's movement and close to where she already is.
   */
  const pickSpot = useCallback(
    (anchor: Pt, radiusMul = 1, sticky = true) => {
      const m = sim.current;
      const fh = FIG_H * m.s;
      const R = (70 + fh * 0.55) * radiusMul;
      const here = { x: m.x, y: m.y };
      const score = (feet: Pt, angle: number | null) => {
        const center = { x: feet.x, y: feet.y - fh / 2 };
        let sc = coverage(feet.x, feet.y) + dist(feet, here) * 0.0025;
        if (dist(center, anchor) < R * 0.7) sc += 3; // squeezed against an edge, too close to the cursor
        if (angle !== null) {
          if (m.pointerAngle !== null) sc += (1 + Math.cos(angle - m.pointerAngle)) * 0.5; // don't run ahead of the cursor
          else sc += (1 - Math.cos(angle - Math.PI / 4)) * 0.15; // default: below-right of it
        }
        return sc;
      };

      let best = { x: m.tx, y: m.ty };
      let bestScore = Infinity;
      if (sticky) {
        const cur = { x: m.tx, y: m.ty };
        const d = dist({ x: cur.x, y: cur.y - fh / 2 }, anchor);
        if (d > R * 0.75 && d < R * 1.3) bestScore = score(cur, null) - 0.35; // keep the current spot unless clearly worse
      }
      for (let k = 0; k < 12; k++) {
        const a = (k * Math.PI) / 6;
        const feet = clampSpot(anchor.x + Math.cos(a) * R, anchor.y + Math.sin(a) * R + fh / 2);
        const sc = score(feet, a);
        if (sc < bestScore) {
          bestScore = sc;
          best = feet;
        }
      }
      m.tx = best.x;
      m.ty = best.y;
      m.lastPick = performance.now();
      m.lastAnchor = anchor;
    },
    [clampSpot, coverage],
  );

  /* ------------------------------ animation loop ------------------------------ */

  const tick = useCallback((t: number) => {
    const m = sim.current;
    const root = rootRef.current;
    if (!root) return;
    const dt = Math.min(0.05, (t - (m.last || t)) / 1000);
    m.last = t;
    let active = false;

    // scale (intro size -> small)
    if (Math.abs(m.targetS - m.s) > 0.002) {
      m.s += (m.targetS - m.s) * Math.min(1, dt * 7);
      active = true;
    } else m.s = m.targetS;
    root.style.setProperty("--s", m.s.toFixed(4));

    // locomotion
    const dashing = t < m.dashUntil && !m.reduced;
    let pose: Pose = dashing && m.mode === "follow" ? "dash" : "idle";
    const moving = m.mode === "intro-run" || m.mode === "follow";
    const dx = m.tx - m.x;
    const dy = m.ty - m.y;
    const d = Math.hypot(dx, dy);
    let locomoting = false;
    if (m.mode === "held" || m.mode === "falling") {
      m.speed = 0;
      if (m.mode === "falling") {
        m.vy += GRAVITY * dt;
        m.vx *= Math.max(0, 1 - 1.2 * dt);
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        const half = (FIG_W * m.s) / 2;
        // bounce off the sides of the screen
        if (m.x < half) {
          m.x = half;
          m.vx = Math.abs(m.vx) * 0.5;
        } else if (m.x > window.innerWidth - half) {
          m.x = window.innerWidth - half;
          m.vx = -Math.abs(m.vx) * 0.5;
        }
        if (Math.abs(m.vx) > 40) m.dir = m.vx > 0 ? 1 : -1;
        const ground = window.innerHeight - 8;
        if (m.y >= ground) {
          m.y = ground;
          landRef.current();
        }
      }
      pose = m.mode === "held" ? "held" : "fall";
      active = true;
    } else if (moving && t >= m.freezeUntil && d > (m.mode === "intro-run" ? 1 : 5)) {
      if (m.reduced) {
        m.x = m.tx;
        m.y = m.ty;
      } else {
        // ease in to full speed, ease out to arrive without overshooting
        const top = Math.min(dashing ? DASH_SPEED : RUN_SPEED, Math.sqrt(2 * ACCEL * d));
        m.speed += clamp(top - m.speed, -ACCEL * 2 * dt, ACCEL * dt);
        const step = Math.min(d, m.speed * dt);
        m.x += (dx / d) * step;
        m.y += (dy / d) * step;
        locomoting = true;
        if (Math.abs(dx) > 2) m.dir = dx > 0 ? 1 : -1;
        pose = dashing ? "dash" : "run";
      }
      active = true;
    } else if (m.mode === "intro-run") {
      m.speed = 0;
      m.mode = "intro-talk";
      startRef.current();
    } else if (dashing) {
      m.dir = m.dashDir; // dashing in place (fast scroll): keep facing the way the action is going
    } else if (m.pointer && m.mode === "follow" && Math.abs(m.pointer.x - m.x) > 24) {
      m.dir = m.pointer.x > m.x ? 1 : -1; // standing still: turn to face the cursor
    }
    if (!locomoting) m.speed = 0;
    if (dashing) active = true;
    root.style.transform = `translate3d(${m.x.toFixed(1)}px,${m.y.toFixed(1)}px,0)`;
    if (flipRef.current) flipRef.current.style.transform = `scaleX(${m.dir})`;
    if (pose !== m.walkPose) {
      m.walkPose = pose;
      setWalkPose(pose);
    }

    // physics rig: joints, gait and cloth react to how she's actually moving on screen
    const rig = rigRef.current;
    if (rig && dt > 0) {
      const clampV = (v: number) => clamp(v, -3000, 3000);
      const nvx = clampV((m.x - m.px) / dt);
      const nvy = clampV((m.y - m.py) / dt);
      const k = Math.min(1, dt * 25);
      m.rax += ((nvx - m.rvx) / dt - m.rax) * k;
      m.ray += ((nvy - m.rvy) / dt - m.ray) * k;
      m.rvx += (nvx - m.rvx) * k;
      m.rvy += (nvy - m.rvy) * k;
      const settled = rig.update(dt, {
        vx: m.rvx,
        vy: m.rvy,
        ax: m.rax,
        ay: m.ray,
        dir: m.dir,
        scale: m.s,
        pose: poseRef.current,
        dashing: dashing && m.mode === "follow",
      });
      if (!settled) active = true;
    }
    m.px = m.x;
    m.py = m.y;

    // eyes follow the pointer
    if (m.pointer && lookRef.current) {
      const vx = (m.pointer.x - m.x) * m.dir;
      const vy = m.pointer.y - (m.y - (H - 57) * m.s);
      const len = Math.hypot(vx, vy) || 1;
      const k = Math.min(1, len / 160);
      lookRef.current.setAttribute("transform", `translate(${((vx / len) * 1.9 * k).toFixed(2)} ${((vy / len) * 1.5 * k).toFixed(2)})`);
      if (t - m.pointerAt < 400) active = true;
    }

    // keep the speech bubble on screen, tail pointing at her; flip below her if there's no room above
    const b = bubbleRef.current;
    if (b) {
      const vw = window.innerWidth;
      const bw = b.offsetWidth;
      const left = clamp(m.x - 46, 10, vw - bw - 10);
      b.style.left = `${(left - m.x).toFixed(1)}px`;
      b.style.setProperty("--tail", `${clamp(m.x - left, 20, bw - 20).toFixed(1)}px`);
      const below = m.y - FIG_H * m.s - 16 - b.offsetHeight < navBottom();
      if (b.dataset.below !== String(below)) b.dataset.below = String(below);
      active = true;
    }

    m.raf = active ? requestAnimationFrame(tick) : 0;
  }, []);

  const kick = useCallback(() => {
    const m = sim.current;
    if (!m.raf) {
      m.last = 0;
      m.raf = requestAnimationFrame(tick);
    }
  }, [tick]);

  /* ------------------------------ expressions ------------------------------ */

  const say = useCallback(
    (text: string, ms?: number, intro = false) => {
      setBubble({ id: ++ids.current, text, intro });
      if (ms) later("bubble", ms, () => setBubble(null));
      else clearTimeout(timers.current.bubble);
      kick();
    },
    [kick],
  );

  const emote = useCallback((pose: Pose | null, mood: Mood | null, ms: number) => {
    if (pose) {
      setEmotePose(pose);
      sim.current.freezeUntil = performance.now() + ms;
      later("pose", ms, () => setEmotePose(null));
    }
    if (mood) {
      setEmoteMood(mood);
      later("mood", ms, () => setEmoteMood(null));
    }
    kick();
  }, [kick]);

  const hop = useCallback((height: number, spin = false) => {
    if (sim.current.reduced || !hopRef.current) return;
    const frames: Keyframe[] = spin
      ? [{ transform: "rotate(0)" }, { transform: "translateY(-10px) rotate(360deg)" }, { transform: "rotate(720deg)" }]
      : [
          { transform: "none" },
          { transform: "scale(1.08, 0.9)", offset: 0.15 },
          { transform: `translateY(-${height}px) scale(0.95, 1.07)`, offset: 0.45 },
          { transform: "scale(1.06, 0.94)", offset: 0.8 },
          { transform: "none" },
        ];
    hopRef.current.animate(frames, { duration: spin ? 900 : 620, easing: "ease-out" });
  }, []);

  const burstHearts = useCallback(() => {
    const batch = [0, 1, 2].map((i) => ({ id: ++ids.current, dx: (i - 1) * 22 + Math.random() * 10 - 5 }));
    setHearts((h) => [...h, ...batch]);
    later(`hearts${batch[0].id}`, 1100, () => setHearts((h) => h.filter((x) => !batch.includes(x))));
  }, []);

  /* --------------------------------- intro --------------------------------- */

  const finishIntro = useCallback(() => {
    const m = sim.current;
    Object.keys(timers.current)
      .filter((k) => k.startsWith("intro"))
      .forEach((k) => clearTimeout(timers.current[k]));
    try {
      sessionStorage.setItem(INTRO_KEY, "1");
    } catch {}
    setBubble(null);
    setEmotePose(null);
    m.mode = "follow";
    m.targetS = smallScale();
    m.tx = m.x;
    m.ty = m.y;
    emote(null, "giggle", 900);
    // once she's small, go find a good spot near the cursor
    later("settle", 700, () => {
      if (m.pointer && !m.reduced) pickSpot(m.pointer, 1, false);
      else {
        const spot = clampSpot(m.x, m.y);
        m.tx = spot.x;
        m.ty = spot.y;
      }
      kick();
    });
    kick();
  }, [clampSpot, emote, kick, pickSpot]);

  const showIntroLine = useCallback(
    (i: number) => {
      if (i >= INTRO_LINES.length) return finishIntro();
      introStep.current = i;
      const text = INTRO_LINES[i];
      say(text, undefined, true);
      if (i === 0) emote("wave", null, 1800);
      if (i === INTRO_LINES.length - 1) emote("cheer", null, 1400);
      later("intro-next", 1100 + text.length * 45, () => showIntroLine(i + 1));
    },
    [emote, finishIntro, say],
  );

  // called from the rAF loop when she reaches her spot; the ref keeps tick() stable
  const startRef = useRef(() => {});
  startRef.current = () => showIntroLine(0);

  /* ------------------------------- set up ------------------------------- */

  useEffect(() => {
    const m = sim.current;
    m.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    m.scrollY = window.scrollY;
    let seen = false;
    try {
      seen = sessionStorage.getItem(INTRO_KEY) === "1";
    } catch {}

    const start = setTimeout(() => {
      const vw = window.innerWidth;
      const floor = window.innerHeight - 6;
      m.y = m.ty = floor;
      if (seen) {
        m.s = m.targetS = smallScale();
        m.x = -W;
        m.tx = 90;
        m.ty = floor - 4;
        m.mode = "follow";
        later("welcome", 700, () => say(WELCOME_BACK, 2200));
      } else {
        const big = clamp((window.innerHeight * 0.36) / H, 0.9, 1.7);
        m.s = m.targetS = big;
        m.x = -W * big;
        m.tx = Math.round(vw >= 1024 ? vw * 0.56 : vw / 2);
        m.mode = "intro-run";
      }
      kick();
    }, 650);

    // `force` skips the throttles; a slow approach towards her still makes her wait
    const follow = (force = false) => {
      if (m.mode !== "follow" || m.reduced || !m.pointer) return;
      const now = performance.now();
      if (m.overHer || now < m.holdUntil) return;
      const fh = FIG_H * m.s;
      const center = { x: m.x, y: m.y - fh / 2 };
      const R = 70 + fh * 0.55;
      // slow approach towards her = you probably want to click her: she waits for you
      if (m.pointerSpeed < 600 && m.pointerAngle !== null && dist(m.pointer, center) < R * 1.6) {
        const toHer = Math.atan2(center.y - m.pointer.y, center.x - m.pointer.x);
        if (Math.cos(toHer - m.pointerAngle) > 0.5) return;
      }
      if (!force && now - m.lastPick < 140) return;
      if (!force && m.lastAnchor && dist(m.pointer, m.lastAnchor) < 36) return;
      pickSpot(m.pointer);
      kick();
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const now = performance.now();
      const p = { x: e.clientX, y: e.clientY };
      if (m.pointer) {
        const dtm = Math.max(8, now - m.pointerAt);
        const moved = dist(p, m.pointer);
        m.pointerSpeed = m.pointerSpeed * 0.7 + ((moved / dtm) * 1000) * 0.3;
        if (moved > 2) m.pointerAngle = Math.atan2(p.y - m.pointer.y, p.x - m.pointer.x);
        if (m.pointerSpeed > DASH_POINTER && m.mode === "follow") {
          m.dashUntil = now + 650;
          // face the way the cursor is heading
          const cx = Math.cos(m.pointerAngle ?? 0);
          if (Math.abs(cx) > 0.3) m.dashDir = cx > 0 ? 1 : -1;
          else if (Math.abs(p.x - m.x) > 20) m.dashDir = p.x > m.x ? 1 : -1;
        }
      }
      m.pointer = p;
      m.pointerAt = now;
      follow();
      // one last look once the cursor comes to rest, so she ends up at the right distance
      later("rest", 260, () => {
        m.pointerSpeed = 0;
        follow(true);
      });
      kick();
    };

    const onScroll = () => {
      const now = performance.now();
      const dy = window.scrollY - m.scrollY;
      const dtm = Math.max(8, now - m.scrollAt);
      m.scrollSpeed = m.scrollSpeed * 0.6 + ((Math.abs(dy) / dtm) * 1000) * 0.4;
      m.scrollY = window.scrollY;
      m.scrollAt = now;
      if (m.mode !== "follow") return;
      if (m.scrollSpeed > DASH_SCROLL) {
        m.dashUntil = now + 700;
        m.dashDir = m.dir;
      }
      // content slid under her: find a clear spot again once scrolling slows down
      later("rescroll", 180, () => {
        if (m.pointer) follow(true);
        else {
          const spot = clampSpot(m.x, m.y);
          if (coverage(spot.x, spot.y) > 0.5) pickSpot({ x: spot.x, y: spot.y - FIG_H * m.s * 1.2 }, 1, false);
        }
        kick();
      });
      kick();
    };

    const onDown = (e: PointerEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      if (m.mode !== "follow") return;
      if (e.pointerType !== "mouse") {
        // touch: run over near where you tapped
        m.pointer = { x: e.clientX, y: e.clientY };
        m.pointerAngle = null;
        if (!m.reduced) pickSpot(m.pointer, 1, false);
      }
      hop(12);
      emote(null, "wow", 500);
      kick();
    };

    const onOver = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || m.mode !== "follow") return;
      const el = (e.target as Element | null)?.closest?.("[data-mascot]") ?? null;
      if (el === hover.current.el) return;
      hover.current.el = el;
      const now = performance.now();
      if (!el || now < hover.current.until) return;
      const lines = hoverLines(el.getAttribute("data-mascot") ?? "", el.getAttribute("data-mascot-name") ?? undefined);
      if (!lines.length) return;
      hover.current.until = now + 3500;
      say(pick(lines), 2400);
      emote(null, Math.random() > 0.5 ? "wow" : "grin", 1200);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && m.mode.startsWith("intro")) finishIntro();
    };

    const onResize = () => {
      if (m.mode !== "follow") return;
      const spot = clampSpot(m.tx, m.ty);
      m.tx = spot.x;
      m.ty = spot.y;
      kick();
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("pointerover", onOver, { passive: true });
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    const pending = timers.current;
    return () => {
      clearTimeout(start);
      cancelAnimationFrame(m.raf);
      m.raf = 0;
      Object.values(pending).forEach(clearTimeout);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("pointerover", onOver);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [clampSpot, coverage, emote, finishIntro, hop, kick, pickSpot, say]);

  // build the physics rig on the SVG before the first paint
  useLayoutEffect(() => {
    const svg = flipRef.current?.querySelector("svg");
    if (!svg) return;
    rigRef.current = new Rig(svg, window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    return () => {
      rigRef.current = null;
    };
  }, []);

  // typewriter
  useEffect(() => {
    if (!bubble) return;
    if (sim.current.reduced) {
      setTyped(bubble.text.length);
      return;
    }
    setTyped(0);
    let n = 0;
    const id = setInterval(() => {
      n++;
      setTyped(n);
      if (n >= bubble.text.length) clearInterval(id);
    }, 30);
    return () => clearInterval(id);
  }, [bubble]);

  /* ------------------------------- picking her up ------------------------------- */

  const land = useCallback(() => {
    const m = sim.current;
    const fell = m.y - m.dropY;
    rigRef.current?.land(m.vy);
    m.mode = "follow";
    m.tx = m.x;
    m.ty = m.y;
    m.vx = m.vy = 0;
    setEmoteMood(null);
    hopRef.current?.animate(
      [{ transform: "scale(1.25, 0.7)" }, { transform: "scale(0.95, 1.05)", offset: 0.5 }, { transform: "none" }],
      { duration: 380, easing: "ease-out" },
    );
    if (fell > BIG_FALL) {
      // splat, see stars... then get up angry and stomp
      m.holdUntil = performance.now() + 4200;
      emote("splat", "dizzy", 1100);
      say("Ouch!!", 1000);
      later("angry", 1100, () => {
        emote("stomp", "angry", 2800);
        say(pick(ANGRY_LINES), 2800);
        hop(8);
        later("stomp2", 330, () => hop(8));
        later("stomp3", 660, () => hop(8));
      });
    } else {
      m.holdUntil = performance.now() + 1200;
      emote("cheer", "giggle", 900);
      say(SOFT_LANDING, 1800);
    }
    kick();
  }, [emote, hop, kick, say]);
  const landRef = useRef(land);
  landRef.current = land;

  const onDownHer = (e: React.PointerEvent<HTMLButtonElement>) => {
    const m = sim.current;
    m.dragged = false;
    if (m.mode !== "follow") return;
    m.press = { x: e.clientX, y: e.clientY, id: e.pointerId, t: performance.now() };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onDragHer = (e: React.PointerEvent<HTMLButtonElement>) => {
    const m = sim.current;
    if (!m.press || e.pointerId !== m.press.id) return;
    const now = performance.now();
    if (m.mode !== "held") {
      if (Math.hypot(e.clientX - m.press.x, e.clientY - m.press.y) < 6) return;
      // picked up!
      m.mode = "held";
      m.dragged = true;
      m.overHer = false;
      clearTimeout(timers.current.scoot);
      clearTimeout(timers.current.mood);
      setEmotePose(null);
      setEmoteMood("wow");
      say(pick(PICKUP_LINES), 1800);
    }
    // she's held by the top of her hijab; remember the hand's velocity for throwing
    const x = e.clientX;
    const y = e.clientY + FIG_H * m.s * 0.92;
    const dtm = Math.max(8, now - m.press.t);
    m.vx = m.vx * 0.5 + ((x - m.x) / dtm) * 1000 * 0.5;
    m.vy = m.vy * 0.5 + ((y - m.y) / dtm) * 1000 * 0.5;
    m.x = x;
    m.y = y;
    m.press.t = now;
    kick();
  };

  const onReleaseHer = () => {
    const m = sim.current;
    const lastMove = m.press?.t ?? 0;
    m.press = null;
    if (m.mode !== "held") return;
    // only throw if the hand was still moving when it let go; otherwise just drop
    if (performance.now() - lastMove > 90) m.vx = m.vy = 0;
    m.dropY = m.y;
    m.vx = clamp(m.vx, -1400, 1400);
    m.vy = clamp(m.vy, -900, 600);
    m.mode = "falling";
    if (m.reduced) {
      m.y = window.innerHeight - 8;
      landRef.current();
    }
    kick();
  };

  /* ------------------------------- hovering / clicking her ------------------------------- */

  // Hovering her: she stops for you. Linger without clicking and she scoots aside so she's never in the way.
  const scootLater = (ms = 1600): void =>
    later("scoot", ms, () => {
      const m = sim.current;
      if (!m.overHer || m.mode !== "follow" || !m.pointer) return;
      if (performance.now() < m.holdUntil) return scootLater(m.holdUntil - performance.now() + 600);
      m.overHer = false;
      pickSpot(m.pointer, 1.5, false);
      m.holdUntil = performance.now() + 2500;
      say("Oops, am I in the way?", 1800);
      emote(null, "wow", 900);
      kick();
    });
  const onEnterHer = (e: React.PointerEvent) => {
    const m = sim.current;
    if (e.pointerType !== "mouse" || m.mode !== "follow") return;
    m.overHer = true;
    m.tx = m.x;
    m.ty = m.y;
    scootLater();
  };
  const onLeaveHer = () => {
    sim.current.overHer = false;
    clearTimeout(timers.current.scoot);
  };

  const onClickHer = () => {
    const m = sim.current;
    if (m.dragged) {
      m.dragged = false; // that was a drag, not a click
      return;
    }
    if (m.mode === "intro-talk") return showIntroLine(introStep.current + 1);
    if (m.mode !== "follow") return;
    if (m.overHer) scootLater(3200); // still playing with her: wait until she has finished talking

    const now = performance.now();
    clicks.current = [...clicks.current.filter((c) => now - c < 2200), now];
    if (clicks.current.length >= 5) {
      clicks.current = [];
      hop(0, true);
      emote("idle", "dizzy", 2000);
      say(DIZZY_LINE, 2000);
      return;
    }
    hop(30);
    burstHearts();
    emote("cheer", "giggle", 900);
    say(pick(CLICK_LINES), 2400);
  };

  const talking = bubble !== null && typed < bubble.text.length;
  const pose: Pose = emotePose ?? walkPose;
  poseRef.current = pose;

  // a new pose (emote timers ending, etc.) wakes the loop so the rig can blend into it
  useEffect(() => {
    kick();
  }, [pose, kick]);
  const mood: Mood = emoteMood ?? (pose === "dash" ? "grin" : talking ? "talk" : "happy");

  return (
    <div ref={rootRef} className="mascot-root" data-pose={pose} style={{ transform: "translate3d(-200px,0,0)" }}>
      {bubble && (
        <div ref={bubbleRef} key={bubble.id} aria-hidden className={`mascot-bubble ${bubble.intro ? "is-intro" : ""}`}>
          <span>{bubble.text.slice(0, typed)}</span>
          <span className="invisible">{bubble.text.slice(typed)}</span>
          {bubble.intro && (
            <button type="button" className="mascot-skip" onClick={finishIntro}>
              skip ›
            </button>
          )}
        </div>
      )}

      {hearts.map((h) => (
        <span key={h.id} aria-hidden className="mascot-heart" style={{ "--dx": `${h.dx}px` } as React.CSSProperties}>
          <svg viewBox="0 0 24 22" width="18" height="17">
            <path
              d="M12 21 C 5 15 1 11.5 1 7 A 5.5 5.5 0 0 1 12 4.5 A 5.5 5.5 0 0 1 23 7 C 23 11.5 19 15 12 21 Z"
              fill="#d97f90"
              stroke="#1a1720"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      ))}

      <button
        type="button"
        className="mascot-btn"
        aria-label="Mini Zikra. Click to say hi"
        data-cursor-mini
        onPointerEnter={onEnterHer}
        onPointerLeave={onLeaveHer}
        onPointerDown={onDownHer}
        onPointerMove={onDragHer}
        onPointerUp={onReleaseHer}
        onPointerCancel={onReleaseHer}
        onClick={onClickHer}
      >
        <div ref={hopRef} className="mascot-hop">
          <div ref={flipRef} className="mascot-flip">
            <MascotSvg ref={lookRef} mood={mood} />
          </div>
        </div>
      </button>
    </div>
  );
}
