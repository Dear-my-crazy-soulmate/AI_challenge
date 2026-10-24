"use client";

import { useAuth } from "@/lib/auth";

/** Top of the home screen: a greeting when signed in, otherwise the rule every 26학번 needs to know. */
export default function HomeIntro({ page }: { page: number | undefined }) {
  const { ready, signedIn, profile } = useAuth();

  if (ready && signedIn && profile) {
    return (
      <section className="flex flex-col gap-1 px-1">
        <h1 className="text-pretty text-2xl font-bold leading-[1.3] tracking-[-0.6px]">
          {profile.name ? `${profile.name}님, 안녕하세요` : "안녕하세요"}
        </h1>
        <p className="text-sm text-mute">
          {profile.primary} · {profile.grade}학년
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-2.5">
      <h1 className="text-pretty text-[27px] font-bold leading-[1.32] tracking-[-0.8px]">
        26학번은 다전공·부전공·
        <br />
        마이크로디그리 중 하나를
        <br />꼭 이수해야 해요
      </h1>
      <p className="text-[13px] text-mute">2026학년도 교육과정 p.{page}</p>
    </section>
  );
}
