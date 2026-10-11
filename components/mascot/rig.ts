/**
 * Procedural animation rig for mini Zikra.
 *
 * - Joints (body lean/bob/squash, head tilt, arms, legs) are driven by damped springs chasing per-pose targets,
 *   so poses blend with follow-through instead of snapping.
 * - The gait is phase-driven by distance travelled, so stride and lean scale with her real speed (walk → run → dash).
 * - The abaya panels and the hijab drape are verlet ropes simulated in the body's local frame
 *   (gravity + air drag + the frame's own acceleration), rendered every frame as smooth outlined ribbons.
 *   The rose print is mapped onto the cloth so it moves with the fabric.
 *
 * Everything works in artwork units (the 120×170 viewBox). The rig writes SVG attributes directly.
 */

export type RigPose = "idle" | "run" | "dash" | "wave" | "cheer" | "held" | "fall" | "splat" | "stomp";

export interface RigInput {
  /** her velocity / acceleration on screen, px/s and px/s² */
  vx: number;
  vy: number;
  ax: number;
  ay: number;
  /** 1 = facing right, -1 = facing left (the artwork is mirrored) */
  dir: number;
  /** current artwork scale (px per unit) */
  scale: number;
  pose: RigPose;
  dashing: boolean;
}

type V2 = { x: number; y: number };

/* ------------------------------------------------------------------ springs */

class Spring {
  v = 0;
  constructor(public x = 0) {}
  step(target: number, dt: number, k: number, zeta = 0.75) {
    const c = 2 * Math.sqrt(k) * zeta;
    this.v += (k * (target - this.x) - c * this.v) * dt;
    this.x += this.v * dt;
  }
  snap(target: number) {
    this.x = target;
    this.v = 0;
  }
  resting(target: number) {
    return Math.abs(this.v) < 0.05 && Math.abs(target - this.x) < 0.05;
  }
}

/* ------------------------------------------------------------------ cloth */

class Rope {
  pts: V2[] = [];
  prev: V2[] = [];
  readonly seg: number;

  constructor(
    public anchor: V2,
    dir: V2,
    public n: number,
    length: number,
    /** constant sideways push (u/s²) that gives the cloth its resting A-line flare */
    public flare: V2 = { x: 0, y: 0 },
    public drag = 0.8,
  ) {
    this.seg = length / (n - 1);
    const len = Math.hypot(dir.x, dir.y);
    for (let i = 0; i < n; i++) {
      const p = { x: anchor.x + (dir.x / len) * this.seg * i, y: anchor.y + (dir.y / len) * this.seg * i };
      this.pts.push(p);
      this.prev.push({ ...p });
    }
  }

  /** One fixed step. `accel` is the frame's field (gravity − frame acceleration); `air` is the wind velocity. */
  step(dt: number, accel: V2, air: V2) {
    const { pts, prev } = this;
    let motion = 0;
    for (let i = 1; i < this.n; i++) {
      const p = pts[i];
      const q = prev[i];
      const vx = (p.x - q.x) / dt;
      const vy = (p.y - q.y) / dt;
      // drag pulls the point's velocity toward the air's velocity (wind in the moving frame)
      const ax = accel.x + this.flare.x + this.drag * (air.x - vx);
      const ay = accel.y + this.flare.y + this.drag * (air.y - vy);
      const nx = p.x + (p.x - q.x) * 0.985 + ax * dt * dt;
      const ny = p.y + (p.y - q.y) * 0.985 + ay * dt * dt;
      q.x = p.x;
      q.y = p.y;
      p.x = nx;
      p.y = ny;
    }
    pts[0].x = this.anchor.x;
    pts[0].y = this.anchor.y;
    for (let it = 0; it < 8; it++) {
      for (let i = 1; i < this.n; i++) this.keep(i - 1, i, this.seg, 1);
      // light bending stiffness so fabric curves instead of folding like a chain
      for (let i = 2; i < this.n; i++) this.keep(i - 2, i, this.seg * 1.96, 0.25);
    }
    // how fast the cloth is actually moving once the constraints have been satisfied
    for (let i = 1; i < this.n; i++) {
      motion = Math.max(motion, (Math.abs(pts[i].x - prev[i].x) + Math.abs(pts[i].y - prev[i].y)) / dt);
    }
    return motion;
  }

