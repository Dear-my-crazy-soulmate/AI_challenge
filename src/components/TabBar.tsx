"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Shape = "circle" | "overlap" | "diamond";

const TABS: { href: string | null; label: string; shape: Shape }[] = [
  { href: "/", label: "홈", shape: "circle" },
  { href: "/onboarding", label: "계산기", shape: "overlap" },
  { href: null, label: "체험", shape: "diamond" }, // 전공 체험 문제: not built yet
];

const SHAPE: Record<Shape, string> = {
  circle: "h-5 w-5 rounded-full",
  overlap: "h-[18px] w-[26px] rounded-[9px]",
  diamond: "h-[18px] w-[18px] rotate-45 rounded-[5px]",
};

export default function TabBar() {
  const path = usePathname();
  return (
    <nav
      aria-label="주요 메뉴"
      className="fixed inset-x-0 bottom-0 z-10 mx-auto grid w-full max-w-[430px] grid-cols-3 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md"
    >
      {TABS.map((t) => {
        const on = t.href !== null && (t.href === "/" ? path === "/" : path.startsWith(t.href));
        const tone = on ? "text-ink" : "text-faint";
        const inner = (
          <>
            <span className={`box-border border-2 border-current ${on ? "bg-current" : ""} ${SHAPE[t.shape]}`} />
            <span className={`text-[11px] ${on ? "font-bold" : "font-medium"}`}>{t.label}</span>
          </>
        );
        const cls = `flex h-[62px] flex-col items-center justify-center gap-1.5 ${tone}`;
        return t.href ? (
          <Link key={t.label} href={t.href} aria-current={on ? "page" : undefined} className={cls}>
            {inner}
          </Link>
        ) : (
          <span key={t.label} aria-disabled="true" title="준비 중" className={`${cls} opacity-60`}>
            {inner}
          </span>
        );
      })}
    </nav>
  );
}
