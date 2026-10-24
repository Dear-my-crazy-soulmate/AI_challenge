"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import Avatar from "@/components/Avatar";
import DeptPicker from "@/components/DeptPicker";
import { ErrorNote, SampleLoginNote, primaryButton, secondaryButton } from "@/components/Field";
import ScreenHeader from "@/components/ScreenHeader";
import { useAuth } from "@/lib/auth";
import { MAX_INTERESTS } from "@/lib/auth/types";
import type { Profile } from "@/lib/auth/types";
import type { DeptOption } from "@/lib/depts";
import { checkProfile } from "@/lib/safety/input";

function Editor({ profile, depts }: { profile: Profile | null; depts: DeptOption[] }) {
  const router = useRouter();
  const { auth } = useAuth();
  const [primary, setPrimary] = useState<string[]>(profile?.primary ? [profile.primary] : []);
  const [interests, setInterests] = useState<string[]>(profile?.interests ?? []);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const edit = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setSaved(false);
  };

  function save() {
    const main = primary[0] ?? "";
    // The character follows the major, unless it was changed to another department's earlier.
    const avatar = !profile?.avatar || profile.avatar === profile.primary ? main : profile.avatar;
    const checked = checkProfile({ primary: main, interests, avatar: avatar || null }, depts.map((d) => d.dept));
    if (!checked.ok) return setError(checked.message);
    const r = auth.saveProfile(checked.value);
    if (!r.ok) return setError(r.message);
    setError("");
    setSaved(true);
  }

  const shownAvatar = primary[0] ?? null;
  return (
    <>
      <section className="flex items-center gap-4 rounded-3xl bg-ink p-5 text-paper">
        <Avatar dept={shownAvatar} size={64} onDark />
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-xs opacity-70">내 본전공</span>
          <span className="text-pretty text-xl font-bold tracking-[-0.4px]">{primary[0] ?? "아직 고르지 않았어요"}</span>
          <span className="text-xs opacity-70">
            {interests.length > 0 ? `관심 전공 ${interests.length}개` : "관심 전공을 골라 보세요"}
          </span>
        </div>
      </section>

      <DeptPicker
        label="내 본전공"
        options={depts.filter((d) => d.single)}
        selected={primary}
        max={1}
        onChange={edit((next: string[]) => {
          setPrimary(next);
          setInterests((cur) => cur.filter((d) => d !== next[0]));
        })}
      />
      <DeptPicker
        label="관심 있는 전공"
        hint="계산기에서 이 학과들을 먼저 보여 드려요."
        options={depts.filter((d) => d.dept !== primary[0])}
        selected={interests}
        max={MAX_INTERESTS}
        onChange={edit(setInterests)}
      />
      <ErrorNote message={error} />
      <div className="flex flex-col gap-2">
        <button type="button" onClick={save} disabled={primary.length === 0} className={primaryButton}>
          {saved ? "저장했어요 ✓" : "저장하기"}
        </button>
        <Link href="/onboarding" className={secondaryButton}>
          다전공 계산하러 가기
        </Link>
        <button
          type="button"
          onClick={() => {
            auth.signOut();
            router.push("/");
          }}
          className="mt-1 h-11 text-sm font-semibold text-mute"
        >
          로그아웃
        </button>
      </div>
      <SampleLoginNote />
    </>
  );
}

export default function ProfileView({ depts }: { depts: DeptOption[] }) {
  const { ready, signedIn, profile } = useAuth();
  return (
    <main className="flex flex-col gap-5 px-[22px] pb-8 pt-[max(6px,env(safe-area-inset-top))]">
      <ScreenHeader title="내 정보" />
      {!ready && <p className="text-sm text-mute">불러오는 중…</p>}
      {ready && !signedIn && (
        <div className="flex flex-col gap-3">
          <h2 className="text-2xl font-bold leading-[1.35] tracking-[-0.6px]">
            로그인하면
            <br />내 학과를 기억해 드려요
          </h2>
          <p className="text-sm leading-normal text-ink-2">본전공을 저장해 두면 계산기에서 바로 시작할 수 있어요.</p>
          <Link href="/login" className={primaryButton}>
            로그인
          </Link>
          <Link href="/signup" className={secondaryButton}>
            가입하기
          </Link>
        </div>
      )}
      {ready && signedIn && <Editor profile={profile} depts={depts} />}
    </main>
  );
}
