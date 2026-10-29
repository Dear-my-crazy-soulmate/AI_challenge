"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";

import { ErrorNote, Field, primaryButton, secondaryButton } from "@/components/Field";
import ScreenHeader from "@/components/ScreenHeader";
import { useAuth } from "@/lib/auth";
import { clearGoal } from "@/lib/goal";
import { checkEmail, checkPassword } from "@/lib/safety/input";

export type AccountAction = "password" | "email" | "delete";

const TITLE: Record<AccountAction, string> = {
  password: "비밀번호 변경",
  email: "이메일 변경",
  delete: "회원 탈퇴",
};

/** One account change at a time; each asks for the current password first. */
export default function AccountSettings({ action, onDone }: { action: AccountAction; onDone: () => void }) {
  const router = useRouter();
  const { auth, email } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!current) return setError("현재 비밀번호를 입력해 주세요.");
    let run: () => ReturnType<typeof auth.changePassword>;
    if (action === "password") {
      const pw = checkPassword(next);
      if (!pw.ok) return setError(pw.message);
      if (next !== again) return setError("새 비밀번호가 서로 달라요.");
      if (next === current) return setError("지금과 다른 비밀번호를 입력해 주세요.");
      run = () => auth.changePassword(current, pw.value);
    } else if (action === "email") {
      const mail = checkEmail(next);
      if (!mail.ok) return setError(mail.message);
      if (mail.value === email) return setError("지금과 같은 이메일이에요.");
      run = () => auth.changeEmail(current, mail.value);
    } else {
      if (confirmText !== "탈퇴") return setError("확인을 위해 '탈퇴'라고 입력해 주세요.");
      run = () => auth.deleteAccount(current);
    }
    setBusy(true);
    const r = await run();
    setBusy(false);
    if (!r.ok) return setError(r.message);
    if (action === "delete") {
      clearGoal(); // the goal belonged to this account
      router.push("/");
      return;
    }
    setNotice(r.notice ?? (action === "password" ? "비밀번호를 바꿨어요." : "이메일을 바꿨어요."));
  }

  if (notice) {
    return (
      <>
        <ScreenHeader title={TITLE[action]} onBack={onDone} />
        <h2 className="text-2xl font-bold leading-[1.35] tracking-[-0.6px]">완료했어요</h2>
        <p className="text-[15px] leading-[1.55] text-ink-2">{notice}</p>
        <button type="button" onClick={onDone} className={primaryButton}>
          내 정보로 돌아가기
        </button>
      </>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <ScreenHeader title={TITLE[action]} onBack={onDone} />
      {action === "delete" && (
        <p className="rounded-xl border border-warn/30 bg-warn-soft px-4 py-3 text-sm leading-normal text-ink">
          계정과 프로필(본전공, 관심 전공, 이름·학번)이 지워지고 되돌릴 수 없어요. 이 기기에 저장된 목표도 함께 지워요.
        </p>
      )}
      {action === "email" && email && <p className="text-sm text-mute">지금 이메일: {email}</p>}
      <Field
        label="현재 비밀번호"
        type="password"
        autoComplete="current-password"
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
      />
      {action === "password" && (
        <>
          <Field label="새 비밀번호" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
          <Field
            label="새 비밀번호 확인"
            type="password"
            autoComplete="new-password"
            value={again}
            onChange={(e) => setAgain(e.target.value)}
          />
        </>
      )}
      {action === "email" && (
        <Field
          label="새 이메일"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          placeholder="name@example.com"
        />
      )}
      {action === "delete" && (
        <Field label="확인을 위해 '탈퇴'라고 입력" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
      )}
      <ErrorNote message={error} />
      <div className="flex flex-col gap-2">
        <button
          type="submit"
          disabled={busy}
          className={primaryButton}
        >
          {busy ? "처리하는 중…" : action === "delete" ? "계정 삭제하기" : `${TITLE[action]}하기`}
        </button>
        <button type="button" onClick={onDone} className={secondaryButton}>
          취소
        </button>
      </div>
    </form>
  );
}
