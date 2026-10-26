// The drawings: what each department DOES (FRONT, held in front of the belly), plus hats (HEAD),
// glasses (FACE), mane symbols (MARK) and scenery by the left foot (GROUND).
// FRONT is centered on (0,0), roughly 244 x 150. HEAD and FACE use absolute mascot coordinates.
import { K } from "./base";

const o = (w = 10) => `stroke="${K}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const T = (s: string, x: number, y: number, size: number, fill = "#fff", extra = "") =>
  `<text x="${x}" y="${y}" font-size="${size}" font-family="Georgia, 'Noto Serif KR', 'Malgun Gothic', serif" font-weight="bold" fill="${fill}" text-anchor="middle" ${extra}>${s}</text>`;
const bar = (x: number, y: number, w: number, c: string) => `<rect x="${x}" y="${y}" width="${w}" height="9" rx="4.5" fill="${c}"/>`;
const circle = (x: number, y: number, r: number, fill: string, w = 8) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" ${o(w)}/>`;

/** gear with teeth drawn as a thick dashed ring */
const gear = (cx: number, cy: number, r: number, fill: string, teeth = 10) => {
  const dash = (2 * Math.PI * r) / (teeth * 2);
  return `<circle cx="${cx}" cy="${cy}" r="${r + 4}" fill="none" stroke="${K}" stroke-width="${r * 0.42 + 8}" stroke-dasharray="${dash.toFixed(1)} ${dash.toFixed(1)}"/>
    <circle cx="${cx}" cy="${cy}" r="${r + 4}" fill="none" stroke="${fill}" stroke-width="${r * 0.42}" stroke-dasharray="${dash.toFixed(1)} ${dash.toFixed(1)}"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" ${o(8)}/><circle cx="${cx}" cy="${cy}" r="${r * 0.32}" fill="#fff" ${o(6)}/>`;
};
const star = (x: number, y: number, s: number, fill: string) =>
  `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -26 L7 -8 L26 -7 L11 5 L16 24 L0 13 L-16 24 L-11 5 L-26 -7 L-7 -8 Z" fill="${fill}" ${o(6 / s)}/>`;

