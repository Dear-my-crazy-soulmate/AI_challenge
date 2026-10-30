"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ReactNode } from "react";

import AccountSettings from "@/components/AccountSettings";
import type { AccountAction } from "@/components/AccountSettings";
import Avatar from "@/components/Avatar";
import BrandMark from "@/components/BrandMark";
import DeptPicker from "@/components/DeptPicker";
import { ErrorNote, SampleLoginNote, primaryButton, secondaryButton } from "@/components/Field";
import PersonalFields from "@/components/PersonalFields";
import ScreenHeader from "@/components/ScreenHeader";
import TopicPicker from "@/components/TopicPicker";
import { useGoal } from "@/components/useGoal";
import { useTaken } from "@/components/useTaken";
import { useAuth } from "@/lib/auth";
import { MAX_INTERESTS } from "@/lib/auth/types";
import type { Profile } from "@/lib/auth/types";
import { clearDeviceData, isDemoEmail } from "@/lib/demo";
import type { DeptOption } from "@/lib/depts";
import { MODE_NAME, clearGoal } from "@/lib/goal";
import { topicLabel } from "@/lib/recommend/topics";
import { checkProfile } from "@/lib/safety/input";

const rowCls =
  "box-border flex min-h-14 w-full items-center justify-between gap-3 border-t border-line-2 px-[18px] text-left first:border-t-0 active:bg-card";