  private keep(a: number, b: number, rest: number, stiffness: number) {
    const pa = this.pts[a];
    const pb = this.pts[b];
    const dx = pb.x - pa.x;
    const dy = pb.y - pa.y;
    const d = Math.hypot(dx, dy) || 1e-6;
    if (stiffness < 1 && d > rest) return; // bending only pushes apart, never pulls
    const diff = ((d - rest) / d) * stiffness;
    if (a === 0) {
      pb.x -= dx * diff;
      pb.y -= dy * diff;
    } else {
      pa.x += dx * diff * 0.5;
      pa.y += dy * diff * 0.5;
      pb.x -= dx * diff * 0.5;
      pb.y -= dy * diff * 0.5;
    }
  }

  /** point + unit normal at a fractional position along the rope (0 = anchor, 1 = tip) */
  frame(t: number) {
    const f = Math.min(this.n - 1.001, Math.max(0, t * (this.n - 1)));
    const i = Math.floor(f);
    const k = f - i;
    const a = this.pts[i];
    const b = this.pts[i + 1];
    const tx = b.x - a.x;
    const ty = b.y - a.y;
    const len = Math.hypot(tx, ty) || 1;
    return { x: a.x + tx * k, y: a.y + ty * k, tx: tx / len, ty: ty / len, nx: -ty / len, ny: tx / len };
  }

  /** unit normals at each point (averaged neighbouring segments) */
  normals() {
    return this.pts.map((_, i) => {
      const a = this.pts[Math.max(0, i - 1)];
      const b = this.pts[Math.min(this.n - 1, i + 1)];
      const tx = b.x - a.x;
      const ty = b.y - a.y;
      const len = Math.hypot(tx, ty) || 1;
      return { x: -ty / len, y: tx / len };
    });
  }
}

/* ------------------------------------------------------------------ path helpers */

const f1 = (n: number) => n.toFixed(1);

/** Smooth curve through points using quadratic segments via midpoints. Continues from the current point. */
function smoothThrough(points: V2[]) {
  if (points.length === 1) return `L${f1(points[0].x)} ${f1(points[0].y)}`;
  let d = "";
  for (let i = 0; i < points.length - 1; i++) {
    const p = points[i];
    const q = points[i + 1];
    d += `Q${f1(p.x)} ${f1(p.y)} ${f1((p.x + q.x) / 2)} ${f1((p.y + q.y) / 2)}`;
  }
  const last = points[points.length - 1];
  return d + `L${f1(last.x)} ${f1(last.y)}`;
}

/* ------------------------------------------------------------------ garment definitions */

// Abaya panels: centre line from the shoulder down to the hem, with asymmetric widths
// (inner = the open front edge, outer = the side seam).
const PANEL_OUTER = [5, 5.6, 6.4, 7, 7.6, 8.2];
const PANEL_INNER = [5, 5.2, 5.6, 6.2, 7, 8];
const PANEL = {
  l: { anchor: { x: 45, y: 95 }, sign: 1, flare: { x: -55, y: 0 } },
  r: { anchor: { x: 75, y: 95 }, sign: -1, flare: { x: 55, y: 0 } },
} as const;

// Hijab drape: the part across the chest is fixed; the loose end over the shoulder is a tapered rope.
const DRAPE_TOP = "M81.5 69.5C80.5 77 70.5 80 58.5 80.5C48.5 81 41.5 86 38.5 95.5";
const DRAPE_BOTTOM = "C51 98.5 57 95 64.5 94C75 93 83 88 85.5 79.5C86 76.5 84.5 73 81.5 69.5Z";
const DRAPE_B = { x: 38.5, y: 95.5 };
const DRAPE_C = { x: 48, y: 104.5 };
const DRAPE_HALF_W = [6.5, 5.4, 4.2, 2.8, 0.8];

const GRAVITY = 620; // artwork units / s²

/* ------------------------------------------------------------------ the rig */

export class Rig {
  private body = { lean: new Spring(), bob: new Spring(), swing: new Spring(), squash: new Spring(), splatY: new Spring() };
  private head = new Spring();
  private legs = { l: new Spring(), r: new Spring() };
  private arms = { l: new Spring(), r: new Spring() };
  private phase = 0;
  private t = 0;
  private acc = 0;
  private panels: Record<"l" | "r", Rope>;
  private drape: Rope;
  private panelBack = { l: false, r: false };
  private el: Record<string, Element[]> = {};
  settled = false;

