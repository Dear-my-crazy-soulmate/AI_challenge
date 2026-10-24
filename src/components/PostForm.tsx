"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import DeptPicker from "@/components/DeptPicker";
import { Area, ErrorNote, Field, primaryButton, secondaryButton } from "@/components/Field";
import ScreenHeader from "@/components/ScreenHeader";
import { useGoal } from "@/components/useGoal";
import { useAuth } from "@/lib/auth";
import { GRADES } from "@/lib/auth/types";
import type { Grade } from "@/lib/auth/types";
import { buildPost } from "@/lib/community/compose";
import { newId, update, withPost } from "@/lib/community/local";
import { LIMITS, LOAD_LABEL, POST_TYPES, STAGE_LABEL, TYPE_LABEL } from "@/lib/community/types";
import type { Combo, PostType, ReviewFields, Stage } from "@/lib/community/types";
import type { DeptOption } from "@/lib/depts";
import { MODE_NAME } from "@/lib/goal";
import type { GoalMode } from "@/lib/goal";

export interface MdOption {
  id: string;
  name: string;
  depts: string[];
}

const chip = (on: boolean) =>
  `flex h-11 flex-none items-center justify-center rounded-xl border px-3.5 text-sm font-semibold ${
    on ? "border-accent bg-accent text-white" : "border-edge bg-card text-ink"
  }`;

