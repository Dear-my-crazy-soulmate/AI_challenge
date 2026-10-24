"use client";

import Link from "next/link";

import Avatar from "@/components/Avatar";
import { useAuth } from "@/lib/auth";

/** Top-right of the home screen: the user's character when signed in, a 로그인 pill otherwise. */
export default function AccountButton() {
  const { ready, signedIn, profile } = useAuth();
  if (!ready) return <span className="h-8 w-8" aria-hidden />;
  if (signedIn) {
    return (
      <Link href="/profile" aria-label="내 정보" className="flex">
        <Avatar dept={profile?.avatar ?? profile?.primary ?? null} size={32} />
      </Link>
    );
  }
  return (
    <Link href="/login" className="rounded-full bg-ink px-3 py-[7px] text-xs font-semibold text-paper">
      로그인
    </Link>
  );
}
