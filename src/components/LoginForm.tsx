"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";

import { ErrorNote, Field, SampleLoginNote, primaryButton, secondaryButton } from "@/components/Field";
import ScreenHeader from "@/components/ScreenHeader";
import { useAuth } from "@/lib/auth";
import { checkEmail } from "@/lib/safety/input";

export default function LoginForm() {
  const router = useRouter();
  const { auth, ready, signedIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const mail = checkEmail(email);
    if (!mail.ok) return setError(mail.message);
    if (!password) return setError("비밀번호를 입력해 주세요.");
    setBusy(true);
    const r = await auth.signIn(mail.value, password);
    setBusy(false);
    if (!r.ok) return setError(r.message);
    router.push("/");
  }

  return (
    <main className="flex flex-col gap-5 px-[22px] pb-8 pt-[max(6px,env(safe-area-inset-top))]">
      <ScreenHeader title="로그인" />
      {ready && signedIn ? (
        <div className="flex flex-col gap-3">
          <h2 className="text-2xl font-bold leading-[1.35] tracking-[-0.6px]">이미 로그인되어 있어요</h2>
          <Link href="/profile" className={primaryButton}>
            내 정보 보기
          </Link>
          <button type="button" onClick={() => void auth.signOut()} className={secondaryButton}>
            로그아웃
          </button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 pb-2">
            <span aria-hidden className="relative h-12 w-[76px]">
              <span className="absolute left-0 top-0 h-12 w-12 rounded-full bg-ink" />
              <span className="absolute left-7 top-0 h-12 w-12 rounded-full bg-accent mix-blend-multiply" />
            </span>
            <h2 className="text-[32px] font-bold leading-[1.25] tracking-[-1px]">다전공 길잡이</h2>
            <p className="text-pretty text-[15px] leading-[1.55] text-ink-2">
              다전공·부전공·마이크로디그리를 내 학과 기준으로 계산하고, 목표를 저장해 두세요.
            </p>
          </div>
          <Field
            label="이메일"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
          />
          <Field
            label="비밀번호"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <ErrorNote message={error} />
          <button type="submit" disabled={busy} className={primaryButton}>
            {busy ? "확인하는 중…" : "로그인"}
          </button>
          <p className="text-center text-sm text-mute">
            처음이신가요?{" "}
            <Link href="/signup" className="font-semibold text-accent">
              가입하기
            </Link>
          </p>
          <SampleLoginNote />
        </form>
      )}
    </main>
  );
}
