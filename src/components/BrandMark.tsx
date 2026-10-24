/** The two overlapping circles of the logo (ink + red), small enough to sit beside a page title. */
export default function BrandMark() {
  return (
    <span aria-hidden className="relative inline-block h-3 w-5 flex-none">
      <span className="absolute left-0 top-0 h-3 w-3 rounded-full bg-ink" />
      <span className="absolute left-2 top-0 h-3 w-3 rounded-full bg-accent mix-blend-multiply" />
    </span>
  );
}