// ============ FRONT: the work ============
export const FRONT = {
  // ---- the eight from the approved sketch
  laptopCode: `<rect x="-112" y="-82" width="224" height="126" rx="10" fill="#0f172a" ${o()}/>
    ${bar(-94, -64, 54, "#4ade80")}${bar(-82, -48, 92, "#60a5fa")}${bar(-82, -32, 50, "#f472b6")}${bar(-70, -16, 104, "#facc15")}${bar(-82, 0, 66, "#60a5fa")}${bar(-94, 16, 38, "#4ade80")}
    <rect x="-52" y="14" width="10" height="14" fill="#fff"/><path d="M-132 56 H132 L112 44 H-112 Z" fill="#cbd5e1" ${o(9)}/><path d="M-26 50 H26" stroke="#94a3b8" stroke-width="5" stroke-linecap="round"/>`,
  neuralNet: `<rect x="-122" y="56" width="244" height="20" rx="8" fill="#1e1b4b" ${o(8)}/>
    <rect x="-118" y="-80" width="236" height="132" rx="16" fill="rgba(34,211,238,.25)" stroke="#22d3ee" stroke-width="8"/>
    <g stroke="#67e8f9" stroke-width="3.5" fill="none"><path d="M-70 -38 L0 -52 M-70 -38 L0 -16 M-70 -38 L0 16 M-70 -38 L0 48 M-70 0 L0 -52 M-70 0 L0 -16 M-70 0 L0 16 M-70 0 L0 48 M-70 38 L0 -52 M-70 38 L0 -16 M-70 38 L0 16 M-70 38 L0 48 M0 -52 L70 -20 M0 -16 L70 -20 M0 16 L70 -20 M0 48 L70 -20 M0 -52 L70 20 M0 -16 L70 20 M0 16 L70 20 M0 48 L70 20"/></g>
    <g fill="#fff" stroke="#0891b2" stroke-width="5"><circle cx="-70" cy="-38" r="9"/><circle cx="-70" cy="0" r="9"/><circle cx="-70" cy="38" r="9"/><circle cx="0" cy="-52" r="9"/><circle cx="0" cy="-16" r="9"/><circle cx="0" cy="16" r="9"/><circle cx="0" cy="48" r="9"/><circle cx="70" cy="-20" r="9"/><circle cx="70" cy="20" r="9"/></g>`,
  designCanvas: `<rect x="-104" y="-80" width="208" height="150" rx="6" fill="#fff" stroke="#8b5a2b" stroke-width="13"/>
    <circle cx="-36" cy="-22" r="34" fill="#fa5252"/><path d="M12 36 L52 -34 L92 36 Z" fill="#339af0"/><rect x="-74" y="22" width="52" height="34" rx="4" fill="#fcc419"/>
    <path d="M-80 -58 Q-30 -76 20 -56 T90 -58" fill="none" stroke="#51cf66" stroke-width="9" stroke-linecap="round"/>`,
  stopwatch: `<rect x="-14" y="-84" width="28" height="16" rx="4" fill="#e03131" ${o(7)}/><circle cx="0" cy="4" r="70" fill="#fff" ${o()}/>
    <g stroke="#111" stroke-width="5" stroke-linecap="round"><path d="M0 -58 V-46 M0 58 V46 M-58 4 H-46 M58 4 H46"/></g>
    <path d="M-54 10 H-24 L-14 -22 L2 40 L14 -8 H54" fill="none" stroke="#e03131" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M0 4 L0 -30" stroke="#111" stroke-width="6" stroke-linecap="round"/><circle cx="0" cy="4" r="6" fill="#111"/>`,
  equationBoard: `<rect x="-142" y="-78" width="284" height="148" rx="8" fill="#1f5a45" stroke="#8b5a2b" stroke-width="14"/>
    ${T("∫ x² dx = x³/3", 0, -30, 31)}${T("sin²θ + cos²θ = 1", 0, 6, 21)}<path d="M-110 54 H110 M-110 54 V22" stroke="#fff" stroke-width="3.5" opacity=".8"/>
    <path d="M-108 40 q22 -34 44 0 t44 0 t44 0 t44 0" fill="none" stroke="#ffd43b" stroke-width="5" stroke-linecap="round"/>`,
  circuitBoard: `<rect x="-122" y="-72" width="244" height="132" rx="10" fill="#2f9e44" ${o()}/>
    <g fill="none" stroke="#ffd43b" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M-100 -40 H-60 V-10 H-30 M-100 20 H-70 V50 H-20 M100 -40 H60 V-10 H30 M100 30 H70 V50 H20 M-30 -20 H-60"/></g>
    <rect x="-30" y="-34" width="60" height="50" rx="4" fill="#212529" ${o(6)}/><g stroke="#adb5bd" stroke-width="4"><path d="M-18 -34 v-9 M0 -34 v-9 M18 -34 v-9 M-18 16 v9 M0 16 v9 M18 16 v9"/></g>
    <circle cx="82" cy="-34" r="26" fill="rgba(255,212,59,.4)"/><circle cx="82" cy="-34" r="12" fill="#ffd43b" ${o(6)}/>
    <rect x="-108" y="34" width="62" height="16" rx="8" fill="#e8c07a" ${o(6)}/><path d="M-90 34 v16 M-76 34 v16 M-62 34 v16" stroke="#e03131" stroke-width="4"/>`,
  reactionFlask: `<path d="M-24 -84 H24 V-40 L76 52 Q86 74 64 74 H-64 Q-86 74 -76 52 L-24 -40 Z" fill="#e7f5ff" ${o()}/>
    <path d="M-56 14 Q-28 0 0 14 T56 14 L76 52 Q86 74 64 74 H-64 Q-86 74 -76 52 Z" fill="#51cf66"/>
    <path d="M-24 -84 H24 V-40 L76 52 Q86 74 64 74 H-64 Q-86 74 -76 52 L-24 -40 Z" fill="none" ${o()}/>
    <g fill="#d8f5a2" ${o(5)}><circle cx="-20" cy="34" r="8"/><circle cx="14" cy="46" r="10"/><circle cx="30" cy="26" r="6"/><circle cx="-4" cy="2" r="6"/></g>
    <path d="M0 -92 q-14 -16 0 -30 q14 -14 0 -30" fill="none" stroke="#b2f2bb" stroke-width="9" stroke-linecap="round" opacity=".9"/>`,
  buildingModel: `<rect x="-134" y="46" width="268" height="26" rx="6" fill="#a67c52" ${o(9)}/><rect x="-88" y="-76" width="70" height="124" fill="#adb5bd" ${o(9)}/>
    <g fill="#ffe066"><rect x="-76" y="-60" width="16" height="16"/><rect x="-48" y="-60" width="16" height="16"/><rect x="-76" y="-34" width="16" height="16"/><rect x="-48" y="-34" width="16" height="16"/><rect x="-76" y="-8" width="16" height="16"/><rect x="-48" y="-8" width="16" height="16"/></g>
    <rect x="-18" y="-30" width="80" height="78" fill="#f1deb5" ${o(9)}/><path d="M-28 -30 L22 -74 L72 -30 Z" fill="#e03131" ${o(9)}/>
    <rect x="12" y="12" width="20" height="36" fill="#8b5a2b"/><rect x="-6" y="-14" width="16" height="16" fill="#74c0fc"/><rect x="38" y="-14" width="16" height="16" fill="#74c0fc"/>
    <g ${o(7)}><circle cx="100" cy="30" r="20" fill="#51cf66"/><circle cx="-112" cy="34" r="14" fill="#51cf66"/></g>`,

  // ---- 공과대학
  gears: `${gear(-36, 6, 52, "#adb5bd")}${gear(54, -30, 32, "#fab005", 8)}<rect x="-122" y="60" width="244" height="14" rx="6" fill="#495057" ${o(8)}/><path d="M92 8 H116 V58" fill="none" stroke="#868e96" stroke-width="12" stroke-linecap="round"/>`,
  robotArm: `<rect x="-60" y="48" width="120" height="26" rx="8" fill="#495057" ${o(8)}/>
    <line x1="0" y1="46" x2="-34" y2="-8" stroke="${K}" stroke-width="34" stroke-linecap="round"/><line x1="0" y1="46" x2="-34" y2="-8" stroke="#ff922b" stroke-width="18" stroke-linecap="round"/>
    <line x1="-34" y1="-8" x2="46" y2="-40" stroke="${K}" stroke-width="30" stroke-linecap="round"/><line x1="-34" y1="-8" x2="46" y2="-40" stroke="#ffd8a8" stroke-width="15" stroke-linecap="round"/>
    ${circle(0, 46, 15, "#adb5bd")}${circle(-34, -8, 15, "#adb5bd")}${circle(46, -40, 13, "#adb5bd")}
    <path d="M58 -50 L88 -62 M58 -30 L88 -16" stroke="${K}" stroke-width="10" stroke-linecap="round"/><g fill="#22d3ee"><circle cx="-34" cy="-8" r="5"/></g>`,
  airplane: `<path d="M-100 12 Q-60 -22 40 -18 L100 -2 Q70 24 -40 28 Z" fill="#fff" ${o()}/><path d="M-20 -14 L-60 -70 L-30 -70 L30 -14 Z" fill="#74c0fc" ${o(8)}/><path d="M-20 24 L-62 70 L-34 70 L28 22 Z" fill="#74c0fc" ${o(8)}/>
    <path d="M-100 12 L-118 -22 L-92 -16 L-76 4 Z" fill="#e03131" ${o(8)}/><g fill="#339af0"><rect x="-4" y="-12" width="12" height="10" rx="3"/><rect x="18" y="-10" width="12" height="10" rx="3"/><rect x="40" y="-8" width="12" height="10" rx="3"/></g>
    <path d="M-120 56 q18 -18 40 0 t40 0" fill="none" stroke="#e7f5ff" stroke-width="12" stroke-linecap="round"/>`,
  bizChart: `<rect x="-86" y="-82" width="172" height="156" rx="10" fill="#f8f9fa" stroke="#8b5a2b" stroke-width="11"/><rect x="-30" y="-94" width="60" height="22" rx="8" fill="#868e96" ${o(7)}/>
    <g stroke="${K}" stroke-width="5"><rect x="-62" y="10" width="24" height="46" fill="#74c0fc"/><rect x="-26" y="-12" width="24" height="68" fill="#4dabf7"/><rect x="10" y="-34" width="24" height="90" fill="#339af0"/><rect x="46" y="-52" width="24" height="108" fill="#1c7ed6"/></g>
    <path d="M-66 -10 L-24 -34 L12 -52 L56 -72" fill="none" stroke="#e03131" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><path d="M56 -72 L40 -72 M56 -72 L56 -56" stroke="#e03131" stroke-width="7" stroke-linecap="round"/>`,
  atomModel: `<g fill="none" stroke="#339af0" stroke-width="7"><ellipse cx="0" cy="0" rx="86" ry="30"/><ellipse cx="0" cy="0" rx="86" ry="30" transform="rotate(60)"/><ellipse cx="0" cy="0" rx="86" ry="30" transform="rotate(120)"/></g>
    ${circle(0, 0, 20, "#fa5252")}${circle(-14, -26, 7, "#fff", 5)}<g fill="#ffd43b" ${o(5)}><circle cx="82" cy="0" r="11"/><circle cx="-41" cy="-70" r="11"/><circle cx="-41" cy="70" r="11"/></g>`,
  crystal: `<g stroke="#495057" stroke-width="7" stroke-linecap="round"><path d="M-70 -34 H0 H70 M-70 28 H0 H70 M-70 -34 V28 M0 -34 V28 M70 -34 V28 M-40 -64 H30 H100 M-40 -2 H30 H100 M-40 -64 V-2 M30 -64 V-2 M100 -64 V-2 M-70 -34 L-40 -64 M0 -34 L30 -64 M70 -34 L100 -64 M-70 28 L-40 -2 M0 28 L30 -2 M70 28 L100 -2"/></g>
    <g ${o(6)}><circle cx="-70" cy="-34" r="14" fill="#4dabf7"/><circle cx="0" cy="-34" r="14" fill="#ced4da"/><circle cx="70" cy="-34" r="14" fill="#4dabf7"/><circle cx="-70" cy="28" r="14" fill="#ced4da"/><circle cx="0" cy="28" r="14" fill="#4dabf7"/><circle cx="70" cy="28" r="14" fill="#ced4da"/><circle cx="-40" cy="-64" r="12" fill="#ced4da"/><circle cx="30" cy="-64" r="12" fill="#4dabf7"/><circle cx="100" cy="-64" r="12" fill="#ced4da"/><circle cx="-40" cy="-2" r="12" fill="#4dabf7"/><circle cx="30" cy="-2" r="12" fill="#ced4da"/><circle cx="100" cy="-2" r="12" fill="#4dabf7"/></g>`,
  bridge: `<rect x="-130" y="50" width="260" height="24" rx="6" fill="#4dabf7" ${o(8)}/><rect x="-124" y="14" width="248" height="14" fill="#868e96" ${o(7)}/>
    <rect x="-70" y="-70" width="16" height="86" fill="#e03131" ${o(7)}/><rect x="54" y="-70" width="16" height="86" fill="#e03131" ${o(7)}/>
    <path d="M-124 14 Q-96 -30 -62 -66 Q0 -6 62 -66 Q96 -30 124 14" fill="none" stroke="#212529" stroke-width="6"/><g stroke="#212529" stroke-width="4"><path d="M-100 14 V-6 M-82 14 V-24 M-30 14 V-34 M-12 14 V-22 M12 14 V-22 M30 14 V-34 M82 14 V-24 M100 14 V-6"/></g>`,
  steelFrame: `<g stroke="#495057" stroke-width="12" stroke-linecap="square"><path d="M-80 70 V-20 M0 70 V-20 M80 70 V-20 M-80 22 H80 M-80 -20 H80"/></g><g stroke="#fab005" stroke-width="5"><path d="M-80 22 L0 -20 L80 22 M-80 70 L0 22 L80 70"/></g>
    <path d="M60 -20 V-86 M60 -86 H-40 M-26 -86 V-52" fill="none" stroke="#e03131" stroke-width="9" stroke-linecap="round"/><rect x="-40" y="-52" width="28" height="18" fill="#fab005" ${o(5)}/>`,
  earthLeaf: `<circle cx="-14" cy="0" r="68" fill="#4dabf7" ${o()}/><g fill="#51cf66" ${o(5)}><path d="M-44 -38 Q-20 -58 0 -36 Q-6 -10 -30 -12 Z"/><path d="M-6 16 Q24 6 40 30 Q30 56 4 52 Z"/><path d="M-62 14 Q-46 6 -40 22 Q-48 36 -62 30 Z"/></g>
    <path d="M62 -50 Q108 -62 108 -14 Q62 -6 62 -50 Z" fill="#2f9e44" ${o(8)}/><path d="M66 -44 Q88 -34 104 -20" stroke="#d8f5a2" stroke-width="5" fill="none" stroke-linecap="round"/>`,
  wafer: `<circle cx="0" cy="0" r="72" fill="#ced4da" ${o()}/>${Array.from({ length: 81 }, (_, i) => {
      const gx = (i % 9) - 4, gy = Math.floor(i / 9) - 4, x = gx * 14 - 6, y = gy * 14 - 6;
      return Math.hypot(x + 6, y + 6) < 58 ? `<rect x="${x}" y="${y}" width="12" height="12" fill="${(gx + gy) % 2 ? "#4dabf7" : "#a5d8ff"}"/>` : "";
    }).join("")}<path d="M-30 -58 Q0 -72 30 -58" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".8"/>`,
  heartSteth: `<path d="M0 62 C-90 0 -74 -70 -24 -62 C-6 -58 0 -42 0 -42 C0 -42 6 -58 24 -62 C74 -70 90 0 0 62 Z" fill="#fa5252" ${o()}/>
    <path d="M-70 4 H-34 L-20 -26 L-2 38 L14 -14 H70" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M-96 -60 Q-110 30 -60 56" fill="none" stroke="#343a40" stroke-width="7" stroke-linecap="round"/><circle cx="-60" cy="58" r="12" fill="#adb5bd" ${o(6)}/>`,

  // ---- 응용과학 / 생명과학
  physicsLab: `<g fill="none" stroke="#339af0" stroke-width="7"><ellipse rx="86" ry="30"/><ellipse rx="86" ry="30" transform="rotate(60)"/><ellipse rx="86" ry="30" transform="rotate(120)"/></g>${circle(0, 0, 18, "#ffd43b")}
    <g fill="#fa5252" ${o(5)}><circle cx="82" cy="0" r="10"/><circle cx="-41" cy="-70" r="10"/><circle cx="-41" cy="70" r="10"/></g>`,
  telescope: `<g transform="rotate(-24)"><rect x="-90" y="-26" width="150" height="46" rx="8" fill="#e9ecef" ${o(9)}/><rect x="50" y="-34" width="52" height="62" rx="8" fill="#4263eb" ${o(9)}/><rect x="-104" y="-18" width="20" height="30" rx="5" fill="#868e96" ${o(7)}/></g>
    <path d="M-20 30 L-44 76 M-20 30 L4 76 M-20 30 L-20 76" stroke="#495057" stroke-width="9" stroke-linecap="round"/><circle cx="84" cy="-48" r="22" fill="#ffd8a8" ${o(7)}/><ellipse cx="84" cy="-48" rx="38" ry="9" fill="none" stroke="#f08c00" stroke-width="6"/>
    <g fill="#ffd43b"><circle cx="-96" cy="-52" r="4"/><circle cx="10" cy="-70" r="4"/><circle cx="-60" cy="-70" r="3"/></g>`,
  sprout: `<path d="M-46 8 H46 L34 72 H-34 Z" fill="#d9480f" ${o(9)}/><rect x="-54" y="-4" width="108" height="18" rx="6" fill="#e8590c" ${o(8)}/>
    <path d="M0 0 V-50" stroke="#2f9e44" stroke-width="9" stroke-linecap="round"/><path d="M0 -26 Q-50 -34 -54 -72 Q-6 -66 0 -26 Z" fill="#69db7c" ${o(7)}/><path d="M0 -42 Q46 -48 52 -86 Q4 -82 0 -42 Z" fill="#51cf66" ${o(7)}/>
    <g stroke="#22d3ee" stroke-width="7" fill="none" stroke-linecap="round"><path d="M72 -14 q14 -12 28 0 M62 -28 q24 -22 48 0"/></g><circle cx="86" cy="-2" r="6" fill="#22d3ee"/>
    <path d="M-86 -30 q-8 14 0 22 q8 -8 0 -22 Z" fill="#74c0fc" ${o(5)}/>`,
  flowerPot: `<path d="M-44 14 H44 L32 74 H-32 Z" fill="#e8590c" ${o(9)}/><g stroke="#2f9e44" stroke-width="8" stroke-linecap="round"><path d="M-30 14 V-34 M0 14 V-62 M30 14 V-26"/></g>
    ${[[-30, -40, "#fa5252"], [0, -70, "#fcc419"], [30, -32, "#f783ac"]].map(([x, y, c]) => `<g ${o(5)}>${[0, 72, 144, 216, 288].map((a) => `<circle cx="${(x as number) + 14 * Math.cos((a * Math.PI) / 180)}" cy="${(y as number) + 14 * Math.sin((a * Math.PI) / 180)}" r="9" fill="${c}"/>`).join("")}<circle cx="${x}" cy="${y}" r="8" fill="#ffd43b"/></g>`).join("")}`,
  bakeFood: `<path d="M-80 30 Q-90 -30 -30 -40 Q30 -50 70 -30 Q96 -10 80 30 Q70 56 0 56 Q-70 56 -80 30 Z" fill="#e8b36a" ${o()}/><path d="M-30 -30 L-20 -2 M10 -34 L22 -4 M44 -24 L52 2" stroke="#b9822b" stroke-width="7" stroke-linecap="round"/>
    <path d="M70 -20 V-84 M70 -84 q-14 -4 -16 -16 M70 -62 q16 -2 22 -14 M70 -44 q-14 0 -20 -12" stroke="#c9a227" stroke-width="6" fill="none" stroke-linecap="round"/>`,
  dnaHelix: `${Array.from({ length: 9 }, (_, i) => { const x = -88 + i * 22, y1 = Math.sin(i * 0.9) * 38, y2 = -y1; return `<path d="M${x} ${y1} L${x} ${y2}" stroke="#ced4da" stroke-width="6"/>`; }).join("")}
    <path d="${Array.from({ length: 41 }, (_, i) => `${i ? "L" : "M"}${-88 + i * 4.4} ${Math.sin(i * 0.2) * 38}`).join(" ")}" fill="none" stroke="#e03131" stroke-width="10" stroke-linecap="round"/>
    <path d="${Array.from({ length: 41 }, (_, i) => `${i ? "L" : "M"}${-88 + i * 4.4} ${-Math.sin(i * 0.2) * 38}`).join(" ")}" fill="none" stroke="#1c7ed6" stroke-width="10" stroke-linecap="round"/>`,
  herbMortar: `<path d="M-70 -4 H70 Q70 60 0 66 Q-70 60 -70 -4 Z" fill="#a67c52" ${o()}/><rect x="-36" y="62" width="72" height="14" rx="5" fill="#8b5a2b" ${o(8)}/>
    <line x1="22" y1="-4" x2="70" y2="-76" stroke="${K}" stroke-width="26" stroke-linecap="round"/><line x1="22" y1="-4" x2="70" y2="-76" stroke="#e8c07a" stroke-width="12" stroke-linecap="round"/>
    <g ${o(6)}><path d="M-40 -6 Q-62 -42 -30 -52 Q-18 -26 -40 -6 Z" fill="#69db7c"/><path d="M-6 -6 Q-8 -50 24 -50 Q22 -18 -6 -6 Z" fill="#51cf66"/><path d="M-54 -2 Q-80 -26 -50 -50" fill="none"/></g>
    <path d="M-100 20 q8 -26 20 -6 q8 18 -2 36 q-14 -8 -18 -30 Z" fill="#e8c07a" ${o(6)}/>`,

  // ---- 국제 / 외국어 / 예술·디자인 / 체육
  passportGlobe: `<circle cx="-30" cy="0" r="62" fill="#4dabf7" ${o()}/><g fill="none" stroke="#e7f5ff" stroke-width="4"><ellipse cx="-30" cy="0" rx="26" ry="62"/><path d="M-92 0 H32 M-84 -30 H24 M-84 30 H24"/></g>
    <g fill="#51cf66" ${o(5)}><path d="M-60 -30 Q-40 -46 -26 -26 Q-34 -6 -56 -12 Z"/><path d="M-14 8 Q10 0 22 20 Q10 40 -8 34 Z"/></g>
    <rect x="42" y="-62" width="80" height="116" rx="8" fill="#1e3a8a" ${o(8)}/><circle cx="82" cy="-14" r="22" fill="none" stroke="#ffd43b" stroke-width="6"/>${star(82, -14, 0.5, "#ffd43b")}<path d="M56 30 H108" stroke="#ffd43b" stroke-width="6" stroke-linecap="round"/>`,
  asiaMap: `<rect x="-116" y="-76" width="232" height="146" rx="8" fill="#f1deb5" ${o(9)}/><path d="M-80 -20 Q-70 -56 -30 -52 Q0 -66 36 -46 Q80 -50 84 -10 Q70 24 40 20 Q30 50 -4 40 Q-30 36 -50 18 Q-84 14 -80 -20 Z" fill="#8ce99a" ${o(6)}/>
    <path d="M-60 6 Q-20 -20 20 -4 T70 -14" fill="none" stroke="#e03131" stroke-width="5" stroke-dasharray="9 9" stroke-linecap="round"/><path d="M60 -38 q10 -22 20 0 q-10 14 -20 0 Z" fill="#e03131" ${o(5)}/><circle cx="70" cy="-40" r="4" fill="#fff"/>`,
  productSketch: `<rect x="-118" y="-78" width="236" height="150" rx="6" fill="#f8f9fa" ${o(9)}/><g stroke="#adb5bd" stroke-width="3" stroke-dasharray="6 6"><path d="M-100 52 H100 M-100 -60 V52"/></g>
    <g ${o(7)}><rect x="-48" y="-12" width="96" height="22" rx="6" fill="#ff922b"/><path d="M-40 -12 L-40 -58 Q-40 -66 -32 -66 H32 Q40 -66 40 -58 V-12" fill="#ffd8a8"/><path d="M-36 10 L-44 54 M36 10 L44 54" fill="none"/></g>
    <path d="M-100 -52 V-70 M-100 -61 H-86 M100 52 H82" stroke="#e03131" stroke-width="4"/><g transform="rotate(-30 80 -30)"><rect x="60" y="-36" width="70" height="12" rx="3" fill="#fcc419" ${o(5)}/><path d="M130 -36 L146 -30 L130 -24 Z" fill="#ffd8a8" ${o(4)}/></g>`,
  gardenPlan: `<rect x="-118" y="-76" width="236" height="146" rx="8" fill="#b2f2bb" ${o(9)}/><ellipse cx="42" cy="22" rx="44" ry="26" fill="#74c0fc" ${o(6)}/>
    <path d="M-110 56 Q-40 24 -20 -14 T40 -70" fill="none" stroke="#f1deb5" stroke-width="16" stroke-linecap="round"/>
    <g ${o(6)}><circle cx="-76" cy="-30" r="22" fill="#2f9e44"/><circle cx="-60" cy="30" r="16" fill="#37b24d"/><circle cx="84" cy="-34" r="22" fill="#2f9e44"/><circle cx="14" cy="-34" r="14" fill="#f783ac"/><circle cx="-26" cy="44" r="12" fill="#fcc419"/></g>`,
  dressForm: `<path d="M-30 -80 L-14 -60 L0 -52 L14 -60 L30 -80 L48 -62 L36 -26 L58 70 H-58 L-36 -26 L-48 -62 Z" fill="#f783ac" ${o()}/><path d="M-36 -22 H36" stroke="#c2255c" stroke-width="9"/><path d="M-4 -52 V-84" stroke="${K}" stroke-width="8" stroke-linecap="round"/>
    <path d="M62 -60 Q112 -20 66 40" fill="none" stroke="${K}" stroke-width="22" stroke-linecap="round"/><path d="M62 -60 Q112 -20 66 40" fill="none" stroke="#ffe066" stroke-width="12" stroke-linecap="round"/>
    <g stroke="${K}" stroke-width="3"><path d="M82 -50 l8 -4 M96 -30 l10 0 M96 -8 l10 3 M88 14 l8 5"/></g>`,
  penTablet: `<rect x="-120" y="-78" width="240" height="146" rx="14" fill="#212529" ${o(9)}/><rect x="-106" y="-64" width="212" height="118" rx="8" fill="#e5dbff"/>
    <g ${o(5)}><circle cx="-60" cy="-14" r="26" fill="#ffd8a8"/><circle cx="-69" cy="-20" r="4" fill="${K}"/><circle cx="-51" cy="-20" r="4" fill="${K}"/><path d="M-70 -4 Q-60 6 -50 -4" fill="none"/><circle cx="14" cy="-16" r="26" fill="#ffd8a8"/><circle cx="5" cy="-22" r="4" fill="${K}"/><circle cx="23" cy="-22" r="4" fill="${K}"/><circle cx="14" cy="-2" r="6" fill="#fa5252"/></g>
    <path d="M52 -40 L90 -14 L52 12 Z" fill="#7048e8" ${o(6)}/><g transform="rotate(35 100 40)"><rect x="90" y="20" width="62" height="10" rx="3" fill="#fff" ${o(5)}/></g>`,
  pottery: `<ellipse cx="0" cy="58" rx="100" ry="20" fill="#868e96" ${o(8)}/><rect x="-14" y="62" width="28" height="20" fill="#495057"/>
    <path d="M-34 -70 H34 Q30 -48 52 -22 Q70 6 40 42 Q0 60 -40 42 Q-70 6 -52 -22 Q-30 -48 -34 -70 Z" fill="#d9822b" ${o()}/><path d="M-30 -58 H30 M-26 -36 Q0 -28 26 -36" stroke="#f4b183" stroke-width="7" fill="none" stroke-linecap="round"/>
    <path d="M-44 -10 Q-34 20 -26 40" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round" opacity=".6"/><g fill="#74c0fc" ${o(4)}><path d="M72 -44 q8 14 0 22 q-8 -8 0 -22 Z"/><path d="M92 -20 q6 10 0 16 q-6 -6 0 -16 Z"/></g>`,
  clapperboard: `<rect x="-100" y="-26" width="200" height="98" rx="6" fill="#212529" ${o(9)}/><g transform="rotate(-10 -100 -26)"><rect x="-100" y="-62" width="200" height="34" rx="5" fill="#fff" ${o(9)}/>
      ${Array.from({ length: 6 }, (_, i) => `<path d="M${-86 + i * 34} -60 L${-70 + i * 34} -30 H${-84 + i * 34} L${-100 + i * 34} -60 Z" fill="#212529"/>`).join("")}</g>
    ${T("SCENE 1", -40, 12, 20, "#fff")}<path d="M-82 30 H82 M-82 52 H40" stroke="#adb5bd" stroke-width="5" stroke-linecap="round"/><g ${o(6)}><path d="M70 -4 Q60 -34 88 -44 Q116 -34 106 -4 Q88 14 70 -4 Z" fill="#ffd43b"/></g>`,
  guitar: `<g transform="rotate(-28)"><rect x="-4" y="-124" width="22" height="130" rx="6" fill="#8b5a2b" ${o(7)}/><rect x="-10" y="-146" width="34" height="30" rx="6" fill="#343a40" ${o(7)}/>
      <path d="M7 6 Q-54 -4 -48 40 Q-72 56 -46 80 Q-44 112 7 112 Q58 112 60 80 Q84 56 58 40 Q64 -4 7 6 Z" fill="#e03131" ${o()}/><circle cx="7" cy="54" r="14" fill="#212529"/><path d="M7 -118 V50" stroke="#e9ecef" stroke-width="3"/></g>
    <g fill="${K}"><circle cx="-94" cy="-40" r="9"/><rect x="-87" y="-74" width="6" height="36"/><path d="M-87 -74 q22 4 22 22" fill="none" stroke="${K}" stroke-width="6"/></g>`,
  firstAid: `<rect x="-90" y="-50" width="180" height="116" rx="16" fill="#fff" ${o()}/><path d="M-30 -50 V-74 H30 V-50" fill="none" stroke="${K}" stroke-width="10" stroke-linejoin="round"/><path d="M-14 -18 H14 V4 H36 V28 H14 V50 H-14 V28 H-36 V4 H-14 Z" fill="#e03131" ${o(7)}/>
    <path d="M-80 70 q20 -14 40 0" stroke="#fa5252" stroke-width="5" fill="none"/>`,
  golf: `<ellipse cx="0" cy="66" rx="110" ry="18" fill="#51cf66" ${o(8)}/><path d="M-4 66 V24" stroke="#ffe066" stroke-width="9" stroke-linecap="round"/><circle cx="-4" cy="2" r="30" fill="#fff" ${o(8)}/>
    <g fill="#ced4da"><circle cx="-14" cy="-6" r="3"/><circle cx="2" cy="-12" r="3"/><circle cx="6" cy="4" r="3"/><circle cx="-10" cy="12" r="3"/></g><path d="M64 -70 L100 64" stroke="${K}" stroke-width="12" stroke-linecap="round"/><path d="M64 -70 L100 64" stroke="#adb5bd" stroke-width="5" stroke-linecap="round"/><path d="M96 64 H132 Q136 74 124 76 H96 Z" fill="#868e96" ${o(6)}/>
    <path d="M70 -86 q22 -10 30 8" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/>`,
  tacticBoard: `<rect x="-120" y="-76" width="240" height="140" rx="10" fill="#37b24d" ${o(9)}/><g stroke="#fff" stroke-width="4" fill="none"><rect x="-104" y="-62" width="208" height="112"/><path d="M0 -62 V50"/><circle cx="0" cy="-6" r="20"/></g>
    <g stroke="#e03131" stroke-width="7" stroke-linecap="round"><path d="M-70 -34 l16 16 M-54 -34 l-16 16 M60 12 l16 16 M76 12 l-16 16"/></g><g fill="#fff" ${o(5)}><circle cx="-32" cy="22" r="11"/><circle cx="38" cy="-30" r="11"/></g>
    <path d="M-60 -22 Q-20 -40 24 -26" fill="none" stroke="#ffd43b" stroke-width="5" stroke-dasharray="8 8" stroke-linecap="round"/>`,
  boardBreak: `<g ${o(8)}><rect x="-70" y="-36" width="140" height="22" rx="3" fill="#f1deb5"/><rect x="-70" y="-12" width="140" height="22" rx="3" fill="#f1deb5"/><rect x="-70" y="12" width="140" height="22" rx="3" fill="#f1deb5"/></g>
    <path d="M-10 -36 L4 -22 L-8 -12 L6 2 L-4 14" fill="none" stroke="#e03131" stroke-width="7" stroke-linejoin="round"/><path d="M-110 -70 Q-90 -20 -60 -4" fill="none" stroke="#adb5bd" stroke-width="9" stroke-linecap="round" opacity=".7"/>
    <rect x="-118" y="50" width="236" height="22" rx="6" fill="#111" ${o(6)}/><path d="M-8 50 L-22 76 M8 50 L22 76" stroke="#111" stroke-width="8" stroke-linecap="round"/>`,

  // ---- 융합전공 (each is its own look)
  globalEngineering: `<circle cx="-30" cy="-4" r="60" fill="#4dabf7" ${o()}/><g fill="none" stroke="#e7f5ff" stroke-width="4"><ellipse cx="-30" cy="-4" rx="24" ry="60"/><path d="M-90 -4 H30"/></g><g fill="#51cf66" ${o(5)}><path d="M-58 -34 Q-38 -48 -24 -30 Q-32 -8 -54 -14 Z"/></g>${gear(52, 24, 44, "#fab005", 9)}`,
  cultureTech: `<circle cx="-56" cy="-8" r="50" fill="#4dabf7" ${o()}/><g fill="none" stroke="#e7f5ff" stroke-width="4"><ellipse cx="-56" cy="-8" rx="20" ry="50"/><path d="M-106 -8 H-6"/></g>
    <path d="M20 14 Q4 -26 40 -36 H98 Q132 -26 120 14 Q112 40 90 30 L78 14 H56 L44 30 Q28 40 20 14 Z" fill="#7048e8" ${o(8)}/><g fill="#fff"><rect x="40" y="-14" width="22" height="8" rx="3"/><rect x="47" y="-21" width="8" height="22" rx="3"/><circle cx="96" cy="-14" r="6"/><circle cx="108" cy="0" r="6"/></g>
    <path d="M-20 -78 V-52 M-20 -78 q18 -2 18 12" stroke="${K}" stroke-width="7" fill="none" stroke-linecap="round"/><circle cx="-26" cy="-50" r="9" fill="${K}"/>`,
  fourDArt: `<g ${o(8)}><rect x="-62" y="-60" width="90" height="90" fill="#a5d8ff55" stroke="#339af0"/><rect x="-26" y="-24" width="90" height="90" fill="#ffa8a855" stroke="#f03e3e"/></g>
    <g stroke="#7048e8" stroke-width="7"><path d="M-62 -60 L-26 -24 M28 -60 L64 -24 M-62 30 L-26 66 M28 30 L64 66"/></g><g fill="#ffd43b" ${o(5)}><circle cx="-62" cy="-60" r="8"/><circle cx="64" cy="66" r="8"/></g>
    <g fill="none" stroke="#51cf66" stroke-width="8" stroke-linecap="round"><path d="M80 -70 q20 -12 28 8 t-14 30"/></g>`,
  artTech: `<rect x="-112" y="-76" width="224" height="146" rx="14" fill="#1b0f3b" ${o(9)}/><path d="M-90 -40 H-40 V0 H20 V40 H80" fill="none" stroke="#22d3ee" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="40" cy="-30" r="30" fill="#f06595"/><circle cx="62" cy="-16" r="16" fill="#ffd43b"/><path d="M-70 30 q16 -26 34 0 t34 0" fill="none" stroke="#f06595" stroke-width="8" stroke-linecap="round"/><g fill="#22d3ee"><circle cx="-90" cy="-40" r="6"/><circle cx="80" cy="40" r="6"/></g>`,
  kPerforming: `<rect x="-14" y="-4" width="28" height="68" rx="10" fill="#343a40" ${o(8)}/><circle cx="0" cy="-34" r="34" fill="#ced4da" ${o(8)}/><path d="M-22 -48 H22 M-24 -34 H24 M-22 -20 H22" stroke="#868e96" stroke-width="4"/>
    <g transform="translate(88 0) rotate(18)"><rect x="-6" y="-30" width="12" height="100" rx="5" fill="#f783ac" ${o(7)}/>${star(0, -52, 0.9, "#ffd43b")}</g>
    <g fill="#ffd43b" ${o(4)}><path d="M-96 -52 l8 -22 l8 22 Z"/><path d="M-80 -20 l8 -22 l8 22 Z"/></g>${T("K", -66, 40, 54, "#e03131", `stroke="${K}" stroke-width="3"`)}`,
  immersiveMedia: `<rect x="-118" y="-48" width="236" height="104" rx="30" fill="#343a40" ${o(9)}/><circle cx="-46" cy="4" r="30" fill="#74c0fc" ${o(7)}/><circle cx="46" cy="4" r="30" fill="#74c0fc" ${o(7)}/>
    <circle cx="-54" cy="-6" r="9" fill="#fff" opacity=".8"/><circle cx="38" cy="-6" r="9" fill="#fff" opacity=".8"/><path d="M-130 -10 H-118 M118 -10 H130" stroke="#868e96" stroke-width="12" stroke-linecap="round"/><path d="M-30 52 Q0 66 30 52" fill="none" stroke="#adb5bd" stroke-width="7" stroke-linecap="round"/>`,
  quantum: `<circle cx="0" cy="0" r="62" fill="rgba(116,192,252,.28)" ${o(8)}/><ellipse cx="0" cy="0" rx="62" ry="20" fill="none" stroke="#7048e8" stroke-width="6" stroke-dasharray="10 8"/>
    <path d="M0 0 L36 -38" stroke="#e03131" stroke-width="8" stroke-linecap="round"/><circle cx="36" cy="-38" r="10" fill="#e03131" ${o(5)}/>${T("|0⟩", 0, -72, 24, "#212529")}${T("|1⟩", 0, 96, 24, "#212529")}`,
  bioMaterial: `<path d="${Array.from({ length: 31 }, (_, i) => `${i ? "L" : "M"}${-100 + i * 4.4} ${Math.sin(i * 0.28) * 32}`).join(" ")}" fill="none" stroke="#e03131" stroke-width="9" stroke-linecap="round"/>
    <path d="${Array.from({ length: 31 }, (_, i) => `${i ? "L" : "M"}${-100 + i * 4.4} ${-Math.sin(i * 0.28) * 32}`).join(" ")}" fill="none" stroke="#1c7ed6" stroke-width="9" stroke-linecap="round"/>
    <g fill="#ced4da" ${o(6)}><path d="M70 -50 l20 -12 l20 12 v24 l-20 12 l-20 -12 Z"/><path d="M96 -6 l20 -12 l20 12 v24 l-20 12 l-20 -12 Z"/><path d="M44 -6 l20 -12 l20 12 v24 l-20 12 l-20 -12 Z"/></g>`,
  seedFoodTech: `<rect x="-100" y="22" width="200" height="50" rx="12" fill="#2b2f5b" ${o(9)}/><g stroke="#22d3ee" stroke-width="5" stroke-linecap="round"><path d="M-80 46 H-40 M-20 46 H20 M40 46 H80"/></g>
    <path d="M0 22 V-30" stroke="#2f9e44" stroke-width="9" stroke-linecap="round"/><path d="M0 -8 Q-52 -16 -56 -56 Q-6 -50 0 -8 Z" fill="#69db7c" ${o(7)}/><path d="M0 -26 Q48 -34 54 -74 Q4 -68 0 -26 Z" fill="#51cf66" ${o(7)}/>
    <ellipse cx="78" cy="-8" rx="12" ry="18" fill="#c8a064" ${o(6)}/><circle cx="-78" cy="0" r="9" fill="#ffd43b" ${o(5)}/>`,
  aiSemiconductor: `<rect x="-62" y="-62" width="124" height="124" rx="14" fill="#212529" ${o(9)}/><g stroke="#adb5bd" stroke-width="7" stroke-linecap="round"><path d="M-36 -62 v-22 M0 -62 v-22 M36 -62 v-22 M-36 62 v22 M0 62 v22 M36 62 v22 M-62 -36 h-22 M-62 0 h-22 M-62 36 h-22 M62 -36 h22 M62 0 h22 M62 36 h22"/></g>
    <rect x="-38" y="-38" width="76" height="76" rx="8" fill="#4c3fa8" stroke="#22d3ee" stroke-width="6"/>${T("AI", 0, 18, 46, "#22d3ee")}`,
  wearable: `<rect x="-26" y="-92" width="52" height="40" fill="#f783ac" ${o(7)}/><rect x="-26" y="52" width="52" height="40" fill="#f783ac" ${o(7)}/><rect x="-54" y="-54" width="108" height="108" rx="28" fill="#212529" ${o(9)}/>
    <rect x="-44" y="-44" width="88" height="88" rx="20" fill="#0f172a"/><path d="M0 22 C-34 -4 -22 -32 -6 -30 C0 -29 0 -22 0 -22 C0 -22 0 -29 6 -30 C22 -32 34 -4 0 22 Z" fill="#fa5252"/>
    <path d="M-34 28 H-16 L-8 12 L2 36 L10 20 H34" fill="none" stroke="#22d3ee" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`,
  certificate: `<path d="M-100 -50 Q-120 -50 -120 -26 V26 Q-120 50 -100 50 H100 Q120 50 120 26 V-26 Q120 -50 100 -50 Z" fill="#fff3bf" ${o(9)}/><path d="M-100 -50 Q-90 -26 -100 50" fill="none" stroke="#e8c07a" stroke-width="6"/>
    ${star(0, -4, 1.2, "#ffd43b")}<path d="M-72 -28 H-34 M-72 -12 H-44 M34 -28 H72 M44 -12 H72 M-72 26 H-34 M34 26 H72" stroke="#c9a227" stroke-width="5" stroke-linecap="round"/>
    <path d="M-20 30 L-34 74 L-10 62 Z M20 30 L34 74 L10 62 Z" fill="#e03131" ${o(6)}/>`,
};

