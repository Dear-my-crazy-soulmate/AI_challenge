"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";

import Avatar from "@/components/Avatar";
import DeptPicker from "@/components/DeptPicker";
import { ErrorNote, Field, SampleLoginNote, primaryButton } from "@/components/Field";
import PersonalFields from "@/components/PersonalFields";
import type { Personal } from "@/components/PersonalFields";
import ScreenHeader from "@/components/ScreenHeader";
import { useAuth } from "@/lib/auth";
import { MAX_INTERESTS } from "@/lib/auth/types";
import type { DeptOption } from "@/lib/depts";
import { checkEmail, checkPassword, checkProfile } from "@/lib/safety/input";

/** Sign up in two steps: account (email + password), then 학과 정보 (본전공 + 관심 전공). */
export default function SignupForm({ depts }: { depts: DeptOption[] }) {
  const router = useRouter();
  const { auth, ready, signedIn } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [primary, setPrimary] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [personal, setPersonal] = useState<Personal>({ name: "", studentId: "", grade: 1 });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  function next(e: FormEvent) {
    e.preventDefault();
    const mail = checkEmail(email);
    if (!mail.ok) return setError(mail.message);
    const pw = checkPassword(password);
    if (!pw.ok) return setError(pw.message);
    if (password !== again) return setError("비밀번호가 서로 달라요.");
    setError("");
    setStep(2);
    window.scrollTo({ top: 0 });
  }

  async function finish() {
    const mail = checkEmail(email);
    const pw = checkPassword(password);
    if (!mail.ok || !pw.ok) return setStep(1);
    const main = primary[0] ?? "";
    // The profile character follows the major until the user can pick another one.
    const profile = checkProfile({ primary: main, interests, avatar: main || null, ...personal }, depts.map((d) => d.dept));
    if (!profile.ok) return setError(profile.message);
    setBusy(true);
    const r = await auth.signUp(mail.value, pw.value, profile.value);
    setBusy(false);
    if (!r.ok) {
      setError(r.message);
      return setStep(1);
    }
    // e.g. the server sent a confirmation mail: stay here and say what to do next
    if (r.notice) return setNotice(r.notice);
    router.push("/");
  }

  if (notice) {
    return (
      <main className="flex flex-col gap-5 px-[22px] pb-8 pt-[max(6px,env(safe-area-inset-top))]">
        <ScreenHeader title="가입하기" />
        <h2 className="text-2xl font-bold leading-[1.35] tracking-[-0.6px]">거의 다 됐어요</h2>
        <p className="text-[15px] leading-[1.55] text-ink-2">{notice}</p>
        <Link href="/login" className={primaryButton}>
          로그인하러 가기
        </Link>
      </main>
    );
  }

  if (ready && signedIn) {
    return (
      <main className="flex flex-col gap-5 px-[22px] pb-8 pt-[max(6px,env(safe-area-inset-top))]">
        <ScreenHeader title="가입하기" />
        <h2 className="text-2xl font-bold leading-[1.35] tracking-[-0.6px]">이미 로그인되어 있어요</h2>
        <Link href="/profile" className={primaryButton}>
          내 정보 보기
        </Link>
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-5 px-[22px] pb-8 pt-[max(6px,env(safe-area-inset-top))]">
      <ScreenHeader
        title="가입하기"
        right={`${step}/2`}
        backHref="/login"
        onBack={
          step === 2
            ? () => {
                setError("");
                setStep(1);
              }
            : undefined
        }
      />
      <div className="-mt-2.5 grid grid-cols-2 gap-1.5" aria-hidden>
        {[1, 2].map((i) => (
          <div key={i} className={`h-1 rounded-sm transition-colors duration-300 ${step >= i ? "bg-accent" : "bg-chip"}`} />
        ))}
      </div>

      {step === 1 ? (
        <form onSubmit={next} noValidate className="flex flex-col gap-4">
          <h2 className="text-2xl font-bold leading-[1.35] tracking-[-0.6px]">
            계정을
            <br />
            만들어 볼까요?
          </h2>
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
            label="비밀번호 (8자 이상)"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Field
            label="비밀번호 확인"
            type="password"
            autoComplete="new-password"
            value={again}
            onChange={(e) => setAgain(e.target.value)}
          />
          <ErrorNote message={error} />
          <button type="submit" className={primaryButton}>
            다음
          </button>
          <p className="text-center text-sm text-mute">
            이미 계정이 있나요?{" "}
            <Link href="/login" className="font-semibold text-accent">
              로그인
            </Link>
          </p>
          <SampleLoginNote />
        </form>
      ) : (
        <div className="flex flex-col gap-5">
          <h2 className="text-2xl font-bold leading-[1.35] tracking-[-0.6px]">
            어느 학과에
            <br />
            다니고 있나요?
          </h2>
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
            label="관심 있는 전공 (선택)"
            hint="다전공·부전공으로 눈여겨보는 학과예요. 나중에 바꿀 수 있어요."
            options={depts.filter((d) => d.dept !== primary[0])}
            selected={interests}
            max={MAX_INTERESTS}
            onChange={setInterests}
          />
          {primary[0] && (
            <section className="flex items-center gap-4 rounded-3xl border border-edge bg-white p-4" aria-label="내 캐릭터 미리보기">
              <Avatar dept={primary[0]} size={120} variant="full" />
              <div className="flex flex-col gap-1">
                <span className="text-[15px] font-bold">내 캐릭터</span>
                <span className="text-pretty text-xs leading-normal text-mute">
                  {primary[0]}에 맞춘 쿠옹이가 기본 프로필이 돼요. 다전공·부전공을 정하면 모습이 바뀌어요.
                </span>
              </div>
            </section>
          )}
          <ErrorNote message={error} />
          <button type="button" onClick={finish} disabled={busy || primary.length === 0} className={primaryButton}>
            {busy ? "만드는 중…" : "가입 완료"}
          </button>
          <SampleLoginNote />
        </div>
      )}
    </main>
  );
}
