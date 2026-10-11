import { forwardRef } from "react";

export type Mood = "happy" | "talk" | "grin" | "wow" | "giggle" | "dizzy" | "angry";

const INK = "#1a1720";
const SKIN = "#b27b58";
const SKIN_SHADE = "#9a6647";
const HIJAB = "#ecd3d8";
const HIJAB_FOLD = "#d6b3bb";
const HIJAB_SHADE = "#dfbec6";
const ABAYA = "#fbf8f3";
const BODYSUIT = "#ffffff";
const JEANS = "#25222c";
const JEANS_SEAM = "#45404f";
const LIPS = "#9a4458";
const ROSES = ["#e8a3ae", "#d97f90", "#c9707f", "#f2c4c4", "#d49c7d"];
const TRIM = "#cfc8d6";

const S = { stroke: INK, strokeWidth: 2, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

/** A small leaf/petal used for the rose pattern on the abaya. */
function Petal({ x, y, r, c, s = 1 }: { x: number; y: number; r: number; c: string; s?: number }) {
  return (
    <path
      d="M0 0 C 3 -5.5 9 -5.5 11 0 C 9 5.5 3 5.5 0 0 Z"
      fill={c}
      transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}
    />
  );
}

/** Rose print: petals in different shades, scattered with a fixed seed so it never changes between renders. */
function RosePrint({ seed, y0, y1, x0, x1 }: { seed: number; y0: number; y1: number; x0: number; x1: number }) {
  const petals = [];
  let n = seed;
  const rand = () => ((n = (n * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 14; i++) {
    petals.push(
      <Petal
        key={i}
        x={x0 + rand() * (x1 - x0)}
        y={y0 + rand() * (y1 - y0)}
        r={rand() * 360}
        c={ROSES[Math.floor(rand() * ROSES.length)]}
        s={0.55 + rand() * 0.5}
      />,
    );
  }
  return <g opacity={0.95}>{petals}</g>;
}

/** Wide abaya sleeve with printed cuff + hand. Drawn twice per side (see mascot.css for which layer shows). */
function Arm({ side, layer }: { side: "l" | "r"; layer: "back" | "front" }) {
  const l = side === "l";
  const sleeve = l
    ? "M45 93 Q 33 99 30 119 L 43 122 Q 45 108 50 99 Z"
    : "M75 93 Q 87 99 90 119 L 77 122 Q 75 108 70 99 Z";
  return (
    <g className={`m-arm-${side} m-layer-${layer}`} style={layer === "front" ? { display: "none" } : undefined}>
      <path d={sleeve} fill={ABAYA} {...S} />
      <g clipPath={`url(#m-clip-sleeve-${side})`}>
        <RosePrint seed={l ? 3 : 19} x0={l ? 26 : 74} x1={l ? 46 : 94} y0={108} y1={124} />
      </g>
      <path
        d={l ? "M30.5 116.5 L 43.3 119.3" : "M89.5 116.5 L 76.7 119.3"}
        stroke={TRIM}
        strokeWidth={1.4}
        strokeDasharray="0.1 2.3"
        strokeLinecap="round"
      />
      <path d={sleeve} fill="none" {...S} />
      <circle cx={l ? 36.5 : 83.5} cy={123.5} r={4.6} fill={SKIN} {...S} />
    </g>
  );
}

const PETAL_D = "M0 0 C 3 -5.5 9 -5.5 11 0 C 9 5.5 3 5.5 0 0 Z";
const PANEL_REST = {
  l: "M46 92 Q 38 96 37 110 L 34 147 Q 42 150 50 147 L 51 100 Z",
  r: "M74 92 Q 82 96 83 110 L 86 147 Q 78 150 70 147 L 69 100 Z",
};

/** Petals placed in cloth coordinates: s = along the panel (0 shoulder … 1 hem), u = across it (-1 inner … 1 outer). */
function clothPetals(seed: number) {
  let n = seed;
  const rand = () => ((n = (n * 9301 + 49297) % 233280) / 233280);
  return Array.from({ length: 14 }, () => ({
    s: 0.6 + rand() * 0.42,
    u: rand() * 2 - 1,
    r: Math.round(rand() * 360),
    c: ROSES[Math.floor(rand() * ROSES.length)],
    sc: (0.55 + rand() * 0.5).toFixed(2),
  }));
}
const PETALS = { l: clothPetals(7), r: clothPetals(31) };

/**
 * One open front panel of the abaya. Its outline, trim and rose print are rewritten every frame by the rig
 * (see rig.ts), which simulates it as cloth. Drawn twice: in front of the body normally, behind it when it
 * streams back like a cape.
 */
function Panel({ side, layer }: { side: "l" | "r"; layer: "back" | "front" }) {
  return (
    <g className={`m-panel-${side} m-layer-${layer}`} style={layer === "back" ? { display: "none" } : undefined}>
      <path className="m-cloth-fill" d={PANEL_REST[side]} fill={ABAYA} />
      <g clipPath={`url(#m-clip-abaya-${side})`}>
        {PETALS[side].map((p, i) => (
          <path
            key={i}
            className="m-petal"
            d={PETAL_D}
            fill={p.c}
            opacity={0.95}
            data-s={p.s}
            data-u={p.u}
            data-r={p.r}
            data-sc={p.sc}
            transform="scale(0)"
          />
        ))}
      </g>
      <path className="m-cloth-trim" fill="none" stroke={TRIM} strokeWidth={1.4} strokeDasharray="0.1 2.3" strokeLinecap="round" />
      <path className="m-cloth-line" d={PANEL_REST[side]} fill="none" {...S} />
    </g>
  );
}

function Eyes({ mood }: { mood: Mood }) {
  if (mood === "giggle") {
    return (
      <g fill="none" stroke={INK} strokeWidth={1.9} strokeLinecap="round">
        <path d="M48.5 58 Q 52 53.5 55.5 58" />
        <path d="M64.5 58 Q 68 53.5 71.5 58" />
      </g>
    );
  }
  if (mood === "dizzy") {
    const spiral = (cx: number) =>
      `M${cx} 57 m0 -0.8 a0.8 0.8 0 1 1 -0.8 0.8 a1.8 1.8 0 1 1 1.8 1.8 a2.8 2.8 0 1 1 -2.8 -2.8`;
    return (
      <g fill="none" stroke={INK} strokeWidth={1.2} strokeLinecap="round">
        <path d={spiral(52)} />
        <path d={spiral(68)} />
      </g>
    );
  }
  const big = mood === "wow";
  return (
    <g className="m-eyes">
      <ellipse cx={52} cy={57} rx={big ? 4.2 : 3.8} ry={big ? 5.4 : 4.8} fill={INK} />
      <ellipse cx={68} cy={57} rx={big ? 4.2 : 3.8} ry={big ? 5.4 : 4.8} fill={INK} />
      <circle cx={53.3} cy={55.1} r={1.35} fill="#fff" />
      <circle cx={69.3} cy={55.1} r={1.35} fill="#fff" />
      <circle cx={51} cy={59.2} r={0.6} fill="#fff" />
      <circle cx={67} cy={59.2} r={0.6} fill="#fff" />
    </g>
  );
}

function Mouth({ mood }: { mood: Mood }) {
  switch (mood) {
    case "talk":
      return <ellipse className="m-talk" cx={60} cy={68.3} rx={2.6} ry={2.4} fill={LIPS} stroke={INK} strokeWidth={0.9} />;
    case "grin":
    case "giggle":
      return (
        <g>
          <path d="M54.8 66.2 Q 60 74.5 65.2 66.2 Z" fill={LIPS} stroke={INK} strokeWidth={1.1} strokeLinejoin="round" />
          <path d="M57.5 70.6 Q 60 72 62.5 70.6" fill="none" stroke="#e07d93" strokeWidth={1.1} strokeLinecap="round" />
        </g>
      );
    case "angry":
      return <path d="M56 70.2 Q 60 66.4 64 70.2" fill="none" stroke={LIPS} strokeWidth={1.8} strokeLinecap="round" />;
    case "wow":
    case "dizzy":
      return <ellipse cx={60} cy={68.6} rx={2} ry={2.6} fill={LIPS} stroke={INK} strokeWidth={0.9} />;
    default:
      return <path d="M55.8 67 Q 60 71.2 64.2 67" fill="none" stroke={LIPS} strokeWidth={1.7} strokeLinecap="round" />;
  }
}

/**
 * Mini Zikra: chibi portrait in the site's outline style.
 * Outfit: fitted dusty-pink shimmer hijab (snug around the face, wrapped under the chin and around the neck,
 * one tail draped over the shoulder), pearl earrings, white bodysuit, black baggy jeans,
 * open white abaya with a rose print and rhinestone trim.
 * Part class names (m-leg-l, m-arm-r, ...) are animated from mascot.css.
 */
const MascotSvg = forwardRef<SVGGElement, { mood: Mood }>(function MascotSvg({ mood }, lookRef) {
  return (
    <svg viewBox="0 0 120 170" width="120" height="170" overflow="visible" aria-hidden focusable="false">
      <defs>
        <clipPath id="m-clip-abaya-l">
          <path className="m-clip-abaya-l" d={PANEL_REST.l} />
        </clipPath>
        <clipPath id="m-clip-abaya-r">
          <path className="m-clip-abaya-r" d={PANEL_REST.r} />
        </clipPath>
        <clipPath id="m-clip-sleeve-l">
          <path d="M45 93 Q 33 99 30 119 L 43 122 Q 45 108 50 99 Z" />
        </clipPath>
        <clipPath id="m-clip-sleeve-r">
          <path d="M75 93 Q 87 99 90 119 L 77 122 Q 75 108 70 99 Z" />
        </clipPath>
      </defs>

      {/* ground shadow */}
      <ellipse className="m-shadow" cx={60} cy={164} rx={24} ry={3.6} fill={INK} opacity={0.14} />

      {/* speed lines, only visible during the dash */}
      <g className="m-speed" stroke={INK} strokeWidth={2.2} strokeLinecap="round">
        <path d="M-4 78 H 16" />
        <path d="M-14 100 H 12" />
        <path d="M-6 122 H 14" />
        <path d="M-18 142 H 2" />
      </g>

      <g className="m-body">
        <g className="m-breathe">
        {/* cape: abaya panels streaming behind (dash only) */}
        <Panel side="l" layer="back" />
        <Panel side="r" layer="back" />

        {/* legs: black baggy jeans + shoes */}
        <g className="m-leg-l">
          <path d="M44 121 H58.5 L59.5 153 Q 50 155.5 39.5 153 Z" fill={JEANS} {...S} />
          <path d="M51.5 125 L 50 150" stroke={JEANS_SEAM} strokeWidth={1} fill="none" />
          <path d="M40 148.5 Q 50 150.5 59.3 148.5" stroke={JEANS_SEAM} strokeWidth={1} fill="none" />
          <ellipse cx={48.5} cy={157} rx={9.5} ry={4.2} fill={INK} />
          <path d="M40.5 158.6 Q 48.5 161 56.8 158.6" stroke="#fff" strokeWidth={1} fill="none" opacity={0.8} />
        </g>
        <g className="m-leg-r">
          <path d="M61.5 121 H76 L80.5 153 Q 70 155.5 60.5 153 Z" fill={JEANS} {...S} />
          <path d="M68.5 125 L 70 150" stroke={JEANS_SEAM} strokeWidth={1} fill="none" />
          <path d="M60.7 148.5 Q 70 150.5 80 148.5" stroke={JEANS_SEAM} strokeWidth={1} fill="none" />
          <ellipse cx={71.5} cy={157} rx={9.5} ry={4.2} fill={INK} />
          <path d="M63.2 158.6 Q 71.5 161 79.5 158.6" stroke="#fff" strokeWidth={1} fill="none" opacity={0.8} />
        </g>

        {/* torso: white bodysuit tucked into jeans */}
        <path d="M46 92 Q 60 88 74 92 L 76.5 122 H 43.5 Z" fill={BODYSUIT} {...S} />
        <rect x={43.5} y={116.5} width={33} height={8.5} rx={2} fill={JEANS} {...S} />
        <circle cx={60} cy={120.8} r={1.9} fill="#c9a15b" stroke={INK} strokeWidth={0.8} />

        {/* open abaya, hanging normally */}
        <Panel side="l" layer="front" />
        <Panel side="r" layer="front" />

        {/* arms (hanging): behind the hijab wrap */}
        <Arm side="l" layer="back" />
        <Arm side="r" layer="back" />

        <g className="m-head">
          <g className="m-head-sway">
          {/* neck: part of the head group so they tilt together; the hijab's opening outlines it */}
          <path d="M53 68 H 67 V 93 H 53 Z" fill={SKIN} />
          {/* soft shadow under the chin ties the face to the neck */}
          <ellipse cx={60} cy={78} rx={5.5} ry={3} fill={SKIN_SHADE} />

          {/* hijab: one soft shape around the head, resting on the shoulders, open under the chin */}
          <path
            d="M60 24.5 C 43.5 24.5 34.5 36.5 34.5 52 C 34.5 63 36.5 72 39.5 80 C 41.5 86 41.5 90.5 39.5 95.5 L 50.5 96.5 C 50.5 90 52.5 83 55.5 74 L 64.5 74 C 67.5 83 69.5 90 69.5 96.5 L 80.5 95.5 C 78.5 90.5 78.5 86 80.5 80 C 83.5 72 85.5 63 85.5 52 C 85.5 36.5 76.5 24.5 60 24.5 Z"
            fill={HIJAB}
            {...S}
          />
          {/* soft shading on one side + satin sheen on top */}
          <path d="M77 33 C 83.5 40 85 53 83.5 66 C 82.5 71 81 76 79 79.5 C 80.5 70 80.5 58 79.5 49 C 79 42 78.2 37 77 33 Z" fill={HIJAB_SHADE} />
          <path d="M43 36 Q 50 29 60 28.5" fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" opacity={0.6} />

          {/* face */}
          <ellipse cx={60} cy={56.5} rx={18} ry={20.5} fill={SKIN} {...S} />
          {/* fabric over the forehead, so the face opening reads as a hijab, not a hood */}
          <path
            d="M41.8 52.5 C 42 40.5 50 34.5 60 34.5 C 70 34.5 78 40.5 78.2 52.5 C 75.5 44.5 68.5 40.8 60 40.8 C 51.5 40.8 44.5 44.5 41.8 52.5 Z"
            fill={HIJAB}
            stroke={INK}
            strokeWidth={1.8}
            strokeLinejoin="round"
          />

          {/* sparkle */}
          <g fill="#fff" opacity={0.95}>
            <circle cx={70} cy={30} r={0.8} />
            <circle cx={38.5} cy={60} r={0.7} />
            <circle cx={82} cy={58} r={0.7} />
          </g>

          {/* pearl earrings */}
          <g>
            <circle cx={43.8} cy={66.5} r={2.2} fill="#f6eedd" stroke={INK} strokeWidth={1.1} />
            <circle cx={76.2} cy={66.5} r={2.2} fill="#f6eedd" stroke={INK} strokeWidth={1.1} />
            <circle cx={43.2} cy={65.8} r={0.65} fill="#fff" />
            <circle cx={75.6} cy={65.8} r={0.65} fill="#fff" />
          </g>

          {/* brows */}
          {mood === "angry" ? (
            <g fill="none" stroke={INK} strokeWidth={1.7} strokeLinecap="round">
              <path d="M48 47.6 L 55.6 50.6" />
              <path d="M72 47.6 L 64.4 50.6" />
            </g>
          ) : (
            <g fill="none" stroke={INK} strokeWidth={1.3} strokeLinecap="round">
              <path d="M48.3 49.4 Q 52 47.6 55.4 49" />
              <path d="M64.6 49 Q 68 47.6 71.7 49.4" />
            </g>
          )}

          {/* eyes follow the cursor via the forwarded ref */}
          <g ref={lookRef}>
            <Eyes mood={mood} />
          </g>
          {mood !== "giggle" && mood !== "dizzy" && (
            <g stroke={INK} strokeWidth={1.1} strokeLinecap="round">
              <path d="M48.3 54.2 l -2 -1.4" />
              <path d="M71.7 54.2 l 2 -1.4" />
            </g>
          )}

          {/* blush, nose, mouth */}
          <ellipse cx={47.5} cy={64} rx={3.4} ry={1.9} fill={mood === "angry" ? "#dd5f73" : "#e88fa0"} opacity={mood === "angry" ? 0.8 : 0.55} />
          <ellipse cx={72.5} cy={64} rx={3.4} ry={1.9} fill={mood === "angry" ? "#dd5f73" : "#e88fa0"} opacity={mood === "angry" ? 0.8 : 0.55} />
          {mood === "angry" && (
            // cartoon anger mark
            <g className="m-anger" fill="none" stroke="#d8434f" strokeWidth={2} strokeLinecap="round">
              <path d="M83 22 q 3 3 6 0" />
              <path d="M83 32 q 3 -3 6 0" />
              <path d="M81 24 q 3 3 0 6" />
              <path d="M91 24 q -3 3 0 6" />
            </g>
          )}
          <path d="M59 62.3 q 1 1 2 0" fill="none" stroke={INK} strokeWidth={0.9} strokeLinecap="round" opacity={0.55} />
          <Mouth mood={mood} />
          </g>
        </g>

        {/* drape: one end comes from her left side, sweeps loosely across the chest and falls over the other shoulder */}
        <g className="m-hijab-drape">
          {/* the loose end over the shoulder is simulated as cloth; the rig rewrites this outline every frame */}
          <path
            className="m-drape-fill"
            d="M81.5 69.5 C 80.5 77 70.5 80 58.5 80.5 C 48.5 81 41.5 86 38.5 95.5 C 36 101.5 35.5 110 37.5 117 L 41.5 123 C 43.5 117 45.5 110 48 104.5 C 51 98.5 57 95 64.5 94 C 75 93 83 88 85.5 79.5 C 86 76.5 84.5 73 81.5 69.5 Z"
            fill={HIJAB}
            {...S}
          />
          <path d="M80 77.5 C 73.5 84 64.5 86.5 55 87" fill="none" stroke={HIJAB_FOLD} strokeWidth={1.2} strokeLinecap="round" />
          <path d="M60 84 Q 68 83 74 79.5" fill="none" stroke="#fff" strokeWidth={1.6} strokeLinecap="round" opacity={0.55} />
        </g>

        {/* arms (raised, for wave/cheer): in front of the head */}
        <Arm side="l" layer="front" />
        <Arm side="r" layer="front" />
        </g>
      </g>
    </svg>
  );
});

export default MascotSvg;
