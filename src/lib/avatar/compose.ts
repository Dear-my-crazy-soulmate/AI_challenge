// How a student's major choices become a 쿠옹이 look.
//   single : every slot of the major (clothes, hat, glasses, work in hand, mane symbol, prop on the ground)
//   double : slots are shared out so each major owns about half, blended instead of cut:
//            hat A, glasses B, clothes B + detail A, work A in hand, B's work floating beside, marks alternate
//   minor  : the 본전공 keeps every slot; the 부전공 adds only a small floating item and two mane marks
//   fusion : a 융합전공 or micro-degree gets its own look (cape or pack + medal), never a mix of two majors
// Pure string building, so it runs in the browser and in tests.
import { parts, plainMascot, stroke, TAN } from "./base";
import { DEPT_LOOK } from "./departments";
import { FUSION_LOOKS, LOOKS, mdLook } from "./looks";
import type { Look } from "./looks";

export type Variant = "head" | "full";
export interface GoalLike {
  mode: "double" | "minor" | "microdegree";
  second: string; // department name, or micro-degree id
  secondName: string; // department name, or micro-degree name
}

const VIEW = { full: "0 -150 742 1120", head: "21 -95 700 700" };
const SPOTS: [number, number][] = [[92, 300], [650, 300], [112, 468], [630, 468], [250, 616], [492, 616]];
const FLOAT_R: [number, number] = [632, 628];
const MARK_COLOR = "#FFD0BE";

const at = (svg: string, x: number, y: number, s = 1, rot = 0) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">${svg}</g>`;
const khuLogo = (color: string) =>
  `<g transform="translate(318 716) scale(.42) translate(-371 -750)" fill="none" stroke="${color}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"><path d="M322 728 V770 M322 750 L342 728 M326 748 L346 772"/><path d="M358 728 V770 M386 728 V770 M358 750 H386"/><path d="M400 728 V756 Q400 772 414 772 Q428 772 428 756 V728"/></g>`;
const marksOf = (list: [string, [number, number]][]) =>
  list.map(([sym, [x, y]], i) => `<g color="${MARK_COLOR}" opacity=".92">${at(sym, x, y, 1, i % 2 ? 10 : -10)}</g>`).join("");
const markSet = (syms: string[]): [string, [number, number]][] => SPOTS.map((p, i) => [syms[i % syms.length], p]);

function armsHold(sleeve: string) {
  const arm = (x1: number, x2: number) => {
    const sx = x1 + (x2 - x1) * 0.62, sy = 690 + (856 - 690) * 0.62;
    return `<line x1="${x1}" y1="690" x2="${x2}" y2="856" ${stroke(76)}/><line x1="${x1}" y1="690" x2="${x2}" y2="856" stroke="${TAN}" stroke-width="40" stroke-linecap="round"/>
      <line x1="${x1}" y1="690" x2="${sx}" y2="${sy}" stroke="${sleeve}" stroke-width="40" stroke-linecap="round"/>`;
  };
  return arm(268, 232) + arm(474, 510);
}
const handsFront = `<circle cx="236" cy="858" r="38" fill="#fff" ${stroke(12)}/><circle cx="506" cy="858" r="38" fill="#fff" ${stroke(12)}/>`;

interface Layers {
  look: Look;
  garment?: Look["outfit"]; // clothes of a different look (double majors)
  accent?: string;
  head?: string;
  face?: string;
  front?: string;
  marks: [string, [number, number]][];
  floats?: string;
  ground?: string;
  medal?: string;
}

const MEDAL_STAR = `<g transform="translate(436 712)"><path d="M0 -24 L7 -8 L26 -7 L11 5 L17 24 L0 13 L-17 24 L-11 5 L-26 -7 L-7 -8 Z" fill="#ffd43b" stroke="#000" stroke-width="8" stroke-linejoin="round"/></g>`;
const medalLetter = (ch: string) =>
  `<g transform="translate(436 712)"><circle r="26" fill="#ffd43b" stroke="#000" stroke-width="8"/><text y="9" font-size="26" font-weight="bold" text-anchor="middle" fill="#212529" font-family="'Malgun Gothic','Noto Sans KR',sans-serif">${ch.replace(/[&<>"']/g, "")}</text></g>`;

/** stack every layer in drawing order */
function dress(l: Layers): string {
  const outfit = l.garment ?? l.look.outfit;
  const body = parts.body.replace(/<rect x="256"[^>]*\/>/, outfit.garment);
  return `${l.look.back ?? ""}${parts.tailLegs}${armsHold(outfit.sleeve)}${body}${l.accent ?? l.look.outfit.accent}${l.medal ?? ""}
    ${parts.mane}${marksOf(l.marks)}${parts.ears}${parts.face}${khuLogo(outfit.khu)}
    ${l.face ?? ""}${l.head ?? ""}${at(l.front ?? l.look.front, 371, 830, 0.84)}${handsFront}${l.floats ?? ""}${l.ground ?? ""}`;
}

const lookOf = (dept: string): Look | undefined => LOOKS[DEPT_LOOK[dept]];
export const isFusionDept = (dept: string) => FUSION_LOOKS.has(DEPT_LOOK[dept]);

function single(look: Look, fusion = false): string {
  return dress({ look, marks: markSet([look.mark]), head: look.head, face: look.face, ground: look.ground, medal: fusion ? MEDAL_STAR : undefined });
}

function double(A: Look, B: Look): string {
  return dress({
    look: A, garment: B.outfit, accent: A.outfit.accent,
    marks: markSet([A.mark, B.mark]), head: A.head, face: B.face, front: A.front,
    floats: at(B.front, FLOAT_R[0], FLOAT_R[1], 0.78), ground: A.ground ?? B.ground,
  });
}

function minor(A: Look, B: Look): string {
  const marks = markSet([A.mark]).map((m, i): [string, [number, number]] => (i === 3 || i === 5 ? [B.mark, m[1]] : m));
  return dress({
    look: A, marks, head: A.head, face: A.face, ground: A.ground,
    floats: at(B.front, FLOAT_R[0] + 4, FLOAT_R[1] + 4, 0.52),
  });
}

function microdegree(name: string): string {
  const { look, letter } = mdLook(name);
  return dress({ look, marks: markSet([look.mark]), head: look.head, face: look.face, medal: medalLetter(letter) });
}

/** the character's SVG body for this student (department + saved goal), as a string of layers */
export function avatarBody(primary: string | null, goal: GoalLike | null = null): string {
  const A = primary ? lookOf(primary) : undefined;
  if (!primary || !A) return plainMascot();
  if (isFusionDept(primary)) return single(A, true); // a 융합전공 student is its own new look
  if (!goal) return single(A);
  if (goal.mode === "microdegree") return microdegree(goal.secondName);
  const B = lookOf(goal.second);
  if (!B) return single(A);
  if (isFusionDept(goal.second)) return single(B, true); // taking a 융합전공 also makes a new look
  return goal.mode === "double" ? double(A, B) : minor(A, B);
}

export const avatarSvg = (primary: string | null, goal: GoalLike | null = null, variant: Variant = "full"): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEW[variant]}">${avatarBody(primary, goal)}</svg>`;

/** ready for <img src>: no file needed, and any department or combination works */
export const avatarUri = (primary: string | null, goal: GoalLike | null = null, variant: Variant = "full"): string =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(avatarSvg(primary, goal, variant))}`;
