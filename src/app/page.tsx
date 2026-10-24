import Link from "next/link";

const FEATURES = [
  {
    href: "/onboarding",
    title: "전공 조합 계획",
    text: "본전공과 희망 다전공·부전공·마이크로디그리를 고르면 필요한 학점과 과목을 알려 줍니다.",
    ready: true,
  },
  { href: null, title: "AI 전공 체험", text: "관심 전공의 입문 문제를 풀고 피드백을 받습니다.", ready: false },
  { href: null, title: "전공 후기", text: "선배들의 다전공 경험과 질문을 모아 봅니다.", ready: false },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pb-10 pt-[max(2.5rem,env(safe-area-inset-top))]">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-medium text-[#8b1e2d] dark:text-[#f5c542]">경희대 국제캠퍼스 · 2026학년도</p>
        <h1 className="text-3xl font-semibold">다전공 탐색</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          2026학번부터는 다전공·부전공·마이크로디그리 중 하나를 꼭 이수해야 합니다. 나에게 맞는 조합을 찾아보세요.
        </p>
      </header>

      <Link
        href="/onboarding"
        className="rounded-xl bg-[#8b1e2d] px-5 py-4 text-center text-base font-semibold text-white active:opacity-90"
      >
        내 전공 조합 계획하기
      </Link>

      <ul className="flex flex-col gap-3">
        {FEATURES.map((f) => {
          const body = (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{f.title}</span>
                {!f.ready && (
                  <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    준비 중
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{f.text}</p>
            </>
          );
          return (
            <li key={f.title}>
              {f.href ? (
                <Link href={f.href} className="block rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
                  {body}
                </Link>
              ) : (
                <div className="rounded-xl border border-dashed border-zinc-200 p-4 opacity-70 dark:border-zinc-800">
                  {body}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <p className="mt-auto text-xs text-zinc-500">
        휴대폰 브라우저 메뉴의 &ldquo;홈 화면에 추가&rdquo;로 앱처럼 설치할 수 있습니다. 졸업요건은 학과 공식 안내로 최종
        확인하세요.
      </p>
    </main>
  );
}
