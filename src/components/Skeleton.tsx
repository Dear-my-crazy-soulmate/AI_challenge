// Grey placeholders shown while a screen is loading, so the page keeps its shape instead of flashing a line of text.
const block = "motion-safe:animate-pulse bg-sand-2";

/** The first thing every page shows while the login state is read: a title row and three cards. */
export function PageSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-5 px-[22px] pb-8 pt-[max(14px,env(safe-area-inset-top))]">
      <span className="sr-only">불러오는 중</span>
      <div aria-hidden className={`h-7 w-40 rounded-lg ${block}`} />
      <div aria-hidden className={`h-36 rounded-3xl ${block}`} />
      <div aria-hidden className={`h-48 rounded-3xl ${block}`} />
      <div aria-hidden className={`h-24 rounded-3xl ${block}`} />
    </div>
  );
}

/** Two-column cards, like the department cards of the 체험 tab. */
export function CardGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div role="status" className="grid grid-cols-2 gap-3">
      <span className="sr-only">학과를 불러오는 중</span>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} aria-hidden className={`h-[236px] rounded-3xl ${block}`} />
      ))}
    </div>
  );
}
