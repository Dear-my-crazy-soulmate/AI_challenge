import Link from "next/link";
import type { ReactNode } from "react";

/** Top bar of a sub screen: back arrow, title, optional right label (same look as the calculator). */
export default function ScreenHeader({
  title,
  backHref,
  onBack,
  right,
  noBack = false,
}: {
  title: string;
  backHref?: string;
  onBack?: () => void;
  right?: ReactNode;
  noBack?: boolean; // first screen (login before anything else): nowhere to go back to
}) {
  const cls = "-ml-3 flex h-11 w-11 items-center justify-center text-[28px] leading-none";
  return (
    <div className="flex h-11 items-center justify-between">
      {noBack ? (
        <span className="w-11" />
      ) : onBack ? (
        <button type="button" aria-label="이전 단계" onClick={onBack} className={cls}>
          ‹
        </button>
      ) : (
        <Link href={backHref ?? "/"} aria-label="뒤로" className={cls}>
          ‹
        </Link>
      )}
      <h1 className="text-base font-bold">{title}</h1>
      <span className="w-11 text-right text-[13px] tabular-nums text-mute">{right}</span>
    </div>
  );
}
