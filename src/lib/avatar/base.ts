// 쿠옹이 (the KHU lion mascot) drawn as SVG in a 742x970 box. Every look is built on this base,
// so the character stays the same while clothes and props change. Pure string building, no DOM.
export const K = "#000";
export const TAN = "#C8A064";
const RED = "#A30F14";
const TAN_D = "#B5864A";
const TAN_L = "#DDC39B";
const OUT = 22;

export const stroke = (w = OUT) => `stroke="${K}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

/** wavy mane: an ellipse whose radius breathes 6 times (symmetric), smoothed with Catmull-Rom */
function manePath(): string {
  const cx = 371, cy = 355, n = 36;
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const wob = 1 + 0.032 * Math.cos(6 * a);
    pts.push([cx + 348 * wob * Math.cos(a), cy + 318 * wob * Math.sin(a)]);
  }
  const f = (v: number) => v.toFixed(1);
  let d = `M ${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${f(c1[0])} ${f(c1[1])}, ${f(c2[0])} ${f(c2[1])}, ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + " Z";
}

const ear = (cx: number, cy: number, dir: number) => `
  <circle cx="${cx}" cy="${cy}" r="82" fill="${TAN}" ${stroke()}/>
  <circle cx="${cx - dir * 12}" cy="${cy - 8}" r="40" fill="${TAN}"/>
  <circle cx="${cx + dir * 14}" cy="${cy + 14}" r="54" fill="${K}"/>`;

/** layers, back to front */
export const parts = {
  tailLegs: `
    <path d="M505 872 C560 910, 612 905, 642 876" fill="none" stroke="${K}" stroke-width="${OUT + 4}" stroke-linecap="round"/>
    <path d="M505 872 C560 910, 612 905, 642 876" fill="none" stroke="${TAN}" stroke-width="8" stroke-linecap="round"/>
    <path d="M598 880 C606 856, 640 848, 664 858 C666 884, 640 908, 604 904 Z" fill="${RED}" ${stroke()}/>
    <rect x="272" y="820" width="70" height="90" fill="${TAN}" ${stroke()}/>
    <rect x="400" y="820" width="70" height="90" fill="${TAN}" ${stroke()}/>
    <path d="M212 930 Q214 892 262 892 L330 892 Q352 930 340 950 L230 950 Q212 950 212 930 Z" fill="#fff" ${stroke()}/>
    <path d="M530 930 Q528 892 480 892 L412 892 Q390 930 402 950 L512 950 Q530 950 530 930 Z" fill="#fff" ${stroke()}/>`,
  body: `
    <rect x="256" y="640" width="230" height="200" rx="14" fill="${TAN}" ${stroke()}/>
    <rect x="330" y="816" width="82" height="22" rx="8" fill="${K}"/>`,
  mane: `<path d="${manePath()}" fill="${RED}" ${stroke()}/>`,
  ears: ear(172, 150, 1) + ear(570, 150, -1),
  face: `
    <path d="M286 204 L270 150 L316 184 L336 138 L372 182 L404 146 L410 192 L452 146 L462 206 Z" fill="${TAN}" stroke="${K}" stroke-width="12" stroke-linejoin="round"/>
    <ellipse cx="371" cy="368" rx="232" ry="194" fill="${TAN}" ${stroke()}/>
    <ellipse cx="372" cy="302" rx="42" ry="72" fill="${TAN_D}"/>
    <circle cx="372" cy="418" r="84" fill="${TAN_L}"/>
    <ellipse cx="262" cy="312" rx="26" ry="35" fill="${K}"/>
    <ellipse cx="500" cy="312" rx="26" ry="35" fill="${K}"/>
    <path d="M232 250 Q250 226 274 248" fill="none" stroke="${K}" stroke-width="9" stroke-linecap="round"/>
    <path d="M474 248 Q496 224 518 250" fill="none" stroke="${K}" stroke-width="9" stroke-linecap="round"/>
    <path d="M328 352 Q372 336 418 352 Q408 392 372 398 Q340 390 328 352 Z" fill="${K}" stroke="${K}" stroke-width="10" stroke-linejoin="round"/>
    <path d="M372 398 L372 428" stroke="${K}" stroke-width="10" stroke-linecap="round"/>
    <path d="M322 420 Q348 452 372 430 Q396 452 422 420" fill="none" stroke="${K}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
    <g stroke="${K}" stroke-width="11" stroke-linecap="round">
      <path d="M114 372 L184 374"/><path d="M114 398 L184 396"/>
      <path d="M558 374 L628 372"/><path d="M558 396 L628 398"/>
    </g>`,
};

/** the plain mascot (also the fallback when a department is unknown) */
export const plainMascot = () => {
  const khu = `<g fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"><path d="M322 728 V770 M322 750 L342 728 M326 748 L346 772"/><path d="M358 728 V770 M386 728 V770 M358 750 H386"/><path d="M400 728 V756 Q400 772 414 772 Q428 772 428 756 V728"/></g>`;
  const arms = `<line x1="268" y1="690" x2="165" y2="790" stroke="${K}" stroke-width="76" stroke-linecap="round"/><line x1="268" y1="690" x2="165" y2="790" stroke="${TAN}" stroke-width="40" stroke-linecap="round"/>
    <line x1="474" y1="690" x2="577" y2="790" stroke="${K}" stroke-width="76" stroke-linecap="round"/><line x1="474" y1="690" x2="577" y2="790" stroke="${TAN}" stroke-width="40" stroke-linecap="round"/>
    <circle cx="150" cy="808" r="46" fill="#fff" ${stroke()}/><circle cx="592" cy="808" r="46" fill="#fff" ${stroke()}/>`;
  return parts.tailLegs + arms + parts.body + parts.mane + parts.ears + parts.face + khu;
};