/** one banner with a big greeting plus the country's own landmark: used by every language department */
export const langFront = (text: string, size: number, color: string, art: string) => {
  const banner = `<rect x="-130" y="-46" width="260" height="92" rx="24" fill="${color}" ${o(9)}/>${T(text, 0, size * 0.34, size, "#fff")}`;
  const scene = `<g transform="translate(0 -34)">${art}</g>`;
  return {
    front: banner, // held in front of the belly: just the big greeting
    extra: scene, // floats beside the character when this is the main major
    float: `<g transform="translate(0 -52) scale(.7)">${banner}</g><g transform="translate(0 44) scale(.8)">${scene}</g>`, // the whole thing, small, when it is the second major
  };
};

const fanWedges = Array.from({ length: 7 }, (_, i) => {
  const R = 66, cy = 78, a0 = ((196 + i * 21) * Math.PI) / 180, a1 = ((217 + i * 21) * Math.PI) / 180;
  const p = (a: number) => `${(R * Math.cos(a)).toFixed(1)} ${(cy + R * Math.sin(a)).toFixed(1)}`;
  return `<path d="M0 ${cy} L${p(a0)} A${R} ${R} 0 0 1 ${p(a1)} Z" fill="${i % 2 ? "#ffd43b" : "#e03131"}" ${o(5)}/>`;
}).join("");
const dome = (x: number, base: number, h: number, c1: string, c2: string) =>
  `<g ${o(6)}><rect x="${x - 15}" y="${base - 22}" width="30" height="22" fill="#f1f3f5"/><path d="M${x - 20} ${base - 22} Q${x - 30} ${base - 22 - h * 0.55} ${x} ${base - 22 - h} Q${x + 30} ${base - 22 - h * 0.55} ${x + 20} ${base - 22} Z" fill="${c1}"/></g>
  <path d="M${x - 10} ${base - 28} Q${x} ${base - 22 - h * 0.9} ${x + 10} ${base - 28}" fill="none" stroke="${c2}" stroke-width="6"/><path d="M${x} ${base - 22 - h} V${base - 30 - h}" stroke="${K}" stroke-width="5"/>`;
