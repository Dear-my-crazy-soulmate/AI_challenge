/** "2026-10-26T08:00:00Z" -> "10월 26일" (from the text itself, so server and browser agree) */
export const fmtDate = (iso: string) => `${Number(iso.slice(5, 7))}월 ${Number(iso.slice(8, 10))}일`;
