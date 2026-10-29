"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import DeptPicker from "@/components/DeptPicker";
import { Area, ErrorNote, Field, primaryButton, secondaryButton } from "@/components/Field";
import { PostTags, TONE } from "@/components/CommunityBadge";
import { CategoryIcon, CloseIcon } from "@/components/Icons";
import ScreenHeader from "@/components/ScreenHeader";
import { useGoal } from "@/components/useGoal";
import { useAuth } from "@/lib/auth";
import { buildPost, INFO_ONLY, relationTo } from "@/lib/community/compose";
import { newId } from "@/lib/community/local";
import { getCommunityStore } from "@/components/useCommunity";
import { CATEGORIES, LOAD_LABEL } from "@/lib/community/schema";
import type { FieldDef } from "@/lib/community/schema";
import { CATEGORY_IDS, INFO_RELATIONS, LIMITS, RELATION_LABEL, TYPE_LABEL } from "@/lib/community/types";
import type { Category, FieldValue, PostType, Relation } from "@/lib/community/types";
import type { DeptOption } from "@/lib/depts";

export interface PostFormStart {
  dept: string | null;
  type: PostType;
  category: Category | null;
}

const chip = (on: boolean) =>
  `flex h-11 flex-none items-center justify-center rounded-xl border px-3.5 text-sm font-semibold ${on ? "border-accent bg-accent text-white" : "border-edge bg-white text-ink"}`;