const lantern = (x: number, s: number) =>
  `<g transform="translate(${x} 28) scale(${s})"><path d="M0 -50 V-34" stroke="${K}" stroke-width="5"/><rect x="-14" y="-36" width="28" height="9" rx="3" fill="#ffd43b" ${o(5)}/><ellipse cx="0" cy="0" rx="32" ry="28" fill="#e03131" ${o(7)}/><path d="M-12 -26 Q-22 0 -12 26 M12 -26 Q22 0 12 26" fill="none" stroke="#a61e1e" stroke-width="4"/>${T("福", 0, 12, 30, "#ffd43b")}<rect x="-14" y="26" width="28" height="9" rx="3" fill="#ffd43b" ${o(5)}/><path d="M-8 35 V54 M0 35 V58 M8 35 V54" stroke="#ffd43b" stroke-width="4" stroke-linecap="round"/></g>`;
const petals = (r: number, rx: number, ry: number, fill: string) =>
  [0, 72, 144, 216, 288].map((a) => {
    const x = (r * Math.cos(((a - 90) * Math.PI) / 180)).toFixed(1), y = (r * Math.sin(((a - 90) * Math.PI) / 180)).toFixed(1);
    return `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" transform="rotate(${a} ${x} ${y})"/>`;
  }).join("");