function Choice<T extends string | number>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-bold">{label}</span>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={label}>
        {options.map(([v, text]) => (
          <button key={String(v)} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)} className={chip(value === v)}>
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Write a 후기, 질문 or 정보 글. Only signed-in students can write, so every post carries a real 본전공. */
export default function PostForm({ depts, mds }: { depts: DeptOption[]; mds: MdOption[] }) {
  const router = useRouter();
  const { ready, signedIn, profile } = useAuth();
  const goal = useGoal();

  const [type, setType] = useState<PostType>("review");
  const [stage, setStage] = useState<Stage>("doing");
  const [modeSel, setModeSel] = useState<GoalMode | "none" | null>(null); // null: not chosen yet, use the saved goal
  const [secondSel, setSecondSel] = useState<string[] | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [startedGrade, setStartedGrade] = useState<Grade>(1);
  const [startedTerm, setStartedTerm] = useState<1 | 2>(1);
  const [load, setLoad] = useState<ReviewFields["load"]>(2);
  const [pros, setPros] = useState("");
  const [cons, setCons] = useState("");
  const [forWhom, setForWhom] = useState("");
  const [error, setError] = useState("");

  const mode: GoalMode | null = modeSel === "none" ? null : (modeSel ?? goal?.mode ?? null);
  const second = secondSel ?? (goal && goal.mode === mode ? [goal.secondName] : []);
  const isReview = type === "review";

  const options: DeptOption[] =
    mode === "microdegree"
      ? [...new Map(mds.map((m) => [m.name, { dept: m.name, college: m.depts.join(" · "), single: true }])).values()]
      : depts.filter((d) => d.dept !== profile?.primary);

  function comboOf(): Combo | null {
    if (!mode || second.length === 0) return null;
    const name = second[0];
    if (mode === "microdegree") {
      const md = mds.find((m) => m.name === name);
      return md ? { mode, second: md.id, secondName: md.name } : null;
    }
    return { mode, second: name, secondName: name };
  }

  function pickType(t: PostType) {
    setType(t);
    setStage(t === "review" ? "doing" : "thinking");
    setError("");
  }

  function submit() {
    if (!profile) return;
    const now = new Date();
    const r = buildPost(
      { type, title, body, stage, combo: comboOf(), review: { startedGrade, startedTerm, load, pros, cons, forWhom } },
      { primary: profile.primary, grade: profile.grade },
      newId("p"),
      now,
    );
    if (!r.ok) return setError(r.message);
    if (!update((s) => withPost(s, r.value))) return setError("이 브라우저에서는 저장할 수 없어요. 시크릿 모드를 끄고 다시 시도해 주세요.");
    router.push(`/community/post?id=${encodeURIComponent(r.value.id)}`);
  }

  if (!ready) return null;
  if (!signedIn || !profile) {
    return (
      <main className="flex flex-col gap-4 px-[22px] pb-8 pt-[max(6px,env(safe-area-inset-top))]">
        <ScreenHeader title="글쓰기" backHref="/community" />
        <h2 className="text-2xl font-bold leading-[1.35] tracking-[-0.6px]">
          로그인하면
          <br />
          글을 쓸 수 있어요
        </h2>
        <p className="text-sm leading-normal text-ink-2">내 본전공을 익명 배지로 보여 주기 위해 로그인이 필요해요. 이름과 학번은 글에 나오지 않아요.</p>
        <Link href="/login" className={primaryButton}>
          로그인
        </Link>
        <Link href="/signup" className={secondaryButton}>
          가입하기
        </Link>
      </main>
    );
  }

  const stageOptions: [Stage, string][] = (isReview ? (["doing", "done"] as Stage[]) : (["thinking", "doing", "done"] as Stage[])).map((s) => [s, STAGE_LABEL[s]]);
  return (
    <main className="flex flex-col gap-5 px-[22px] pb-10 pt-[max(6px,env(safe-area-inset-top))]">
      <ScreenHeader title="글쓰기" backHref="/community" />

      <p className="rounded-[14px] bg-sand px-3.5 py-3 text-xs leading-normal text-ink-2">
        익명으로 올라가고 <b>{profile.primary} {profile.grade}학년</b> 배지만 보여요. 전화번호·이메일·학번은 쓸 수 없어요.
      </p>

      <Choice label="글 종류" value={type} options={POST_TYPES.map((t) => [t, TYPE_LABEL[t]])} onChange={pickType} />
      <Choice label={isReview ? "지금 상태" : "내 상태"} value={stage} options={stageOptions} onChange={setStage} />

      <div className="flex flex-col gap-3">
        <Choice
          label={isReview ? "어떤 조합의 후기인가요?" : "관련 전공 조합 (선택)"}
          value={mode ?? "none"}
          options={[...(isReview ? [] : ([["none", "없음"]] as [GoalMode | "none", string][])), ...(["double", "minor", "microdegree"] as GoalMode[]).map((m): [GoalMode | "none", string] => [m, MODE_NAME[m]])]}
          onChange={(m) => {
            setModeSel(m);
            setSecondSel([]);
          }}
        />
        {mode && (
          <DeptPicker
            key={mode}
            label={mode === "microdegree" ? "마이크로디그리" : `${MODE_NAME[mode]}으로 하는 전공`}
            options={options}
            selected={second}
            max={1}
            onChange={setSecondSel}
          />
        )}
      </div>

      <Field label="제목" value={title} maxLength={LIMITS.title} onChange={(e) => setTitle(e.target.value)} placeholder={isReview ? "예: 컴공 + 인공지능 다전공 후기" : "한 줄로 적어 주세요"} />

      {isReview && (
        <>
          <div className="flex flex-col gap-3">
            <Choice label="언제 시작했나요?" value={startedGrade} options={GRADES.map((g): [Grade, string] => [g, `${g}학년`])} onChange={setStartedGrade} />
            <Choice label="학기" value={startedTerm} options={[[1, "1학기"], [2, "2학기"]]} onChange={(v) => setStartedTerm(v as 1 | 2)} />
          </div>
          <Choice label="학업 부담" value={load} options={([1, 2, 3, 4] as const).map((l): [ReviewFields["load"], string] => [l, LOAD_LABEL[l]])} onChange={setLoad} />
          <Area label="장점" value={pros} maxLength={LIMITS.field} onChange={(e) => setPros(e.target.value)} placeholder="해 보니 좋았던 점" />
          <Area label="단점" value={cons} maxLength={LIMITS.field} onChange={(e) => setCons(e.target.value)} placeholder="힘들었거나 아쉬웠던 점" />
          <Area label="이런 사람에게 추천해요 (선택)" value={forWhom} maxLength={LIMITS.field} onChange={(e) => setForWhom(e.target.value)} />
        </>
      )}

      <Area
        label={isReview ? "더 하고 싶은 말 (선택)" : "내용"}
        value={body}
        maxLength={LIMITS.body}
        onChange={(e) => setBody(e.target.value)}
        hint={isReview ? undefined : "신청 조건이나 일정은 학교 공지로 확인한 내용만 적어 주세요."}
      />

      <ErrorNote message={error} />
      <button type="button" onClick={submit} className={primaryButton}>
        올리기
      </button>
      <p className="text-xs leading-normal text-mute">지금은 시연용이라 글이 이 기기의 브라우저에만 저장돼요. 다른 학생에게는 보이지 않아요.</p>
    </main>
  );
}
