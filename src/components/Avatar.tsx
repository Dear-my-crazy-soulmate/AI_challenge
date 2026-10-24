import { avatarSrc } from "@/lib/avatars";

/** Profile picture: the department's character once the artwork is added, otherwise its first letter. */
export default function Avatar({
  dept,
  size = 40,
  onDark = false,
}: {
  dept: string | null;
  size?: number;
  onDark?: boolean; // on an ink-colored card the circle is drawn light instead
}) {
  const src = avatarSrc(dept);
  const box = { width: size, height: size };
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- small local character art, no optimizer needed
    return <img src={src} alt={dept ?? ""} style={box} className="flex-none rounded-full bg-sand object-cover" />;
  }
  return (
    <span
      aria-hidden
      style={{ ...box, fontSize: size * 0.4 }}
      className={`flex flex-none items-center justify-center rounded-full font-bold ${
        dept ? (onDark ? "bg-paper text-ink" : "bg-ink text-paper") : "border-2 border-chip text-faint"
      }`}
    >
      {dept ? dept.charAt(0) : "?"}
    </span>
  );
}