export const LANG_ART = {
  french: `<path d="M0 -8 L-10 22 L-32 76 H-16 L-9 58 H9 L16 76 H32 L10 22 Z" fill="#495057" ${o(6)}/><path d="M-9 40 H9 M-6 26 H6" stroke="#fff" stroke-width="4"/>
    <g transform="rotate(-24 66 52)"><rect x="22" y="40" width="92" height="24" rx="12" fill="#e8b36a" ${o(7)}/><path d="M44 42 l6 20 M64 42 l6 20 M84 42 l6 20" stroke="#b9822b" stroke-width="4" stroke-linecap="round"/></g>
    <g ${o(5)}><rect x="-104" y="26" width="16" height="30" fill="#1c3f94"/><rect x="-88" y="26" width="16" height="30" fill="#fff"/><rect x="-72" y="26" width="16" height="30" fill="#e03131"/></g>`,
  spanish: `${fanWedges}<circle cx="0" cy="78" r="9" fill="#212529"/><g transform="translate(88 38)"><g ${o(5)}>${petals(11, 9, 9, "#e03131")}<circle r="7" fill="#a61e1e"/></g></g>
    <g transform="translate(-92 44)"><path d="M0 18 Q-14 -20 10 -26" fill="none" stroke="#2f9e44" stroke-width="7" stroke-linecap="round"/><circle cx="12" cy="-26" r="13" fill="#ffd43b" ${o(5)}/></g>`,
  russian: `${dome(-62, 74, 40, "#e03131", "#fff")}${dome(0, 74, 58, "#1c7ed6", "#ffd43b")}${dome(62, 74, 40, "#2f9e44", "#fff")}<rect x="-90" y="68" width="180" height="10" rx="4" fill="#f1f3f5" ${o(6)}/>
    <g fill="#fff" opacity=".9"><circle cx="-100" cy="0" r="4"/><circle cx="96" cy="-6" r="5"/><circle cx="-78" cy="30" r="3"/></g>`,
  chinese: `${lantern(-50, 1)}${lantern(52, 0.82)}`,
  japanese: `<path d="M24 76 L66 -4 L108 76 Z" fill="#74a0e0" ${o(6)}/><path d="M52 20 L66 -4 L80 20 L72 26 L66 20 L60 26 Z" fill="#fff" stroke="${K}" stroke-width="4" stroke-linejoin="round"/>
    <g ${o(7)}><rect x="-70" y="-2" width="12" height="78" fill="#e03131"/><rect x="-30" y="-2" width="12" height="78" fill="#e03131"/><path d="M-84 -6 Q-44 -22 -4 -6 L-4 8 H-84 Z" fill="#212529"/><rect x="-76" y="22" width="64" height="9" fill="#e03131"/></g>
    <g fill="#ffb3c7" ${o(4)}><circle cx="-100" cy="36" r="7"/><circle cx="12" cy="10" r="7"/><circle cx="26" cy="54" r="6"/></g>`,
  korean: `<g transform="translate(-62 32)"><circle r="34" fill="#fff" ${o(7)}/><path d="M-34 0 A34 34 0 0 1 34 0 A17 17 0 0 1 0 0 A17 17 0 0 0 -34 0 Z" fill="#e03131"/><path d="M34 0 A34 34 0 0 1 -34 0 A17 17 0 0 1 0 0 A17 17 0 0 0 34 0 Z" fill="#1c64d6"/></g>
    <g ${o(6)}><rect x="0" y="6" width="36" height="36" rx="5" fill="#fff"/><rect x="40" y="6" width="36" height="36" rx="5" fill="#fff"/><rect x="80" y="6" width="36" height="36" rx="5" fill="#fff"/></g>${T("한", 18, 36, 28, "#212529")}${T("글", 58, 36, 28, "#212529")}${T("날", 98, 36, 28, "#212529")}`,
  english: `<g ${o(7)}><rect x="-86" y="-4" width="34" height="80" fill="#c9a96e"/><path d="M-90 -4 L-69 -40 L-48 -4 Z" fill="#8a6d3b"/><circle cx="-69" cy="26" r="13" fill="#fff"/></g><path d="M-69 26 V18 M-69 26 H-62" stroke="${K}" stroke-width="4" stroke-linecap="round"/>
    <g transform="rotate(32 40 30)"><path d="M10 74 Q-6 20 40 -26 Q80 6 56 56 Q40 70 10 74 Z" fill="#f8f9fa" ${o(7)}/><path d="M10 74 Q30 28 40 -26" fill="none" stroke="${K}" stroke-width="5"/></g>
    <path d="M-2 76 L16 56" stroke="${K}" stroke-width="9" stroke-linecap="round"/><rect x="62" y="48" width="34" height="28" rx="6" fill="#343a40" ${o(6)}/>`,
  englishCulture: `<g ${o(7)}><path d="M-14 76 L-8 30 H8 L14 76 Z" fill="#74c0a0"/><rect x="-18" y="22" width="36" height="10" rx="4" fill="#2f9e44"/><path d="M-10 22 Q-30 -4 0 -14 Q30 -4 10 22 Z" fill="#ffd43b"/></g><path d="M0 -4 Q-8 6 0 14 Q8 6 0 -4 Z" fill="#fa5252"/>
    ${[[-86, 20], [-62, 52], [62, 52], [86, 20], [-100, 62], [100, 62]].map(([x, y]) => `<path transform="translate(${x} ${y}) scale(.7)" d="M0 -26 L7 -8 L26 -7 L11 5 L16 24 L0 13 L-16 24 L-11 5 L-26 -7 L-7 -8 Z" fill="${Math.abs(x) > 90 ? "#e03131" : "#fff"}" ${o(6)}/>`).join("")}`,
};

