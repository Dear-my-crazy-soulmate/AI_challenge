// Clothes for 쿠옹이. An outfit has:
//   garment : what sits on the torso (x 256-486, y 640-840)
//   accent  : one separable detail (collar, stripes, bow tie...) that a double-major look can borrow
//   sleeve  : color painted over the upper arm
//   khu     : color of the small KHU logo on the left chest
import { K } from "./base";

export interface Outfit {
  garment: string;
  accent: string;
  sleeve: string;
  khu: string;
}

const ST = `stroke="${K}" stroke-width="22" stroke-linejoin="round"`;
const thin = (w = 10) => `stroke="${K}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const body = (fill: string) => `<rect x="256" y="640" width="230" height="200" rx="14" fill="${fill}" ${ST}/>`;

// ---- the 8 outfits from the approved sketch
export const hoodie = (c = "#334155", dark = "#1e293b"): Outfit => ({
  sleeve: c,
  khu: "#fff",
  garment: `${body(c)}<path d="M296 804 Q371 826 446 804 L440 836 H302 Z" fill="${dark}" ${thin(8)}/>`,
  accent: `<path d="M290 688 Q371 752 452 688" fill="none" stroke="${dark}" stroke-width="22" stroke-linecap="round"/><path d="M352 716 L348 764 M392 716 L396 764" stroke="#fff" stroke-width="7" stroke-linecap="round"/>`,
});
export const techJacket = (c = "#312e81", panel = "#4338ca", glow = "#22d3ee"): Outfit => ({
  sleeve: c,
  khu: "#fff",
  garment: `${body(c)}<rect x="256" y="652" width="44" height="186" fill="${panel}"/><rect x="442" y="652" width="44" height="186" fill="${panel}"/><rect x="256" y="640" width="230" height="200" rx="14" fill="none" ${ST}/>`,
  accent: `<path d="M371 690 V838" stroke="${glow}" stroke-width="7" stroke-linecap="round"/><path d="M300 770 H330 V800 M442 770 H412 V800" fill="none" stroke="${glow}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><g fill="${glow}"><circle cx="330" cy="800" r="7"/><circle cx="412" cy="800" r="7"/></g>`,
});
export const apron = (tee = "#e9ecef", cloth = "#f1deb5", splats = true): Outfit => ({
  sleeve: tee,
  khu: "#6b4f1d",
  garment: `${body(tee)}<path d="M288 700 H454 L476 838 H266 Z" fill="${cloth}" ${thin(12)}/>`,
  accent: `${splats ? `<g stroke="none"><circle cx="306" cy="770" r="11" fill="#fa5252"/><circle cx="330" cy="806" r="8" fill="#fcc419"/><circle cx="424" cy="760" r="10" fill="#339af0"/><circle cx="446" cy="802" r="9" fill="#51cf66"/><circle cx="388" cy="826" r="7" fill="#be4bdb"/></g>` : ""}<path d="M298 700 L334 676 M444 700 L408 676" stroke="#b08968" stroke-width="9" stroke-linecap="round"/>`,
});
export const jersey = (c = "#2f9e44", trim = "#fff"): Outfit => ({
  sleeve: c,
  khu: "#fff",
  garment: `${body(c)}<rect x="262" y="652" width="12" height="184" fill="${trim}"/><rect x="468" y="652" width="12" height="184" fill="${trim}"/>`,
  accent: `<path d="M334 686 L371 728 L408 686" fill="none" stroke="${trim}" stroke-width="14" stroke-linejoin="round" stroke-linecap="round"/><path d="M346 692 Q371 780 396 692" fill="none" stroke="#e03131" stroke-width="5"/><rect x="361" y="752" width="22" height="14" rx="6" fill="#fcc419" ${thin(5)}/>`,
});
export const vest = (c = "#3b4a8f", shirt = "#f8f9fa", tie = "#e03131"): Outfit => ({
  sleeve: shirt,
  khu: c,
  garment: `${body(shirt)}<path d="M268 700 L371 772 L474 700 L482 836 H260 Z" fill="${c}" ${thin(12)}/><g fill="#ffffff55"><path d="M310 800 l12 14 l-12 14 l-12 -14 Z"/><path d="M432 800 l12 14 l-12 14 l-12 -14 Z"/><path d="M371 812 l10 12 l-10 12 l-10 -12 Z"/></g>`,
  accent: `<g ${thin(7)}><path d="M371 694 L336 678 V710 Z" fill="${tie}"/><path d="M371 694 L406 678 V710 Z" fill="${tie}"/><rect x="361" y="684" width="20" height="20" rx="5" fill="${tie}"/></g>`,
});
export const coverall = (c = "#f08c00", pocket = "#d9730d", stripe = "#e9ecef"): Outfit => ({
  sleeve: c,
  khu: "#fff",
  garment: `${body(c)}<rect x="404" y="702" width="52" height="38" rx="5" fill="${pocket}" ${thin(7)}/><path d="M424 692 V714" stroke="#1971c2" stroke-width="7" stroke-linecap="round"/>`,
  accent: `<g ${thin(5)} fill="${stripe}"><rect x="258" y="772" width="226" height="14"/><rect x="258" y="802" width="226" height="14"/></g>`,
});
export const labCoat = (c = "#fff", lapel = "#f1f3f5", khu = "#495057"): Outfit => ({
  sleeve: c,
  khu,
  garment: `${body(c)}<rect x="418" y="768" width="52" height="46" rx="5" fill="${lapel}" ${thin(7)}/><path d="M432 756 V782 M444 756 V782" stroke="#1971c2" stroke-width="6" stroke-linecap="round"/>`,
  accent: `<path d="M296 688 L350 688 L371 774 L322 752 Z" fill="${lapel}" ${thin(8)}/><path d="M446 688 L392 688 L371 774 L420 752 Z" fill="${lapel}" ${thin(8)}/><g fill="#adb5bd"><circle cx="371" cy="790" r="6"/><circle cx="371" cy="816" r="6"/></g>`,
});
export const hiVis = (c = "#c0eb2e", khu = "#3d4f00"): Outfit => ({
  sleeve: "#f1f3f5",
  khu,
  garment: body(c),
  accent: `<g ${thin(5)} fill="#dee2e6"><rect x="288" y="652" width="26" height="184"/><rect x="428" y="652" width="26" height="184"/><rect x="258" y="786" width="226" height="16"/></g>`,
});

