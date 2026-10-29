"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";

import { CalcIcon, ChatIcon, HomeIcon, SparkIcon, UserIcon } from "@/components/Icons";

const TABS: { href: string; label: string; Icon: ComponentType<{ className?: string; on?: boolean }>; also?: string[] }[] = [
  { href: "/", label: "홈", Icon: HomeIcon },
  { href: "/onboarding", label: "계산기", Icon: CalcIcon },
  { href: "/experience", label: "체험", Icon: SparkIcon },
  { href: "/community", label: "커뮤니티", Icon: ChatIcon },
  { href: "/profile", label: "MY", Icon: UserIcon, also: ["/login", "/signup"] },
];

export default function TabBar() {
  const path = usePathname();
  return (
    <nav
      aria-label="주요 메뉴"
      className="fixed inset-x-0 bottom-0 z-10 mx-auto grid w-full max-w-[430px] grid-cols-5 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md"
    >
      {TABS.map(({ href, label, Icon, also }) => {
        const on = href === "/" ? path === "/" : [href, ...(also ?? [])].some((p) => path.startsWith(p));
        return (
          <Link
            key={label}
            href={href}
            aria-current={on ? "page" : undefined}
            className={`flex h-[62px] flex-col items-center justify-center gap-1 ${on ? "text-accent" : "text-mute"}`}
          >
            <Icon on={on} className="h-6 w-6" />
            <span className={`text-xs ${on ? "font-bold" : "font-medium"}`}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