// ============ GROUND: scenery next to the left foot ============
export const GROUND = {
  gym: `<g transform="translate(76 934)"><rect x="-8" y="-6" width="76" height="12" rx="5" fill="#adb5bd" ${o(7)}/><rect x="-24" y="-24" width="18" height="48" rx="6" fill="#495057" ${o(7)}/><rect x="68" y="-24" width="18" height="48" rx="6" fill="#495057" ${o(7)}/><rect x="-40" y="-16" width="14" height="32" rx="5" fill="#868e96" ${o(7)}/><rect x="84" y="-16" width="14" height="32" rx="5" fill="#868e96" ${o(7)}/></g>
    <circle cx="150" cy="898" r="44" fill="#f08c00" ${o(10)}/><path d="M150 854 V942 M106 898 H194" stroke="#111" stroke-width="6"/><path d="M118 868 Q150 898 118 928 M182 868 Q150 898 182 928" fill="none" stroke="#111" stroke-width="6"/>`,
  robot: `<g transform="translate(112 884)"><path d="M0 -62 V-42" stroke="#111" stroke-width="8" stroke-linecap="round"/><circle cx="0" cy="-68" r="9" fill="#22d3ee" ${o(6)}/>
    <rect x="-44" y="-42" width="88" height="62" rx="16" fill="#dbe4ff" ${o(9)}/><circle cx="-16" cy="-14" r="9" fill="#22d3ee" ${o(5)}/><circle cx="16" cy="-14" r="9" fill="#22d3ee" ${o(5)}/>
    <path d="M-12 6 H12" stroke="#111" stroke-width="6" stroke-linecap="round"/><rect x="-32" y="22" width="64" height="40" rx="12" fill="#b2bef5" ${o(9)}/><circle cx="0" cy="42" r="8" fill="#22d3ee" ${o(5)}/></g>`,
  paper: `<g transform="translate(112 906)"><path d="M-44 -10 L10 -22 L52 -4 L2 14 Z" fill="#fff" ${o(8)}/><path d="M10 -22 L8 14" stroke="#adb5bd" stroke-width="4"/></g>`,
  plant: `<g transform="translate(112 900)"><path d="M-30 -4 H30 L22 44 H-22 Z" fill="#e8590c" ${o(8)}/><path d="M0 -4 V-34" stroke="#2f9e44" stroke-width="7"/><path d="M0 -20 Q-34 -26 -36 -52 Q-4 -48 0 -20 Z" fill="#69db7c" ${o(6)}/><path d="M0 -28 Q30 -34 34 -58 Q4 -54 0 -28 Z" fill="#51cf66" ${o(6)}/></g>`,
};

// ============ HEAD: on top of the head (absolute coordinates, headroom above y=40) ============
const hardHat = (c: string, edge: string) =>
  `<path d="M200 150 Q200 -34 371 -34 Q542 -34 542 150 Z" fill="${c}" ${o(13)}/><rect x="168" y="138" width="406" height="34" rx="14" fill="${edge}" ${o(13)}/><path d="M371 -34 V138" stroke="${edge}" stroke-width="22"/>`;
const strawHat = (band: string) =>
  `<ellipse cx="371" cy="96" rx="290" ry="52" fill="#f1deb5" ${o(12)}/><path d="M232 90 Q232 -30 371 -30 Q510 -30 510 90 Z" fill="#f4e3b5" ${o(12)}/><path d="M236 70 H506" stroke="${band}" stroke-width="22"/>`;
const bouffant = (c: string) =>
  `<path d="M170 170 Q170 -20 371 -26 Q572 -20 572 170 Q540 130 480 150 Q371 120 262 150 Q202 130 170 170 Z" fill="${c}" ${o(12)}/><path d="M250 100 Q371 70 492 100" stroke="#ffffff88" stroke-width="8" fill="none"/>`;
const cap = (c: string, brim: string) =>
  `<path d="M210 150 Q220 -20 371 -22 Q522 -20 532 150 Z" fill="${c}" ${o(12)}/><path d="M212 150 Q371 190 640 130 Q600 190 400 196 Q250 196 212 150 Z" fill="${brim}" ${o(12)}/>`;