  constructor(
    private svg: SVGSVGElement,
    private reduced: boolean,
  ) {
    this.panels = {
      l: new Rope(PANEL.l.anchor, { x: -0.06, y: 1 }, 6, 52, PANEL.l.flare),
      r: new Rope(PANEL.r.anchor, { x: 0.06, y: 1 }, 6, 52, PANEL.r.flare),
    };
    this.drape = new Rope({ x: 43.3, y: 100 }, { x: -0.22, y: 1 }, 5, 23, { x: -20, y: 0 }, 1.1);
    const q = (sel: string) => Array.from(svg.querySelectorAll(sel));
    for (const key of [
      "m-body",
      "m-head",
      "m-leg-l",
      "m-leg-r",
      "m-arm-l",
      "m-arm-r",
      "m-drape-fill",
      "m-shadow",
      "m-panel-l",
      "m-panel-r",
      "m-clip-abaya-l",
      "m-clip-abaya-r",
    ])
      this.el[key] = q(`.${key}`);
    // let the cloth fall into its resting drape before the first paint
    for (let i = 0; i < 240; i++) this.stepCloth(1 / 120, { x: 0, y: GRAVITY }, { x: 0, y: 0 });
    this.render();
  }

  /** Big landings squash her proportionally to the impact speed (px/s). */
  land(impact: number) {
    if (this.reduced) return;
    this.body.squash.v -= Math.min(9, impact / 260);
  }

  update(dt: number, inp: RigInput) {
    this.t += dt;
    const t = this.t;
    const s = Math.max(0.2, inp.scale);
    const speed = Math.hypot(inp.vx, inp.vy);
    const sp = this.reduced ? 0 : Math.min(1, speed / 380); // 0 standing … 1 running
    const pose = inp.pose;

    // gait: phase advances with distance, one stride cycle ≈ 44 artwork units
    if (!this.reduced) this.phase += ((speed / s) * dt * Math.PI * 2) / 44;
    const swing = Math.sin(this.phase);

    // ---- joint targets for this pose
    let lean = 5 * sp + (inp.dashing ? 25 : 0);
    let bob = -Math.abs(swing) * 2.6 * sp;
    let legAmp = 26 * sp + (inp.dashing ? 14 : 0);
    let legL = swing * legAmp;
    let legR = -swing * legAmp;
    let armL = -swing * 28 * sp;
    let armR = swing * 28 * sp;
    let head = inp.dashing ? -8 : 0;
    let hang = 0; // pendulum angle while held (pivot at the top of the hijab)
    let splat = 0;

    if (inp.dashing) {
      // Naruto run: arms straight back
      armL = 64 + Math.sin(t * 40) * 4;
      armR = 66 + Math.sin(t * 40 + 1) * 4;
    }
    switch (pose) {
      case "wave":
        armR = -126 + Math.sin(t * 15) * 14;
        head = -5;
        break;
      case "cheer":
        armR = -128 + Math.sin(t * 20) * 10;
        armL = 128 - Math.sin(t * 20) * 10;
        bob = -Math.abs(Math.sin(t * 10)) * 2.5;
        break;
      case "held": {
        // swing like a pendulum against the hand's motion; kick and flail
        hang = Math.max(-32, Math.min(32, ((inp.vx * inp.dir) / s) * 0.035)) + Math.sin(t * 4) * 3; // feet lag behind the hand
        lean = 0;
        bob = 0;
        legL = Math.sin(t * 26) * 20;
        legR = -legL;
        armR = -128 + Math.sin(t * 30) * 14;
        armL = 128 - Math.sin(t * 30 + 1) * 14;
        break;
      }
      case "fall":
        lean = 0;
        bob = 0;
        legL = 22 + Math.sin(t * 34) * 6;
        legR = -22 - Math.sin(t * 34) * 6;
        armR = -135 + Math.sin(t * 40) * 16;
        armL = 135 - Math.sin(t * 40) * 16;
        break;
      case "splat":
        lean = -90;
        splat = -24;
        legL = 10;
        legR = -6;
        armL = 30;
        armR = -20;
        break;
      case "stomp":
        lean = Math.sin(t * 40) * 2.5;
        bob = -Math.abs(Math.sin(t * 20)) * 1.5;
        armL = 14;
        armR = -14;
        break;
    }

    // ---- integrate joints (substeps keep stiff springs stable)
    const sub = Math.max(1, Math.ceil(dt / (1 / 120)));
    const h = dt / sub;
    for (let i = 0; i < sub; i++) {
      if (this.reduced) {
        this.body.lean.snap(lean);
        this.body.bob.snap(0);
        this.body.swing.snap(0);
        this.body.splatY.snap(splat);
        this.head.snap(0);
        this.legs.l.snap(0);
        this.legs.r.snap(0);
        this.arms.l.snap(armL);
        this.arms.r.snap(armR);
        this.body.squash.snap(0);
        break;
      }
      this.body.lean.step(lean, h, pose === "splat" ? 90 : 160, 0.6);
      this.body.bob.step(bob, h, 400, 0.8);
      this.body.swing.step(hang, h, 28, 0.22); // loose pendulum
      this.body.splatY.step(splat, h, 120, 0.7);
      this.body.squash.step(0, h, 260, 0.28); // wobbly jelly squash
      this.head.step(head + this.body.lean.v * -0.012, h, 140, 0.45); // head lags behind body motion
      this.legs.l.step(legL, h, 500, 0.7);
      this.legs.r.step(legR, h, 500, 0.7);
      this.arms.l.step(armL, h, 320, 0.55);
      this.arms.r.step(armR, h, 320, 0.55);
    }

    // ---- cloth, in the body's local frame
    // world → artwork units, mirrored when facing left, then rotated into the leaning body frame
    const ang = ((this.body.lean.x + this.body.swing.x) * Math.PI) / 180;
    const toLocal = (x: number, y: number): V2 => {
      const lx = (x * inp.dir) / s;
      const ly = y / s;
      const c = Math.cos(-ang);
      const sn = Math.sin(-ang);
      return { x: lx * c - ly * sn, y: lx * sn + ly * c };
    };
    // the frame's own acceleration makes cloth lag when she starts/stops; capped so a sudden start
    // doesn't fling it out like a flag
    const clampA = (a: number) => Math.max(-900, Math.min(900, a)) * 0.5;
    const g = toLocal(0, GRAVITY * s);
    const frameAcc = toLocal(clampA(inp.ax), clampA(inp.ay));
    const field = { x: g.x - frameAcc.x, y: g.y - frameAcc.y };
    const vel = toLocal(inp.vx, inp.vy);
    // anime physics: the Naruto run gets extra wind so the abaya streams out like a cape
    const wind = inp.dashing ? 1.35 : 1;
    const air = this.reduced ? { x: 0, y: 0 } : { x: -vel.x * wind, y: -vel.y * wind };
    this.acc += dt;
    let motion = 0;
    while (this.acc >= 1 / 120) {
      motion = Math.max(motion, this.stepCloth(1 / 120, field, air));
      this.acc -= 1 / 120;
    }

    // ---- rest detection so the loop can sleep while she stands still
    this.settled =
      (pose === "idle" || pose === "run") &&
      speed < 2 &&
      motion < 3 && // ≈ 2-3 px/s: an imperceptible creep
      this.body.lean.resting(lean) &&
      this.body.bob.resting(0) &&
      this.body.squash.resting(0) &&
      this.body.swing.resting(0) &&
      this.head.resting(head) &&
      this.arms.l.resting(armL) &&
      this.arms.r.resting(armR) &&
      this.legs.l.resting(legL) &&
      this.legs.r.resting(legR);

    this.render(speed);
    return this.settled;
  }