function Chips<T extends string | number>({ label, hint, value, options, multi = false, onChange }: {
  label: string;
  hint?: string;
  value: T | T[] | null;
  options: [T, string][];
  multi?: boolean;
  onChange: (v: T | T[]) => void;
}) {
  const picked = (v: T) => (Array.isArray(value) ? value.includes(v) : value === v);
  const click = (v: T) => (multi ? onChange(Array.isArray(value) ? (value.includes(v) ? value.filter((x) => x !== v) : [...value, v]) : [v]) : onChange(v));
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-bold">{label}</span>
      {hint && <span className="-mt-1 text-xs text-mute">{hint}</span>}
      <div className="flex flex-wrap gap-1.5" role={multi ? "group" : "radiogroup"} aria-label={label}>
        {options.map(([v, text]) => (
          <button key={String(v)} type="button" role={multi ? undefined : "radio"} aria-checked={multi ? undefined : picked(v)} aria-pressed={multi ? picked(v) : undefined} onClick={() => click(v)} className={chip(picked(v))}>
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

/** One input drawn from a schema field definition. */
function FieldInput({ def, value, depts, exclude, onChange }: { def: FieldDef; value: FieldValue | undefined; depts: DeptOption[]; exclude: string; onChange: (v: FieldValue) => void }) {
  const label = `${def.label}${def.required ? "" : " (선택)"}`;
  switch (def.kind) {
    case "text":
      return <Field label={label} maxLength={LIMITS.text} value={typeof value === "string" ? value : ""} placeholder={def.placeholder} onChange={(e) => onChange(e.target.value)} />;
    case "long":
      return <Area label={label} maxLength={LIMITS.long} value={typeof value === "string" ? value : ""} placeholder={def.placeholder} onChange={(e) => onChange(e.target.value)} />;
    case "tags":
      return <Chips<string> label={label} hint="여러 개 골라도 돼요" multi value={Array.isArray(value) ? value : []} options={(def.options ?? []).map((o) => [o, o])} onChange={(v) => onChange(v as string[])} />;
    case "choice":
      return <Chips<string> label={label} value={typeof value === "string" ? value : null} options={(def.options ?? []).map((o) => [o, o])} onChange={(v) => onChange(v as string)} />;
    case "scale":
      return <Chips<number> label={label} value={typeof value === "number" ? value : null} options={LOAD_LABEL.map((t, i): [number, string] => [i + 1, t])} onChange={(v) => onChange(v as number)} />;
    case "dept":
      return (
        <DeptPicker label={label} options={depts.filter((d) => d.dept !== exclude)} selected={typeof value === "string" ? [value] : []} max={1} onChange={(next) => onChange(next[0] ?? "")} />
      );
  }
}

/** Write a 학과 정보 or a 질문 about one department. Only signed-in students can write. */
export default function PostForm({ depts, start }: { depts: DeptOption[]; start: PostFormStart }) {
  const router = useRouter();
  const { ready, signedIn, profile } = useAuth();
  const goal = useGoal();

  const [type, setType] = useState<PostType>(start.type);
  const [deptSel, setDeptSel] = useState<string | null>(null);
  const [changingDept, setChangingDept] = useState(false);
  const [category, setCategory] = useState<Category | null>(start.category);
  const [values, setValues] = useState<Record<string, FieldValue>>({});
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const dept = deptSel ?? start.dept ?? profile?.primary ?? null;
  // read from the profile and 내 목표, never asked
  const relation: Relation | null = profile && dept ? relationTo(dept, profile, goal) : null;
  const isInfo = type === "info";
  const def = isInfo && category ? CATEGORIES[category] : null;

  function pickCategory(c: Category | null) {
    setCategory(c);
    setValues({});
  }

  async function submit() {
    if (!profile) return;
    if (!dept) return setError("어떤 학과 이야기인지 골라 주세요.");
    if (!relation) return;
    const r = buildPost({ type, dept, category, relation, title, body, values }, { primary: profile.primary, grade: profile.grade }, depts.map((d) => d.dept), newId("p"), new Date());
    if (!r.ok) return setError(r.message);
    setBusy(true);
    const saved = await getCommunityStore().addPost(r.value);
    setBusy(false);
    if (!saved.ok) return setError(saved.message);
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
        <p className="text-sm leading-normal text-ink-2">내 학과를 익명 배지로 보여 주기 위해 로그인이 필요해요. 이름과 학번은 글에 나오지 않아요.</p>
        <Link href="/login" className={primaryButton}>
          로그인
        </Link>
        <Link href="/signup" className={secondaryButton}>
          가입하기
        </Link>
      </main>
    );
  }

  const canSubmit = title.trim() !== "" && !busy;
  // opened from a department tab: what the tab already says is not asked again
  const fixedCategory = start.category !== null;
  const fixedType = fixedCategory || start.type === "question";
  return (
    <main className="flex flex-col gap-5 px-[22px] pb-24 pt-[max(6px,env(safe-area-inset-top))]">
      <div className="flex h-12 items-center gap-3">
        <Link href={dept ? `/community/dept?name=${encodeURIComponent(dept)}` : "/community"} aria-label="닫기" className="-ml-2.5 flex h-11 w-11 items-center justify-center">
          <CloseIcon className="h-7 w-7" />
        </Link>
        <h1 className="flex-1 text-lg font-bold">글 쓰기</h1>
      </div>

      {isInfo && relation && !INFO_RELATIONS.includes(relation) && <p className="rounded-xl border border-warn/30 bg-warn-soft px-4 py-3 text-sm text-ink">{INFO_ONLY}</p>}

      {start.dept && (
        <p className="-mt-2 flex flex-wrap items-center gap-1.5 text-[13px] font-semibold text-ink-2">
          {def && (
            <span style={{ color: TONE[def.id].fg }}>
              <CategoryIcon id={def.id} className="h-4 w-4 flex-none" />
            </span>
          )}
          {dept}
          {fixedType && <PostTags post={{ type, category }} />}
        </p>
      )}

      <input
        aria-label="제목"
        value={title}
        maxLength={LIMITS.title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="제목을 입력해주세요."
        className="w-full border-b border-line bg-transparent pb-4 text-[22px] font-bold outline-none placeholder:text-faint"
      />

      {!fixedType && <Chips<PostType> label="글 종류" value={type} options={[["info", TYPE_LABEL.info], ["question", TYPE_LABEL.question]]} onChange={(v) => { setType(v as PostType); setError(""); }} />}
      {!fixedCategory && <Chips<Category> label={isInfo ? "어떤 내용인가요?" : "무엇에 대한 질문인가요? (선택)"} value={category} options={CATEGORY_IDS.map((c): [Category, string] => [c, CATEGORIES[c].label])} onChange={(v) => pickCategory(v as Category)} />}

      {def && def.fields.map((f) => <FieldInput key={`${def.id}-${f.key}`} def={f} value={values[f.key]} depts={depts} exclude={dept ?? ""} onChange={(v) => setValues((cur) => ({ ...cur, [f.key]: v }))} />)}

      <div className="flex flex-col gap-2 border-t border-line pt-5">
        <textarea
          aria-label="본문"
          value={body}
          maxLength={LIMITS.body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={isInfo ? "이 학과에 대해 자유롭게 얘기해보세요. (선택)" : "궁금한 점을 자유롭게 얘기해보세요."}
          className="min-h-40 w-full resize-none bg-transparent text-base leading-relaxed outline-none placeholder:text-faint"
        />
        {!isInfo && <span className="text-xs text-mute">신청 조건이나 일정은 학교 공지로 확인한 내용만 적어 주세요.</span>}
      </div>

      <hr className="border-line" />
      <p className="rounded-xl bg-sand px-3.5 py-3 text-xs leading-normal text-ink-2">
        익명으로 올라가고 <b>{profile.primary} {profile.grade}학년</b>과 이 학과와의 관계{relation && <b> ({RELATION_LABEL[relation]})</b>}만 보여요. 전화번호·이메일·학번은 쓸 수 없어요.
      </p>

      {!start.dept && (
        <section className="flex flex-col gap-2">
          <span className="text-sm font-bold">어떤 학과 이야기인가요?</span>
          {dept && !changingDept ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-edge bg-white px-4 py-3">
              <span className="text-[15px] font-semibold">{dept}</span>
              <button type="button" onClick={() => setChangingDept(true)} className="text-[13px] font-semibold text-accent-deep">
                바꾸기
              </button>
            </div>
          ) : (
            <DeptPicker label="학과 선택" options={depts} selected={dept ? [dept] : []} max={1} onChange={(next) => { setDeptSel(next[0] ?? null); if (next[0]) setChangingDept(false); }} />
          )}
        </section>
      )}

      <ErrorNote message={error} />
      <button type="button" onClick={submit} disabled={!canSubmit} className={primaryButton}>
        {busy ? "올리는 중…" : "완료"}
      </button>

      <p className="text-xs leading-normal text-mute">
        {getCommunityStore().kind === "server"
          ? "올린 글은 모든 학생에게 익명으로 보여요. 내 글은 언제든 지울 수 있어요."
          : "지금은 시연용이라 글이 이 기기의 브라우저에만 저장돼요. 다른 학생에게는 보이지 않아요."}
      </p>
    </main>
  );
}