export const HEAD = {
  headphones: (c = "#3b82f6", cup = "#1e3a8a") => `<path d="M118 262 C108 -20, 634 -20, 624 262" fill="none" ${o(40)}/><path d="M118 262 C108 -20, 634 -20, 624 262" fill="none" stroke="${c}" stroke-width="20" stroke-linecap="round"/>
    <rect x="82" y="236" width="62" height="104" rx="26" fill="${cup}" ${o(12)}/><rect x="598" y="236" width="62" height="104" rx="26" fill="${cup}" ${o(12)}/>`,
  antenna: (c = "#22d3ee") => `<path d="M371 40 V-70 M371 -20 L312 -52 M371 -20 L430 -52" fill="none" ${o(12)}/><g fill="${c}" ${o(10)}><circle cx="371" cy="-84" r="26"/><circle cx="308" cy="-56" r="17"/><circle cx="434" cy="-56" r="17"/></g><circle cx="371" cy="-84" r="10" fill="#fff"/>`,
  beret: (c = "#d6336c", dark = "#a61e4d") => `<ellipse cx="392" cy="26" rx="168" ry="64" transform="rotate(-9 392 26)" fill="${c}" ${o(12)}/><path d="M300 40 Q350 -10 440 4" fill="none" stroke="${dark}" stroke-width="8" stroke-linecap="round" opacity=".6"/><circle cx="446" cy="-30" r="14" fill="${dark}" ${o(8)}/>`,
  headband: `<path d="M138 262 Q371 178 604 262" fill="none" ${o(52)}/><path d="M138 262 Q371 178 604 262" fill="none" stroke="#fff" stroke-width="34" stroke-linecap="round"/><path d="M138 262 Q371 178 604 262" fill="none" stroke="#e03131" stroke-width="10"/>`,
  mortarboard: `<path d="M371 -26 L584 54 L371 126 L158 54 Z" fill="#1e2a78" ${o(12)}/><path d="M262 92 V150 Q371 184 480 150 V92" fill="#2f3fa0" ${o(12)}/><path d="M584 54 V150" fill="none" stroke="#fab005" stroke-width="9" stroke-linecap="round"/><circle cx="584" cy="156" r="12" fill="#fab005" ${o(6)}/>${T("π", 371, 78, 62, "#fff")}`,
  bolt: `<path d="M392 -86 L322 36 H372 L346 134 L430 -4 H380 Z" fill="#fcc419" ${o(12)}/>`,
  benzene: `<g fill="none" ${o(10)}><path d="M371 -26 l24 14 v28 l-24 14 l-24 -14 v-28 Z" fill="#b2f2bb"/><path d="M420 -52 l20 12 v22 l-20 12 l-20 -12 v-22 Z" fill="#ffd8a8"/></g><path d="M395 2 L400 -14" stroke="${K}" stroke-width="8" stroke-linecap="round"/>`,
  hardHat,
  strawHat,
  bouffant,
  cap,
  gearCap: `${cap("#868e96", "#495057")}<g transform="translate(371 60) scale(.5)">${gear(0, 0, 40, "#fab005", 8)}</g>`,
  robotAntenna: `<path d="M371 40 V-60" stroke="${K}" stroke-width="12" stroke-linecap="round"/><circle cx="371" cy="-78" r="22" fill="#ff922b" ${o(10)}/><circle cx="371" cy="-78" r="8" fill="#fff"/><path d="M332 0 L300 -30 M410 0 L442 -30" stroke="${K}" stroke-width="10" stroke-linecap="round"/><circle cx="296" cy="-34" r="11" fill="#ffd8a8" ${o(7)}/><circle cx="446" cy="-34" r="11" fill="#ffd8a8" ${o(7)}/>`,
  aviator: `<path d="M196 160 Q196 -22 371 -26 Q546 -22 546 160 Q520 120 470 124 H272 Q222 120 196 160 Z" fill="#8b5e3c" ${o(12)}/><path d="M260 128 H482" stroke="#6f4a2d" stroke-width="10"/><g fill="#a5d8ff" ${o(8)}><circle cx="318" cy="70" r="30"/><circle cx="424" cy="70" r="30"/></g><path d="M348 70 H394" stroke="${K}" stroke-width="9"/>`,
  atomRing: `<g fill="none" stroke="#339af0" stroke-width="9"><ellipse cx="371" cy="-30" rx="130" ry="34"/><ellipse cx="371" cy="-30" rx="130" ry="34" transform="rotate(60 371 -30)"/></g><circle cx="371" cy="-30" r="14" fill="#fa5252" ${o(7)}/><circle cx="500" cy="-30" r="11" fill="#ffd43b" ${o(6)}/>`,
  leaves: `<path d="M371 40 V-30" stroke="#2f9e44" stroke-width="12" stroke-linecap="round"/><path d="M371 -14 Q300 -20 296 -80 Q366 -70 371 -14 Z" fill="#69db7c" ${o(9)}/><path d="M371 -34 Q444 -40 450 -102 Q378 -94 371 -34 Z" fill="#51cf66" ${o(9)}/>`,
  stars: `<g>${star(250, -34, 1, "#ffd43b")}${star(480, -64, 0.8, "#fff3bf")}${star(372, -90, 0.6, "#ffd43b")}</g><path d="M520 -10 q-34 4 -34 36 q4 -26 34 -36 Z" fill="#fff3bf" ${o(5)}/>`,
  chefHat: `<path d="M260 150 V80 Q190 70 200 20 Q210 -34 270 -22 Q290 -76 371 -66 Q452 -76 472 -22 Q532 -34 542 20 Q552 70 482 80 V150 Z" fill="#fff" ${o(12)}/><path d="M260 112 H482" stroke="#dee2e6" stroke-width="8"/>`,
  gat: `<ellipse cx="371" cy="96" rx="250" ry="50" fill="#212529" ${o(10)}/><path d="M276 90 Q276 -50 371 -50 Q466 -50 466 90 Z" fill="#3b3f45" ${o(10)}/><path d="M276 80 Q371 110 466 80" fill="none" stroke="#c9a227" stroke-width="9"/>`,
  ushanka: `<path d="M190 170 Q180 -10 371 -24 Q562 -10 552 170 L520 230 L470 150 H272 L222 230 Z" fill="#a5a0b4" ${o(12)}/><path d="M270 120 Q371 90 472 120" stroke="#fff" stroke-width="12" fill="none" opacity=".7"/>`,
  visor: `<path d="M140 250 Q371 166 602 250" fill="none" ${o(46)}/><path d="M140 250 Q371 166 602 250" fill="none" stroke="#fff" stroke-width="28" stroke-linecap="round"/><path d="M200 214 Q371 160 540 214 Q640 238 700 290 Q560 250 371 256 Q220 254 200 214 Z" fill="#fa5252" ${o(10)}/>`,
  bandana: (c = "#e03131") => `<path d="M170 210 Q371 130 572 210 L540 260 Q371 200 202 260 Z" fill="${c}" ${o(11)}/><path d="M560 230 L640 200 L620 262 Z" fill="${c}" ${o(9)}/><g fill="#fff"><circle cx="300" cy="206" r="6"/><circle cx="371" cy="190" r="6"/><circle cx="442" cy="206" r="6"/></g>`,
  blackBeret: `<ellipse cx="371" cy="30" rx="170" ry="60" fill="#212529" ${o(12)}/><circle cx="371" cy="-26" r="12" fill="#212529" ${o(8)}/>`,
  bowler: `<ellipse cx="371" cy="100" rx="230" ry="36" fill="#212529" ${o(11)}/><path d="M262 96 Q262 -34 371 -34 Q480 -34 480 96 Z" fill="#343a40" ${o(11)}/><path d="M262 74 H480" stroke="#c92a2a" stroke-width="14"/>`,
  skullcap: `<path d="M244 134 Q244 6 371 2 Q498 6 498 134 Z" fill="#212529" ${o(12)}/><path d="M244 112 H498" stroke="#ffd43b" stroke-width="12"/><circle cx="371" cy="-8" r="15" fill="#e03131" ${o(8)}/>`,
  hachimaki: `<path d="M138 262 Q371 178 604 262" fill="none" ${o(52)}/><path d="M138 262 Q371 178 604 262" fill="none" stroke="#fff" stroke-width="34" stroke-linecap="round"/><circle cx="371" cy="221" r="20" fill="#e03131"/>`,
  rose: `<g transform="translate(262 30)"><path d="M-6 20 Q-40 24 -46 -8 Q-8 -12 -6 20 Z" fill="#2f9e44" ${o(7)}/><path d="M6 20 Q36 30 50 0 Q10 -8 6 20 Z" fill="#37b24d" ${o(7)}/><circle r="30" fill="#e03131" ${o(9)}/><path d="M-14 -4 Q0 -22 16 -6 Q4 12 -10 6" fill="none" stroke="#a61e1e" stroke-width="6" stroke-linecap="round"/></g>`,
  halo: (c = "#ffd43b") => `<ellipse cx="371" cy="-44" rx="150" ry="34" fill="none" stroke="${c}" stroke-width="16"/><ellipse cx="371" cy="-44" rx="150" ry="34" fill="none" stroke="${K}" stroke-width="4"/>${star(240, -88, 0.5, c)}${star(510, -92, 0.5, c)}`,
};

// ============ FACE ============
const roundGlasses = (rim: string, tint: string, r = 56) => `<g fill="${tint}" stroke="${rim}" stroke-width="13"><circle cx="262" cy="312" r="${r}"/><circle cx="500" cy="312" r="${r}"/></g><path d="M${262 + r} 306 Q381 286 ${500 - r} 306" fill="none" stroke="${rim}" stroke-width="12" stroke-linecap="round"/>`;
const squareGlasses = (rim: string, tint: string) => `<g fill="${tint}" stroke="${rim}" stroke-width="12"><rect x="206" y="268" width="112" height="86" rx="14"/><rect x="444" y="268" width="112" height="86" rx="14"/></g><path d="M318 300 H444" stroke="${rim}" stroke-width="11"/>`;
const goggles = (rim: string, tint: string) => `<rect x="190" y="268" width="382" height="98" rx="34" fill="${tint}" stroke="${rim}" stroke-width="13"/><path d="M190 316 L136 330 M572 316 L626 330" stroke="${rim}" stroke-width="13" stroke-linecap="round"/>`;

