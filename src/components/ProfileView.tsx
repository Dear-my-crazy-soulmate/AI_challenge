"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ReactNode } from "react";

import Avatar from "@/components/Avatar";
import BrandMark from "@/components/BrandMark";
import DeptPicker from "@/components/DeptPicker";
import { ErrorNote, SampleLoginNote, primaryButton, secondaryButton } from "@/components/Field";
import PersonalFields from "@/components/PersonalFields";
import ScreenHeader from "@/components/ScreenHeader";
import { useGoal } from "@/components/useGoal";
import { useAuth } from "@/lib/auth";
import { MAX_INTERESTS } from "@/lib/auth/types";
import type { Profile } from "@/lib/auth/types";
import type { DeptOption } from "@/lib/depts";
import { MODE_NAME, clearGoal } from "@/lib/goal";
import { checkProfile } from "@/lib/safety/input";

const rowCls =
  "box-border flex min-h-14 w-full items-center justify-between gap-3 border-t border-line-2 px-[18px] text-left first:border-t-0 active:bg-paper";

function Row({ label, right, tone = "", href, onClick }: { label: string; right?: ReactNode; tone?: string; href?: string; onClick?: () => void }) {
  const inner = (
    <>
      <span className={`text-[15px] font-semibold ${tone}`}>{label}</span>
      {right !== undefined && <span className="min-w-0 text-pretty text-right text-[13px] text-mute">{right}</span>}
    </>
  );
  return href ? (
    <Link href={href} className={rowCls}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={rowCls}>
      {inner}
    </button>
  );
}

function Editor({ profile, depts, onDone }: { profile: Profile; depts: DeptOption[]; onDone: () => void }) {
  const { auth } = useAuth();
  const [primary, setPrimary] = useState<string[]>([profile.primary]);
  const [interests, setInterests] = useState<string[]>(profile.interests);
  const [personal, setPersonal] = useState({ name: profile.name, studentId: profile.studentId, grade: profile.grade });
  const [error, setError] = useState("");

  function save() {
    const main = primary[0] ?? "";
    // The character follows the major, unless it was changed to another department's earlier.
    const avatar = !profile.avatar || profile.avatar === profile.primary ? main : profile.avatar;
    const checked = checkProfile({ primary: main, interests, avatar: avatar || null, ...personal }, depts.map((d) => d.dept));
    if (!checked.ok) return setError(checked.message);
    const r = auth.saveProfile(checked.value);
    if (!r.ok) return setError(r.message);
    // A goal was worked out for the old 본전공, so it no longer applies.
    if (main !== profile.primary) clearGoal();
    onDone();
  }

  return (
    <>
      <ScreenHeader title="프로필 수정" onBack={onDone} />
      <PersonalFields value={personal} onChange={setPersonal} />
      <DeptPicker
        label="내 본전공"
        options={depts.filter((d) => d.single)}
        selected={primary}
        max={1}
        onChange={(next) => {
          setPrimary(next);
          setInterests((cur) => cur.filter((d) => d !== next[0]));
        }}
      />
      <DeptPicker
        label="관심 있는 전공"
        hint="계산기에서 이 학과들을 먼저 보여 드려요."
        options={depts.filter((d) => d.dept !== primary[0])}
        selected={interests}
        max={MAX_INTERESTS}
        onChange={setInterests}
      />
      <ErrorNote message={error} />
      <div className="flex flex-col gap-2">
        <button type="button" onClick={save} disabled={primary.length === 0} className={primaryButton}>
          저장하기
        </button>
        <button type="button" onClick={onDone} className={secondaryButton}>
          취소
        </button>
      </div>
      <SampleLoginNote />
    </>
  );
}

function Me({ profile, depts }: { profile: Profile; depts: DeptOption[] }) {
  const router = useRouter();
  const { auth } = useAuth();
  const goal = useGoal();
  const [editing, setEditing] = useState(false);

  if (editing) return <Editor profile={profile} depts={depts} onDone={() => setEditing(false)} />;

  const college = depts.find((d) => d.dept === profile.primary)?.college ?? "";
  const stats = [
    { k: "학년", v: `${profile.grade}학년` },
    { k: "관심 전공", v: `${profile.interests.length}개` },
    { k: "내 목표", v: goal ? "설정됨" : "미정" },
  ];
  const goalHref = goal ? `/onboarding?${new URLSearchParams({ primary: goal.primary, mode: goal.mode, second: goal.second })}` : "/onboarding";
  return (
    <>
      <section className="flex items-center gap-4 rounded-[22px] border border-edge bg-card p-[18px]">
        <Avatar dept={profile.primary} goal={goal} size={136} variant="full" />
        <div className="flex min-w-0 flex-col gap-[3px]">
          <span className="text-pretty text-lg font-bold">{profile.name || "내 정보"}</span>
          <span className="text-[13px] text-mute">
            {profile.studentId ? `${profile.studentId} · ` : ""}
            {profile.grade}학년
          </span>
          <span className="text-pretty text-[13px] font-semibold">
            {college} {profile.primary}
          </span>
          <span className="mt-1.5 text-pretty text-xs leading-normal text-mute">
            {goal ? `내 목표(${MODE_NAME[goal.mode]} · ${goal.secondName})에 맞춰 바뀐 모습이에요.` : "본전공에 맞춘 기본 캐릭터예요. 목표를 저장하면 모습이 바뀌어요."}
          </span>
        </div>
      </section>

      <div className="grid grid-cols-3 gap-2">
        {stats.map((s) => (
          <div key={s.k} className="flex flex-col gap-1 rounded-2xl border border-edge bg-card px-3 py-3.5">
            <span className="text-xs text-mute">{s.k}</span>
            <span className="text-xl font-bold tabular-nums text-accent-deep">{s.v}</span>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-[22px] border border-edge bg-card">
        <Row label="프로필 수정" right={profile.primary} onClick={() => setEditing(true)} />
        <Row
          label="다전공 목표"
          right={goal ? `${MODE_NAME[goal.mode]} · ${goal.secondName}` : "미정"}
          href={goalHref}
        />
        {goal && <Row label="목표 지우기" onClick={clearGoal} />}
        <Row
          label="로그아웃"
          tone="text-accent-deep"
          onClick={() => {
            auth.signOut();
            router.push("/");
          }}
        />
      </section>

      <p className="px-1 text-xs leading-normal text-mute">기록은 이 기기에만 저장돼요. 출처: 2026 경희대 교육과정.</p>
      <SampleLoginNote />
    </>
  );
}

export default function ProfileView({ depts }: { depts: DeptOption[] }) {
  const { ready, signedIn, profile } = useAuth();
  return (
    <main className="flex flex-col gap-3.5 px-[18px] pb-8 pt-[max(14px,env(safe-area-inset-top))]">
      <h1 className="flex items-center gap-2 px-1 text-[22px] font-bold tracking-[-0.5px]">
        <BrandMark />
        MY
      </h1>
      {!ready && <p className="text-sm text-mute">불러오는 중…</p>}
      {ready && !signedIn && (
        <div className="flex flex-col gap-3 px-1 pt-2">
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
      {ready && signedIn && profile && <Me profile={profile} depts={depts} />}
    </main>
  );
}
