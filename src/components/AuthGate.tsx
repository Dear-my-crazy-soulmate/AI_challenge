"use client";

// The service starts at the login screen: every page except /login and /signup needs a signed-in
// user, and after signing in the student lands on the page they first opened (?next=).
// The tab bar appears only once someone is signed in.
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import type { ReactNode } from "react";

import TabBar from "@/components/TabBar";
import { useAuth } from "@/lib/auth";

const OPEN = ["/login", "/signup"];

/** Where to go after signing in: only a path inside this app. */
export function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !OPEN.some((p) => next.startsWith(p)) ? next : "/";
}

export default function AuthGate({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { ready, signedIn } = useAuth();
  const open = OPEN.includes(path);

  useEffect(() => {
    if (ready && !signedIn && !open) {
      router.replace(`/login?next=${encodeURIComponent(path + window.location.search)}`);
    }
  }, [ready, signedIn, open, path, router]);

  if (open) {
    return (
      <>
        {children}
        {signedIn && <TabBar />}
      </>
    );
  }
  if (!ready || !signedIn) {
    return (
      <p role="status" className="px-[22px] pt-10 text-sm text-mute">
        {ready ? "로그인 화면으로 이동하는 중…" : "불러오는 중…"}
      </p>
    );
  }
  return (
    <>
      {children}
      <TabBar />
    </>
  );
}
