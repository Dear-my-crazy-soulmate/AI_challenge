import type { Metadata } from "next";

import LoginForm from "@/components/LoginForm";

export const metadata: Metadata = { title: "로그인 · 다전공 길잡이" };

export default function LoginPage() {
  return <LoginForm />;
}