  private stepCloth(dt: number, field: V2, air: V2) {
    return Math.max(
      this.panels.l.step(dt, field, air),
      this.panels.r.step(dt, field, air),
      this.drape.step(dt, field, air),
    );
  }

  /* ---------------------------------------------------------------- rendering */

  private set(key: string, attr: string, value: string) {
    for (const e of this.el[key] ?? []) e.setAttribute(attr, value);
  }

  private render(speed = 0) {
    const b = this.body;
    const sq = b.squash.x * 0.06; // negative = flattened
    const sx = 1 - sq * 0.6;
    const sy = 1 + sq;
    this.set(
      "m-body",
      "transform",
      `translate(0 ${f1(b.bob.x + b.splatY.x)}) rotate(${f1(b.swing.x)} 60 28) rotate(${f1(b.lean.x)} 60 160) translate(60 160) scale(${sx.toFixed(3)} ${sy.toFixed(3)}) translate(-60 -160)`,
    );
    this.set("m-head", "transform", `rotate(${f1(this.head.x)} 60 88)`);
    this.set("m-leg-l", "transform", `rotate(${f1(this.legs.l.x)} 51 121)`);
    this.set("m-leg-r", "transform", `rotate(${f1(this.legs.r.x)} 69 121)`);
    this.set("m-arm-l", "transform", `rotate(${f1(this.arms.l.x)} 47 96)`);
    this.set("m-arm-r", "transform", `rotate(${f1(this.arms.r.x)} 73 96)`);

    // raised arms are drawn in front of the head
    this.toggleLayer("m-arm-l", this.arms.l.x > 95);
    this.toggleLayer("m-arm-r", this.arms.r.x < -95);

    // ground shadow stretches with speed
    const stretch = 1 + Math.min(0.5, speed / 1600);
    this.set("m-shadow", "transform", `translate(60 164) scale(${stretch.toFixed(2)} 1) translate(-60 -164)`);

    for (const side of ["l", "r"] as const) this.renderPanel(side);
    this.renderDrape();
  }