function Row({ label, right, tone = "", href, onClick }: { label: string; right?: ReactNode; tone?: string; href?: string; onClick?: () => void }) {
  const inner = (
    <>
      <span className={`text-[15px] font-semibold ${tone}`}>{label}</span>
      <span className="flex min-w-0 items-center gap-1.5">
        {right !== undefined && <span className="min-w-0 text-pretty text-right text-sm text-mute">{right}</span>}
        {(href || onClick) && right !== undefined && (
          <span aria-hidden className="text-xl leading-none text-mute">
            ›
          </span>
        )}
      </span>
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

function Editor({
  profile,
  depts,
  onDone,
  title = "프로필 수정",
  intro,
}: {
  profile: Profile;
  depts: DeptOption[];
  onDone: () => void;
  title?: string;
  intro?: ReactNode;
}) {
  const { auth } = useAuth();
  const [primary, setPrimary] = useState<string[]>(profile.primary ? [profile.primary] : []);
  const [interests, setInterests] = useState<string[]>(profile.interests);
  const [topics, setTopics] = useState<string[]>(profile.topics ?? []);
  const [personal, setPersonal] = useState({ name: profile.name, studentId: profile.studentId, grade: profile.grade });
  const [error, setError] = useState("");

  const [busy, setBusy] = useState(false);

  const same = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);
  const dirty =
    !same(primary, profile.primary ? [profile.primary] : []) ||
    !same(interests, profile.interests) ||
    !same(topics, profile.topics ?? []) ||
    personal.name !== profile.name ||
    personal.studentId !== profile.studentId ||
    personal.grade !== profile.grade;
  const leave = () => {
    if (!dirty || window.confirm("바꾼 내용이 저장되지 않았어요. 나갈까요?")) onDone();
  };

  async function save() {
    const main = primary[0] ?? "";
    // The character follows the major, unless it was changed to another department's earlier.
    const avatar = !profile.avatar || profile.avatar === profile.primary ? main : profile.avatar;
    const checked = checkProfile({ primary: main, interests, topics, avatar: avatar || null, ...personal }, depts.map((d) => d.dept));
    if (!checked.ok) return setError(checked.message);
    setBusy(true);
    const r = await auth.saveProfile(checked.value);
    setBusy(false);
    if (!r.ok) return setError(r.message);
    // A goal was worked out for the old 본전공, so it no longer applies.
    if (main !== profile.primary) clearGoal();
    onDone();
  }

  return (
    <div className="flex flex-col gap-6">
      <ScreenHeader title={title} onBack={leave} />
      {intro}
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
      {/* short chips before the long 학과 list, so they are not missed */}
      <TopicPicker selected={topics} onChange={setTopics} />
      <DeptPicker
        label="관심 있는 전공"
        hint="계산기에서 이 학과들을 먼저 보여 드려요."
        options={depts.filter((d) => d.dept !== primary[0])}
        selected={interests}
        max={MAX_INTERESTS}
        onChange={setInterests}
      />
      <SampleLoginNote />
      <div className="sticky bottom-[calc(62px+env(safe-area-inset-bottom))] z-10 -mx-[22px] flex flex-col gap-2 border-t border-line-2 bg-white px-[22px] py-3">
        <ErrorNote message={error} />
        <div className="flex gap-2">
          <div className="w-24 flex-none">
            <button type="button" onClick={leave} className={`${secondaryButton} h-[54px]`}>
              취소
            </button>
          </div>
          <button type="button" onClick={save} disabled={busy || primary.length === 0} className={primaryButton}>
            {busy ? "저장하는 중…" : "저장하기"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Me({ profile, depts, editing, setEditing }: { profile: Profile; depts: DeptOption[]; editing: boolean; setEditing: (v: boolean) => void }) {
  const router = useRouter();
  const { auth, email } = useAuth();
  const goal = useGoal();
  const taken = useTaken();
  const [account, setAccount] = useState<AccountAction | null>(null);
  const [resetNote, setResetNote] = useState("");

  if (editing) return <Editor profile={profile} depts={depts} onDone={() => setEditing(false)} />;
  // the shared 심사·체험용 account keeps its email and password, and cannot be deleted
  const demo = isDemoEmail(email);
  if (account && !demo) return <AccountSettings action={account} onDone={() => setAccount(null)} />;

  const college = depts.find((d) => d.dept === profile.primary)?.college ?? "";
  const stats = [
    { k: "학년", v: `${profile.grade}학년` },
    { k: "관심 전공", v: `${profile.interests.length}개` },
    { k: "내 목표", v: goal ? "설정됨" : "미정", empty: !goal },
  ];
  const goalHref = goal ? `/onboarding?${new URLSearchParams({ primary: goal.primary, mode: goal.mode, second: goal.second })}` : "/onboarding";
  return (
    <>
      <section className="flex items-center gap-4 rounded-3xl border border-edge bg-white p-[18px]">
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
          <div key={s.k} className="flex flex-col gap-1 rounded-2xl border border-edge bg-white px-3 py-3.5">
            <span className="text-xs text-mute">{s.k}</span>
            <span className={`text-xl font-bold tabular-nums ${s.empty ? "text-mute" : "text-accent-deep"}`}>{s.v}</span>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-3xl border border-edge bg-white">
        <Row label="프로필 수정" right={profile.primary} onClick={() => setEditing(true)} />
        <Row
          label="관심 분야"
          right={profile.topics?.length ? profile.topics.map(topicLabel).join(", ") : "골라 주세요"}
          onClick={() => setEditing(true)}
        />
        <Row label="내 이수 과목" right={`${taken.codes.size}과목`} href="/profile/courses" />
        <Row
          label="다전공 목표"
          right={goal ? `${MODE_NAME[goal.mode]} · ${goal.secondName}` : "미정"}
          href={goalHref}
        />
        {goal && <Row label="목표 지우기" onClick={clearGoal} />}
      </section>

      <h2 className="px-1 pt-2 text-sm font-bold">계정</h2>
      <section className="overflow-hidden rounded-3xl border border-edge bg-white">
        {demo ? (
          <Row label="이메일" right={email ?? ""} />
        ) : (
          <>
            <Row label="이메일" right={email ?? ""} onClick={() => setAccount("email")} />
            <Row label="비밀번호 변경" onClick={() => setAccount("password")} />
          </>
        )}
      </section>
      <section className="mt-1 overflow-hidden rounded-3xl border border-edge bg-white">
        <Row
          label="로그아웃"
          tone="text-accent-deep"
          onClick={async () => {
            await auth.signOut();
            router.push("/");
          }}
        />
        {!demo && <Row label="회원 탈퇴" tone="text-mute" onClick={() => setAccount("delete")} />}
      </section>
      {demo && (
        <>
          <section className="overflow-hidden rounded-3xl border border-edge bg-white">
            <Row
              label="처음부터 설정하기"
              tone="text-accent-deep"
              onClick={async () => {
                if (!window.confirm("이 체험 계정의 본전공·관심 분야, 이수 과목, 체험 기록과 이 기기의 목표·시간표를 모두 지우고 로그아웃할까요? 다음 사람은 로그인 화면부터 시작해요.")) return;
                const r = await auth.resetData();
                if (!r.ok) return setResetNote(r.message);
                clearDeviceData();
                await auth.signOut();
                window.location.replace("/login"); // a full load, so every store starts empty
              }}
            />
          </section>
          {resetNote && (
            <p className="px-1 text-xs font-semibold text-accent-deep" role="status">
              {resetNote}
            </p>
          )}
          <p className="px-1 text-xs leading-normal text-mute">
            심사·체험용 계정이라 이메일·비밀번호 변경과 탈퇴는 할 수 없어요. 여러 사람이 함께 쓰니 개인 정보는 적지 마세요. 다 쓰고 나면 위 버튼으로 기록을 모두 지우고 로그아웃해 주세요. 다음 사람이 처음부터 시작할 수 있어요.
          </p>
        </>
      )}

      <p className="px-1 text-xs leading-normal text-mute">
        {auth.kind === "server"
          ? "계정과 프로필은 서버에, 목표와 최근 계산은 이 기기에 저장돼요."
          : "기록은 이 기기에만 저장돼요."}{" "}
        출처: 2026 경희대 교육과정.
      </p>
      <SampleLoginNote />
    </>
  );
}

const EMPTY_PROFILE: Profile = { primary: "", interests: [], topics: [], avatar: null, grade: 1, name: "", studentId: "" };

export default function ProfileView({ depts }: { depts: DeptOption[] }) {
  const router = useRouter();
  const { ready, signedIn, profile } = useAuth();
  const [editing, setEditing] = useState(false);
  // the editor has its own header, so "MY" is not drawn twice
  const sub = editing || (ready && signedIn && !profile);
  return (
    <main className={`flex flex-col gap-3.5 px-[22px] pb-8 ${sub ? "pt-[max(6px,env(safe-area-inset-top))]" : "pt-[max(14px,env(safe-area-inset-top))]"}`}>
      {!sub && (
        <h1 className="flex items-center gap-2 px-1 text-[22px] font-bold tracking-[-0.5px]">
          <BrandMark />
          MY
        </h1>
      )}
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
      {ready && signedIn && profile && <Me profile={profile} depts={depts} editing={editing} setEditing={setEditing} />}
      {/* signed in without a profile (e.g. an account made in the Supabase dashboard): ask for the 본전공 first */}
      {ready && signedIn && !profile && (
        <Editor
          profile={EMPTY_PROFILE}
          depts={depts}
          onDone={() => router.push("/")}
          title="프로필 만들기"
          intro={
            <p className="rounded-2xl bg-sand-2 px-4 py-3 text-sm leading-normal text-ink-2">
              먼저 <b className="font-semibold">내 본전공</b>을 골라 주세요. 관심 분야도 고르면 계산기에서 맞는 다전공 학과를 먼저 추천해 드려요. 이름·학번은 적지 않아도 돼요.
            </p>
          }
        />
      )}
    </main>
  );
}
