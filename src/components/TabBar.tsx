"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Shape = "circle" | "overlap" | "diamond" | "bubble" | "person";

const TABS: { href: string; label: string; shape: Shape; also?: string[] }[] = [
  { href: "/", label: "홈", shape: "circle" },
  { href: "/onboarding", label: "계산기", shape: "overlap" },
  { href: "/experience", label: "체험", shape: "diamond" },
  { href: "/community", label: "커뮤니티", shape: "bubble" },
  { href: "/profile", label: "MY", shape: "person", also: ["/login", "/signup"] },
];

const SHAPE: Record<Exclude<Shape, "person">, string> = {
  circle: "h-5 w-5 rounded-full",
  overlap: "h-[18px] w-[26px] rounded-[9px]",
  diamond: "h-4 w-4 rotate-45 rounded-[4px]",
  bubble: "h-[17px] w-[22px] rounded-[7px] rounded-bl-[2px]",
};

export default function TabBar() {
  const path = usePathname();
  return (
    <nav
      aria-label="주요 메뉴"
      className="fixed inset-x-0 bottom-0 z-10 mx-auto grid w-full max-w-[430px] grid-cols-5 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md"
    >
      {TABS.map((t) => {
        const on = t.href === "/" ? path === "/" : [t.href, ...(t.also ?? [])].some((p) => path.startsWith(p));
        const fill = on ? "bg-current" : "";
        return (
          <Link
            key={t.label}
            href={t.href}
            aria-current={on ? "page" : undefined}
            className={`flex h-[62px] flex-col items-center justify-center gap-1.5 ${on ? "text-accent" : "text-faint"}`}
          >
            <span aria-hidden className="flex h-5 flex-col items-center justify-center gap-0.5">
              {t.shape === "person" ? (
                <>
                  <span className={`box-border h-[9px] w-[9px] rounded-full border-2 border-current ${fill}`} />
                  <span className={`box-border h-2 w-[18px] rounded-t-[9px] rounded-b-sm border-2 border-current ${fill}`} />
                </>
              ) : (
                <span className={`box-border border-2 border-current ${fill} ${SHAPE[t.shape]}`} />
              )}
            </span>
            <span className={`text-[11px] ${on ? "font-bold" : "font-medium"}`}>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
