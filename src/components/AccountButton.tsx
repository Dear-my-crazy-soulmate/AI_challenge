"use client";

import Link from "next/link";

import Avatar from "@/components/Avatar";
import { useGoal } from "@/components/useGoal";
import { useAuth } from "@/lib/auth";

/** Top-right of the home screen: the user's character when signed in, a 로그인 pill otherwise. */
export default function AccountButton() {
  const { ready, signedIn, profile } = useAuth();
  const goal = useGoal();
  if (!ready) return <span className="h-8 w-8" aria-hidden />;
  if (signedIn) {
    return (
      <Link href="/profile" aria-label="내 정보" className="hit flex">
        <Avatar dept={profile?.primary ?? null} goal={goal} size={32} plainWhenEmpty />
      </Link>
    );
  }
  return (
    <Link href="/login" className="rounded-full bg-ink px-3 py-[7px] text-xs font-semibold text-paper">
      로그인
    </Link>
  );
}