// ---- new outfit types for the other departments (same parts, other colors)
export const blazer = (c = "#1e3a5f", shirt = "#f8f9fa", pin = "#e03131"): Outfit => ({
  sleeve: c,
  khu: "#fff",
  garment: `${body(shirt)}<path d="M258 650 H350 L371 760 L330 836 H258 Z" fill="${c}" ${thin(10)}/><path d="M484 650 H392 L371 760 L412 836 H484 Z" fill="${c}" ${thin(10)}/>`,
  accent: `<circle cx="430" cy="712" r="9" fill="${pin}" ${thin(5)}/><path d="M371 700 L371 760" stroke="#adb5bd" stroke-width="5"/>`,
});
export const overalls = (c = "#2f6f3a", tee = "#fff3bf"): Outfit => ({
  sleeve: tee,
  khu: "#fff",
  garment: `${body(tee)}<path d="M280 736 H462 V838 H280 Z" fill="${c}" ${thin(10)}/><rect x="296" y="700" width="24" height="46" fill="${c}"/><rect x="422" y="700" width="24" height="46" fill="${c}"/><rect x="330" y="760" width="82" height="34" rx="5" fill="#00000022"/>`,
  accent: `<circle cx="308" cy="744" r="7" fill="#ffd43b" ${thin(4)}/><circle cx="434" cy="744" r="7" fill="#ffd43b" ${thin(4)}/>`,
});
export const scrubs = (c = "#12b3a8", trim = "#0b7a72"): Outfit => ({
  sleeve: c,
  khu: "#fff",
  garment: `${body(c)}<rect x="408" y="770" width="52" height="40" rx="5" fill="${trim}" ${thin(7)}/>`,
  accent: `<path d="M326 686 L371 746 L416 686" fill="none" stroke="${trim}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>`,
});
export const suit = (c = "#2b3a55", tie = "#c92a2a"): Outfit => ({
  sleeve: c,
  khu: "#fff",
  garment: `${body("#f8f9fa")}<path d="M258 650 H346 L371 790 L330 836 H258 Z" fill="${c}" ${thin(10)}/><path d="M484 650 H396 L371 790 L412 836 H484 Z" fill="${c}" ${thin(10)}/>`,
  accent: `<path d="M371 692 L356 706 L364 800 L371 812 L378 800 L386 706 Z" fill="${tie}" ${thin(6)}/>`,
});
export const dobok = (): Outfit => ({
  sleeve: "#fff",
  khu: "#495057",
  garment: `${body("#fff")}<path d="M296 686 L371 800 L446 686" fill="none" stroke="#212529" stroke-width="12" stroke-linejoin="round"/>`,
  accent: `<rect x="258" y="796" width="226" height="22" rx="4" fill="#111" ${thin(5)}/><path d="M371 796 L350 840 M371 796 L396 840" stroke="#111" stroke-width="9" stroke-linecap="round"/>`,
});
export const cleanroom = (): Outfit => ({
  sleeve: "#f1f3f5",
  khu: "#1971c2",
  garment: `${body("#f1f3f5")}<path d="M371 686 V838" stroke="#adb5bd" stroke-width="6"/><rect x="408" y="708" width="46" height="30" rx="4" fill="#d0ebff" ${thin(5)}/>`,
  accent: `<path d="M262 760 H480" stroke="#228be6" stroke-width="10"/><path d="M326 686 L371 730 L416 686" fill="none" stroke="#228be6" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>`,
});
export const turtleneck = (c = "#212529", scarf = "#e03131"): Outfit => ({
  sleeve: c,
  khu: "#fff",
  garment: body(c),
  accent: `<path d="M308 690 Q371 740 434 690" fill="none" stroke="${scarf}" stroke-width="20" stroke-linecap="round"/>`,
});
export const leather = (): Outfit => ({
  sleeve: "#3b2f2f",
  khu: "#ffd8a8",
  garment: `${body("#3b2f2f")}<path d="M371 686 V838" stroke="#adb5bd" stroke-width="6"/><path d="M262 700 L330 720 M480 700 L412 720" stroke="#868e96" stroke-width="8" stroke-linecap="round"/>`,
  accent: `<g fill="#ffd43b"><circle cx="276" cy="760" r="5"/><circle cx="296" cy="760" r="5"/><circle cx="446" cy="760" r="5"/><circle cx="466" cy="760" r="5"/></g>`,
});
export const bomber = (): Outfit => ({
  sleeve: "#8b5e3c",
  khu: "#fff",
  garment: `${body("#8b5e3c")}<rect x="256" y="800" width="230" height="38" rx="6" fill="#6f4a2d"/>`,
  accent: `<path d="M326 690 Q371 740 416 690" fill="none" stroke="#f1f3f5" stroke-width="18" stroke-linecap="round"/><path d="M371 712 V836" stroke="#e8c07a" stroke-width="6"/>`,
});
export const robe = (c = "#6741d9"): Outfit => ({
  sleeve: c,
  khu: "#fff",
  garment: `${body(c)}<path d="M371 686 V838" stroke="#ffd43b" stroke-width="7"/>`,
  accent: `<path d="M276 700 L330 740 M466 700 L412 740" stroke="#ffd43b" stroke-width="8" stroke-linecap="round"/>`,
});

// the eight from the sketch, by name
export const OUTFITS = {
  후드티: hoodie(),
  테크재킷: techJacket(),
  앞치마: apron(),
  저지: jersey(),
  스웨터조끼: vest(),
  작업복: coverall(),
  실험복: labCoat(),
  안전조끼: hiVis(),
};
