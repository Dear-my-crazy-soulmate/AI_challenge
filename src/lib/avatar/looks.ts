// A "look" is one department's whole costume: clothes + work in hand + hat + glasses + mane symbol.
// departments.ts says which look each department wears; fusion looks (융합전공) also carry a cape or pack.
import { K } from "./base";
import { FACE, FRONT, GROUND, HEAD, MARK, langFront } from "./art";
import * as O from "./outfits";
import type { Outfit } from "./outfits";

export interface Look {
  outfit: Outfit;
  front: string;
  mark: string;
  head?: string;
  face?: string;
  ground?: string;
  back?: string; // fusion looks: a cape or jetpack behind the body
}

const o = (w = 10) => `stroke="${K}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const capeOf = (c1: string, c2: string) =>
  `<path d="M250 640 L40 892 Q371 975 702 892 L492 640 Z" fill="${c1}" stroke="${K}" stroke-width="22" stroke-linejoin="round"/><path d="M120 800 Q371 860 622 800" fill="none" stroke="${c2}" stroke-width="12" stroke-linecap="round"/>`;

// ---- special outfits and drawings used by a few fusion looks
const spaceSuit: Outfit = {
  sleeve: "#f1f3f5",
  khu: "#495057",
  garment: `<rect x="256" y="640" width="230" height="200" rx="14" fill="#f1f3f5" stroke="${K}" stroke-width="22" stroke-linejoin="round"/><rect x="262" y="744" width="218" height="24" fill="#ff922b"/><rect x="394" y="696" width="62" height="34" rx="6" fill="#343a40" ${o(7)}/><circle cx="412" cy="713" r="6" fill="#22d3ee"/><circle cx="436" cy="713" r="6" fill="#ff6b6b"/>`,
  accent: "",
};
const dataSuit: Outfit = {
  sleeve: "#4c3fa8",
  khu: "#fff",
  garment: `<rect x="256" y="640" width="230" height="200" rx="14" fill="#4c3fa8" stroke="${K}" stroke-width="22" stroke-linejoin="round"/><g fill="#7c6ff0"><rect x="274" y="790" width="22" height="40"/><rect x="304" y="770" width="22" height="60"/><rect x="334" y="750" width="22" height="80"/></g>`,
  accent: `<path d="M436 690 V836" stroke="#ffd43b" stroke-width="7" stroke-linecap="round"/>`,
};
const starMap = `<rect x="-122" y="-80" width="244" height="136" rx="14" fill="#0b1437" ${o(9)}/><g fill="#fff"><circle cx="-92" cy="-52" r="3"/><circle cx="-30" cy="-60" r="2.5"/><circle cx="96" cy="-56" r="3"/><circle cx="70" cy="30" r="2.5"/><circle cx="-84" cy="34" r="3"/></g>
  <path d="M-80 -20 L-30 -44 L24 -10 L70 -40 M24 -10 L40 30" fill="none" stroke="#67e8f9" stroke-width="3.5"/><g fill="#22d3ee"><circle cx="-80" cy="-20" r="7"/><circle cx="-30" cy="-44" r="7"/><circle cx="24" cy="-10" r="7"/><circle cx="70" cy="-40" r="7"/><circle cx="40" cy="30" r="7"/></g>
  <circle cx="-56" cy="26" r="22" fill="#ff922b" ${o(6)}/><path d="M-82 30 Q-56 8 -30 26" fill="none" stroke="#ffd8a8" stroke-width="5"/><rect x="-122" y="58" width="244" height="14" rx="6" fill="#343a40" ${o(8)}/>`;
const dashboard = `<rect x="-122" y="-80" width="244" height="136" rx="12" fill="#0f172a" ${o(9)}/><rect x="-122" y="58" width="244" height="14" rx="6" fill="#4c3fa8" ${o(8)}/>
  <g stroke="${K}" stroke-width="4"><rect x="-100" y="-10" width="26" height="50" fill="#38bdf8"/><rect x="-62" y="-30" width="26" height="70" fill="#a78bfa"/><rect x="-24" y="-48" width="26" height="88" fill="#f472b6"/><rect x="14" y="-22" width="26" height="62" fill="#fbbf24"/></g>
  <circle cx="82" cy="-34" r="34" fill="none" stroke="#5eead4" stroke-width="14"/><path d="M82 -34 L82 -68 A34 34 0 0 1 112 -18 Z" fill="#fb7185"/>`;
const spaceHelmet = `<path d="M371 -40 V-110" stroke="${K}" stroke-width="12" stroke-linecap="round"/><circle cx="371" cy="-122" r="22" fill="#22d3ee" stroke="${K}" stroke-width="10"/>
  <circle cx="371" cy="330" r="372" fill="rgba(186,230,253,.2)" stroke="#e2e8f0" stroke-width="22"/><circle cx="371" cy="330" r="372" fill="none" stroke="${K}" stroke-width="6" opacity=".55"/>
  <path d="M130 120 Q180 60 250 40" fill="none" stroke="#fff" stroke-width="16" stroke-linecap="round" opacity=".8"/><rect x="210" y="618" width="322" height="52" rx="22" fill="#cbd5e1" stroke="${K}" stroke-width="14"/>`;
const jetpack = `<rect x="206" y="650" width="44" height="130" rx="18" fill="#adb5bd" stroke="${K}" stroke-width="14"/><rect x="492" y="650" width="44" height="130" rx="18" fill="#adb5bd" stroke="${K}" stroke-width="14"/>
  <path d="M214 790 q14 56 28 0 Z" fill="#ff922b" stroke="${K}" stroke-width="8" stroke-linejoin="round"/><path d="M500 790 q14 56 28 0 Z" fill="#ff922b" stroke="${K}" stroke-width="8" stroke-linejoin="round"/>`;

const fusion = (c1: string, c2: string, outfit: Outfit, front: string, mark: string, head: string, face?: string): Look => ({
  back: capeOf(c1, c2), outfit, front, mark, head, face,
});

const lang = (greeting: string, color: string, outfit: Outfit, head?: string): Look => ({ outfit, front: langFront(greeting, color), mark: MARK.book, head });

export const LOOKS: Record<string, Look> = {
  // ---- the eight from the approved sketch
  cs: { outfit: O.hoodie(), front: FRONT.laptopCode, mark: MARK.code, head: HEAD.headphones(), face: FACE.roundGlasses("#1e293b", "rgba(125,211,252,.28)") },
  ai: { outfit: O.techJacket(), front: FRONT.neuralNet, mark: MARK.nodes, head: HEAD.antenna(), face: FACE.visor, ground: GROUND.robot },
  visualDesign: { outfit: O.apron(), front: FRONT.designCanvas, mark: MARK.splat, head: HEAD.beret(), face: FACE.paintDots },
  sports: { outfit: O.jersey(), front: FRONT.stopwatch, mark: MARK.stopwatch, head: HEAD.headband, face: FACE.bandage, ground: GROUND.ball },
  math: { outfit: O.vest(), front: FRONT.equationBoard, mark: MARK.pi, head: HEAD.mortarboard, face: FACE.squareGlasses("#312e81", "rgba(199,210,254,.22)") },
  electronics: { outfit: O.coverall(), front: FRONT.circuitBoard, mark: MARK.bolt, head: HEAD.bolt, face: FACE.roundGlasses("#e8590c", "rgba(253,186,116,.45)", 52) },
  chemEng: { outfit: O.labCoat(), front: FRONT.reactionFlask, mark: MARK.hex, head: HEAD.benzene, face: FACE.goggles("#1971c2", "rgba(165,216,255,.4)") },
  architecture: { outfit: O.hiVis(), front: FRONT.buildingModel, mark: MARK.house, head: HEAD.hardHat("#fab005", "#f59f00"), face: FACE.pencil },

  // ---- 공과대학 · 전자정보대학
  mech: { outfit: O.coverall("#868e96", "#6c757d", "#ffd43b"), front: FRONT.gears, mark: MARK.gear, head: HEAD.gearCap, face: FACE.goggles("#495057", "rgba(222,226,230,.3)") },
  robot: { outfit: O.techJacket("#e8590c", "#f76707", "#ffd43b"), front: FRONT.robotArm, mark: MARK.bolt, head: HEAD.robotAntenna },
  aero: { outfit: O.bomber(), front: FRONT.airplane, mark: MARK.plane, head: HEAD.aviator },
  industrial: { outfit: O.suit(), front: FRONT.bizChart, mark: MARK.bars, face: FACE.squareGlasses("#343a40", "rgba(255,255,255,.2)") },
  nuclear: { outfit: O.coverall("#fab005", "#e67700", "#212529"), front: FRONT.atomModel, mark: MARK.atom, head: HEAD.atomRing, face: FACE.goggles("#e67700", "rgba(255,224,102,.35)") },
  materials: { outfit: O.labCoat("#dbe4ff", "#bac8ff", "#364fc7"), front: FRONT.crystal, mark: MARK.hex, face: FACE.goggles("#364fc7", "rgba(190,200,255,.35)") },
  civil: { outfit: O.hiVis("#ffa94d", "#7a3e00"), front: FRONT.bridge, mark: MARK.house, head: HEAD.hardHat("#f8f9fa", "#dee2e6") },
  structure: { outfit: O.hiVis(), front: FRONT.steelFrame, mark: MARK.house, head: HEAD.hardHat("#4dabf7", "#1c7ed6"), face: FACE.pencil },
  environment: { outfit: O.overalls("#2f9e44", "#e9fac8"), front: FRONT.earthLeaf, mark: MARK.leaf, head: HEAD.leaves },
  semiconductor: { outfit: O.cleanroom(), front: FRONT.wafer, mark: MARK.cube, head: HEAD.bouffant("#a5d8ff"), face: FACE.goggles("#1971c2", "rgba(208,235,255,.4)") },
  biomedical: { outfit: O.scrubs(), front: FRONT.heartSteth, mark: MARK.heart, head: HEAD.cap("#12b3a8", "#0b7a72") },
  softwareFusion: { outfit: O.hoodie("#2b8a3e", "#1b5e20"), front: FRONT.laptopCode, mark: MARK.nodes, head: HEAD.headphones("#51cf66", "#2b8a3e"), face: FACE.squareGlasses("#2b8a3e", "rgba(178,242,187,.25)") },

  // ---- 응용과학대학 · 생명과학대학
  physics: { outfit: O.labCoat("#e7f5ff", "#d0ebff", "#1864ab"), front: FRONT.physicsLab, mark: MARK.atom, face: FACE.squareGlasses("#1864ab", "rgba(165,216,255,.25)") },
  appliedChem: { outfit: O.labCoat("#fff3bf", "#ffec99", "#7a5c00"), front: FRONT.reactionFlask, mark: MARK.drop, head: HEAD.benzene, face: FACE.goggles("#e67700", "rgba(255,236,153,.4)") },
  astronomy: { outfit: O.vest("#1b2559", "#f8f9fa", "#fcc419"), front: FRONT.telescope, mark: MARK.star, head: HEAD.stars },
  plant: { outfit: O.overalls("#2f6f3a", "#fff3bf"), front: FRONT.sprout, mark: MARK.leaf, head: HEAD.strawHat("#2f9e44"), ground: GROUND.plant },
  flower: { outfit: O.overalls("#c2255c", "#fff0f6"), front: FRONT.flowerPot, mark: MARK.flower, head: HEAD.strawHat("#f06595") },
  food: { outfit: O.apron("#fff", "#fff9db", false), front: FRONT.bakeFood, mark: MARK.drop, head: HEAD.chefHat },
  gene: { outfit: O.labCoat("#d0ebff", "#a5d8ff", "#1864ab"), front: FRONT.dnaHelix, mark: MARK.spark, face: FACE.goggles("#e03131", "rgba(255,201,201,.3)") },
  hanbang: { outfit: O.robe("#2b8a3e"), front: FRONT.herbMortar, mark: MARK.leaf, head: HEAD.gat },
  bioMaterials: { outfit: O.labCoat("#e5dbff", "#d0bfff", "#5f3dc4"), front: FRONT.bioMaterial, mark: MARK.hex, face: FACE.goggles("#7048e8", "rgba(216,191,255,.35)") },

  // ---- 국제대학 · 외국어대학
  international: { outfit: O.blazer("#1e3a5f"), front: FRONT.passportGlobe, mark: MARK.globe },
  asia: { outfit: O.blazer("#c2255c", "#fff"), front: FRONT.asiaMap, mark: MARK.star },
  french: lang("Bonjour", "#1c3f94", O.blazer("#1c3f94", "#fff", "#e03131"), HEAD.beret("#1c3f94", "#122b6b")),
  spanish: lang("¡Hola!", "#c92a2a", O.blazer("#c92a2a", "#fff3bf", "#ffd43b")),
  russian: lang("Привет", "#364fc7", O.blazer("#364fc7", "#fff", "#e03131"), HEAD.ushanka),
  chinese: lang("你好", "#c92a2a", O.blazer("#c92a2a", "#fff3bf", "#ffd43b")),
  japanese: lang("こんにちは", "#e03131", O.blazer("#f8f9fa", "#fff", "#e03131")),
  korean: lang("안녕!", "#1971c2", O.blazer("#1971c2", "#fff", "#e03131")),
  english: lang("Hello", "#c92a2a", O.blazer("#1e3a5f", "#fff", "#c92a2a")),
  englishCulture: lang("Hi!", "#862e9c", O.blazer("#862e9c", "#fff", "#ffd43b")),

  // ---- 예술·디자인대학 · 체육대학
  productDesign: { outfit: O.vest("#ff922b", "#f8f9fa", "#212529"), front: FRONT.productSketch, mark: MARK.cube, face: FACE.roundGlasses("#e8590c", "rgba(255,255,255,.2)", 50) },
  landscape: { outfit: O.overalls("#37b24d", "#fff9db"), front: FRONT.gardenPlan, mark: MARK.leaf, head: HEAD.strawHat("#37b24d") },
  fashion: { outfit: O.turtleneck("#212529", "#f783ac"), front: FRONT.dressForm, mark: MARK.star, face: FACE.roundGlasses("#c2255c", "rgba(255,255,255,.15)", 50) },
  digitalContent: { outfit: O.hoodie("#7048e8", "#5f3dc4"), front: FRONT.penTablet, mark: MARK.spark, head: HEAD.headphones("#9775fa", "#5f3dc4") },
  ceramics: { outfit: O.apron("#e8c07a", "#b9822b", false), front: FRONT.pottery, mark: MARK.drop, head: HEAD.bandana("#e8590c") },
  theatre: { outfit: O.turtleneck("#212529", "#e03131"), front: FRONT.clapperboard, mark: MARK.clap, head: HEAD.blackBeret },
  music: { outfit: O.leather(), front: FRONT.guitar, mark: MARK.note, face: FACE.sunglasses },
  sportsMedicine: { outfit: O.jersey("#12b3a8", "#fff"), front: FRONT.firstAid, mark: MARK.cross, head: HEAD.cap("#12b3a8", "#0b7a72") },
  golf: { outfit: O.jersey("#2f9e44", "#ffe066"), front: FRONT.golf, mark: MARK.star, head: HEAD.visor },
  coaching: { outfit: O.jersey("#1971c2", "#fff"), front: FRONT.tacticBoard, mark: MARK.stopwatch, head: HEAD.cap("#1971c2", "#1864ab") },
  taekwondo: { outfit: O.dobok(), front: FRONT.boardBreak, mark: MARK.spark, head: HEAD.headband },

  // ---- 융합전공: each one is a new look (cape or pack + medal), not a mix of two majors
  globalEngineering: fusion("#1c7ed6", "#ffd43b", O.coverall("#1c7ed6", "#1864ab", "#ffd43b"), FRONT.globalEngineering, MARK.globe, HEAD.halo("#74c0fc")),
  cultureTech: fusion("#7048e8", "#ffd43b", O.hoodie("#7048e8", "#5f3dc4"), FRONT.cultureTech, MARK.note, HEAD.headphones("#da77f2", "#862e9c")),
  art4d: fusion("#f06595", "#22d3ee", O.turtleneck("#212529", "#22d3ee"), FRONT.fourDArt, MARK.cube, HEAD.halo("#f06595")),
  artTech: fusion("#9c36b5", "#f06595", O.techJacket("#1b0f3b", "#3b1c7a", "#f06595"), FRONT.artTech, MARK.spark, HEAD.antenna("#f06595")),
  kPerforming: fusion("#e03131", "#ffd43b", O.blazer("#c2255c", "#ffe3e3", "#ffd43b"), FRONT.kPerforming, MARK.star, HEAD.halo("#ffd43b")),
  immersive: fusion("#0b7285", "#ffd43b", O.techJacket("#0b7285", "#1098ad", "#ffd43b"), FRONT.immersiveMedia, MARK.cube, HEAD.halo("#22d3ee")),
  quantum: fusion("#5f3dc4", "#74c0fc", O.labCoat("#e5dbff", "#d0bfff", "#5f3dc4"), FRONT.quantum, MARK.atom, HEAD.atomRing),
  spaceAI: { back: jetpack, outfit: spaceSuit, front: starMap, mark: MARK.star, head: spaceHelmet, face: FACE.visor },
  advancedBio: fusion("#0ca678", "#ffd43b", O.labCoat("#e6fcf5", "#c3fae8", "#087f5b"), FRONT.bioMaterial, MARK.hex, HEAD.halo("#38d9a9")),
  seedFood: fusion("#74b816", "#ffd43b", O.overalls("#5c940d", "#f4fce3"), FRONT.seedFoodTech, MARK.leaf, HEAD.strawHat("#74b816")),
  aiSemiconductor: fusion("#1864ab", "#22d3ee", O.cleanroom(), FRONT.aiSemiconductor, MARK.cube, HEAD.antenna("#22d3ee")),
  wearable: fusion("#e64980", "#ffd43b", O.turtleneck("#212529", "#f783ac"), FRONT.wearable, MARK.spark, HEAD.halo("#f783ac")),
};

/** fusion-style looks get the medal on the chest */
export const FUSION_LOOKS = new Set(["globalEngineering", "cultureTech", "art4d", "artTech", "kPerforming", "immersive", "quantum", "spaceAI", "advancedBio", "seedFood", "aiSemiconductor", "wearable"]);

// ---- micro-degrees: one shared new look, with its own cape color and the first letter of its name on the medal
const MD_PALETTE: [string, string][] = [["#4c3fa8", "#ffd43b"], ["#0b7285", "#ffd43b"], ["#a61e4d", "#ffd43b"], ["#2b8a3e", "#ffd43b"], ["#e8590c", "#fff3bf"], ["#1864ab", "#ffd43b"], ["#862e9c", "#ffd43b"], ["#c92a2a", "#ffd43b"]];
export const mdLook = (name: string): { look: Look; letter: string } => {
  if (name === "빅데이터 분석") {
    return { look: { back: capeOf("#4c3fa8", "#ffd43b"), outfit: dataSuit, front: dashboard, mark: MARK.bars, head: `<ellipse cx="371" cy="-48" rx="190" ry="40" fill="none" stroke="#5eead4" stroke-width="12" stroke-dasharray="26 14" stroke-linecap="round"/><g stroke="${K}" stroke-width="9" stroke-linejoin="round"><rect x="226" y="-96" width="30" height="46" fill="#38bdf8"/><rect x="266" y="-122" width="30" height="72" fill="#a78bfa"/><rect x="446" y="-108" width="30" height="58" fill="#f472b6"/><rect x="486" y="-84" width="30" height="34" fill="#fbbf24"/></g>`, face: FACE.monocle }, letter: "빅" };
  }
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const [c1, c2] = MD_PALETTE[h % MD_PALETTE.length];
  return { look: fusion(c1, c2, O.robe(c1), FRONT.certificate, MARK.spark, HEAD.halo(c2)), letter: Array.from(name.trim())[0] ?? "★" };
};
