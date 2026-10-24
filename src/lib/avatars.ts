// Profile characters: one per department, drawn to show what the major is about.
// The artwork arrives later as a PDF. When it is turned into images, put them in public/avatars/
// and list them here (department name -> file name). Until then every profile falls back to a
// circle with the department's first letter (see components/Avatar.tsx).
const FILES: Record<string, string> = {
  // "컴퓨터공학과": "computer-science.png",
};

export function avatarSrc(dept: string | null): string | null {
  const file = dept ? FILES[dept] : undefined;
  return file ? `/avatars/${file}` : null;
}