export const FACE = {
  roundGlasses,
  squareGlasses,
  goggles,
  visor: `<rect x="188" y="262" width="386" height="104" rx="46" fill="rgba(34,211,238,.38)" stroke="#0e4a5c" stroke-width="12"/><path d="M222 286 H320" stroke="#fff" stroke-width="9" stroke-linecap="round" opacity=".85"/>`,
  paintDots: `<g><circle cx="196" cy="400" r="14" fill="#fa5252"/><circle cx="228" cy="432" r="10" fill="#fcc419"/><circle cx="546" cy="400" r="14" fill="#339af0"/><circle cx="516" cy="434" r="10" fill="#51cf66"/></g>`,
  bandage: `<g transform="rotate(-18 520 420)"><rect x="486" y="404" width="70" height="30" rx="6" fill="#fcd9b6" ${o(7)}/><path d="M521 404 V434" stroke="#e8b48a" stroke-width="6"/></g>`,
  pencil: `<g transform="rotate(14 554 250)"><rect x="534" y="214" width="14" height="108" rx="4" fill="#fab005" ${o(7)}/><path d="M534 322 L541 346 L548 322 Z" fill="#fcd9b6" ${o(6)}/></g>`,
  sunglasses: `<g fill="#111" stroke="#111" stroke-width="12"><rect x="196" y="272" width="120" height="76" rx="26"/><rect x="446" y="272" width="120" height="76" rx="26"/></g><path d="M316 296 H446" stroke="#111" stroke-width="12"/><path d="M214 290 l30 -8" stroke="#ffffff88" stroke-width="7" stroke-linecap="round"/>`,
  monocle: `<circle cx="500" cy="312" r="58" fill="rgba(94,234,212,.3)" stroke="#0f766e" stroke-width="13"/><path d="M552 340 L596 400" stroke="#0f766e" stroke-width="13" stroke-linecap="round"/>`,
  mask: `<path d="M240 400 Q371 470 502 400 Q494 470 371 484 Q248 470 240 400 Z" fill="#a5d8ff" ${o(9)}/><path d="M240 410 L190 392 M502 410 L552 392" stroke="#74c0fc" stroke-width="8" stroke-linecap="round"/>`,
};

// ============ MARK: small symbols printed on the mane (centered on 0,0, drawn in currentColor) ============
export const MARK = {
  code: `<path d="M-14 -22 L-34 0 L-14 22 M14 -22 L34 0 L14 22 M7 -28 L-7 28" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`,
  nodes: `<g fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"><path d="M-26 -14 L0 16 L26 -18 M-26 -14 L0 -26 L26 -18"/></g><g fill="currentColor"><circle cx="-26" cy="-14" r="10"/><circle cx="0" cy="16" r="10"/><circle cx="26" cy="-18" r="10"/><circle cx="0" cy="-26" r="10"/></g>`,
  splat: `<g fill="currentColor"><circle cx="0" cy="0" r="17"/><circle cx="-24" cy="-10" r="9"/><circle cx="20" cy="-24" r="8"/><circle cx="26" cy="14" r="9"/><circle cx="-8" cy="26" r="7"/></g>`,
  stopwatch: `<g fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"><circle cx="0" cy="4" r="22"/><path d="M0 -26 V-18 M-8 -28 H8 M0 4 L0 -10 M0 4 L10 10"/></g>`,
  pi: `${T("π", 0, 16, 56, "currentColor")}`,
  bolt: `<path d="M8 -28 L-18 4 H-2 L-10 28 L18 -6 H2 Z" fill="currentColor"/>`,
  hex: `<g fill="none" stroke="currentColor" stroke-width="8" stroke-linejoin="round"><path d="M0 -26 L23 -13 V13 L0 26 L-23 13 V-13 Z"/><path d="M0 -10 L10 -4 V6 L0 12 L-10 6 V-4 Z" stroke-width="5"/></g>`,
  house: `<g fill="currentColor"><path d="M0 -28 L30 -4 H-30 Z"/><rect x="-20" y="-4" width="40" height="30"/></g><rect x="-6" y="8" width="12" height="18" fill="#a30f14"/>`,
  gear: `<g transform="scale(.8)">${gear(0, 0, 24, "currentColor", 8).replace(/stroke="#000"/g, 'stroke="currentColor"').replace(/fill="#fff"/g, 'fill="#a30f14"')}</g>`,
  leaf: `<path d="M-24 22 Q-30 -24 20 -28 Q26 18 -24 22 Z" fill="currentColor"/><path d="M-22 20 L10 -12" stroke="#a30f14" stroke-width="5" stroke-linecap="round"/>`,
  atom: `<g fill="none" stroke="currentColor" stroke-width="6"><ellipse rx="28" ry="10"/><ellipse rx="28" ry="10" transform="rotate(60)"/><ellipse rx="28" ry="10" transform="rotate(120)"/></g><circle r="6" fill="currentColor"/>`,
  heart: `<path d="M0 26 C-34 2 -28 -24 -10 -22 C-4 -21 0 -14 0 -14 C0 -14 4 -21 10 -22 C28 -24 34 2 0 26 Z" fill="currentColor"/>`,
  book: `<path d="M-2 -18 Q-18 -26 -30 -22 V18 Q-18 14 -2 22 Z M2 -18 Q18 -26 30 -22 V18 Q18 14 2 22 Z" fill="currentColor"/>`,
  note: `<g fill="currentColor"><ellipse cx="-10" cy="18" rx="12" ry="9"/><rect x="0" y="-26" width="6" height="44"/><path d="M4 -26 Q26 -22 24 -4 Q14 -14 4 -12 Z"/></g>`,
  star: `<path d="M0 -26 L7 -8 L26 -7 L11 5 L16 24 L0 13 L-16 24 L-11 5 L-26 -7 L-7 -8 Z" fill="currentColor"/>`,
  cube: `<g fill="none" stroke="currentColor" stroke-width="7" stroke-linejoin="round"><path d="M0 -26 L24 -13 V13 L0 26 L-24 13 V-13 Z M0 0 V26 M0 0 L24 -13 M0 0 L-24 -13"/></g>`,
  drop: `<path d="M0 -28 Q26 2 20 14 Q14 28 0 28 Q-14 28 -20 14 Q-26 2 0 -28 Z" fill="currentColor"/>`,
  cross: `<path d="M-8 -26 H8 V-8 H26 V8 H8 V26 H-8 V8 H-26 V-8 H-8 Z" fill="currentColor"/>`,
  globe: `<g fill="none" stroke="currentColor" stroke-width="6"><circle r="24"/><ellipse rx="10" ry="24"/><path d="M-24 0 H24"/></g>`,
  plane: `<path d="M-28 4 L28 -4 L8 6 L12 24 L0 10 L-14 14 Z" fill="currentColor"/>`,
  mask: `<path d="M-26 -20 H26 V4 Q26 26 0 28 Q-26 26 -26 4 Z" fill="currentColor"/><g fill="#a30f14"><ellipse cx="-10" cy="-6" rx="6" ry="4"/><ellipse cx="10" cy="-6" rx="6" ry="4"/></g>`,
  clap: `<g fill="currentColor"><rect x="-26" y="-4" width="52" height="30" rx="3"/><path d="M-26 -8 L-20 -28 L26 -20 L24 -8 Z"/></g>`,
  tooth: `<path d="M-22 -20 Q0 -30 22 -20 Q26 6 14 28 Q6 28 0 6 Q-6 28 -14 28 Q-26 6 -22 -20 Z" fill="currentColor"/>`,
  spark: `<path d="M0 -28 L6 -6 L28 0 L6 6 L0 28 L-6 6 L-28 0 L-6 -6 Z" fill="currentColor"/>`,
  flower: `<g fill="currentColor">${[0, 72, 144, 216, 288].map((a) => `<circle cx="${(16 * Math.cos((a * Math.PI) / 180)).toFixed(1)}" cy="${(16 * Math.sin((a * Math.PI) / 180)).toFixed(1)}" r="10"/>`).join("")}</g><circle r="7" fill="#a30f14"/>`,
  eiffel: `<path d="M0 -28 L-8 -2 L-24 28 H-12 L-6 14 H6 L12 28 H24 L8 -2 Z" fill="currentColor"/>`,
  dome: `<path d="M-14 24 Q-24 4 0 -28 Q24 4 14 24 Z" fill="currentColor"/><rect x="-12" y="22" width="24" height="8" fill="currentColor"/>`,
  lantern: `<ellipse rx="22" ry="20" fill="currentColor"/><rect x="-10" y="-28" width="20" height="8" fill="currentColor"/><rect x="-10" y="20" width="20" height="8" fill="currentColor"/>`,
  sakura: `<g fill="currentColor">${petals(14, 9, 12, "currentColor")}</g><circle r="5" fill="#a30f14"/>`,
  taegeuk: `<g><circle r="24" fill="none" stroke="currentColor" stroke-width="6"/><path d="M-24 0 A24 24 0 0 1 24 0 A12 12 0 0 1 0 0 A12 12 0 0 0 -24 0 Z" fill="currentColor"/></g>`,
  abc: `${T("Aa", 0, 14, 44, "currentColor")}`,
  bars: `<g fill="currentColor"><rect x="-26" y="2" width="14" height="24"/><rect x="-6" y="-14" width="14" height="40"/><rect x="14" y="-26" width="14" height="52"/></g>`,
};