  /** show the front or back copy of a double-drawn part */
  private toggleLayer(key: string, front: boolean) {
    for (const e of this.el[key] ?? []) {
      const isFront = e.classList.contains("m-layer-front");
      (e as SVGElement).style.display = isFront === front ? "" : "none";
    }
  }

  private renderPanel(side: "l" | "r") {
    const rope = this.panels[side];
    const cfg = PANEL[side];
    const norms = rope.normals();
    const outer = rope.pts.map((p, i) => ({ x: p.x + norms[i].x * PANEL_OUTER[i] * cfg.sign, y: p.y + norms[i].y * PANEL_OUTER[i] * cfg.sign }));
    const inner = rope.pts.map((p, i) => ({ x: p.x - norms[i].x * PANEL_INNER[i] * cfg.sign, y: p.y - norms[i].y * PANEL_INNER[i] * cfg.sign }));
    const tip = rope.pts[rope.n - 1];
    const prevTip = rope.pts[rope.n - 2];
    const hem = { x: tip.x + (tip.x - prevTip.x) * 0.25, y: tip.y + (tip.y - prevTip.y) * 0.25 };

    const d =
      `M${f1(inner[0].x)} ${f1(inner[0].y)}` +
      smoothThrough(inner.slice(1)) +
      `Q${f1(hem.x)} ${f1(hem.y)} ${f1(outer[rope.n - 1].x)} ${f1(outer[rope.n - 1].y)}` +
      smoothThrough(outer.slice(0, -1).reverse()) +
      "Z";
    const trim = `M${f1(inner[1].x)} ${f1(inner[1].y)}` + smoothThrough(inner.slice(2));

    // streaming far behind her → draw behind the body instead of in front
    const trailing = rope.anchor.x - tip.x;
    const wasBack = this.panelBack[side];
    const back = wasBack ? trailing > 12 : trailing > 20;
    this.panelBack[side] = back;

    this.set(`m-clip-abaya-${side}`, "d", d);
    for (const g of this.el[`m-panel-${side}`] ?? []) {
      const isBack = g.classList.contains("m-layer-back");
      (g as SVGElement).style.display = isBack === back ? "" : "none";
      if (isBack !== back) continue;
      g.querySelector(".m-cloth-fill")?.setAttribute("d", d);
      g.querySelector(".m-cloth-line")?.setAttribute("d", d);
      g.querySelector(".m-cloth-trim")?.setAttribute("d", trim);
      // rose print rides on the fabric
      for (const petal of Array.from(g.querySelectorAll<SVGElement>(".m-petal"))) {
        const ps = Number(petal.dataset.s);
        const pu = Number(petal.dataset.u);
        const fr = rope.frame(ps);
        const wOut = PANEL_OUTER[Math.round(ps * (rope.n - 1))];
        const wIn = PANEL_INNER[Math.round(ps * (rope.n - 1))];
        const off = pu >= 0 ? pu * wOut * cfg.sign : pu * wIn * cfg.sign;
        const x = fr.x + fr.nx * off;
        const y = fr.y + fr.ny * off;
        const rot = (Math.atan2(fr.ty, fr.tx) * 180) / Math.PI - 90 + Number(petal.dataset.r);
        petal.setAttribute("transform", `translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)}) scale(${petal.dataset.sc})`);
      }
    }
  }

  private renderDrape() {
    const rope = this.drape;
    const norms = rope.normals();
    const sideB: V2[] = [];
    const sideC: V2[] = [];
    for (let i = 1; i < rope.n; i++) {
      const p = rope.pts[i];
      const w = DRAPE_HALF_W[i];
      sideB.push({ x: p.x + norms[i].x * w, y: p.y + norms[i].y * w });
      sideC.push({ x: p.x - norms[i].x * w, y: p.y - norms[i].y * w });
    }
    const tip = rope.pts[rope.n - 1];
    const d =
      DRAPE_TOP +
      smoothThrough([DRAPE_B, ...sideB, tip]) +
      smoothThrough([tip, ...sideC.reverse(), DRAPE_C]) +
      DRAPE_BOTTOM;
    this.set("m-drape-fill", "d", d);
  }
}
