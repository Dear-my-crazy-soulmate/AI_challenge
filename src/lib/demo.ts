// The shared 심사·체험용 account shown on the login screen. Its email and password are public on
// purpose (judges sign in with them), so they live in NEXT_PUBLIC_ variables set on Vercel, not in code.
// Without both variables nothing is shown.

export interface DemoAccount {
  email: string;
  password: string;
}

export function demoAccount(
  email = process.env.NEXT_PUBLIC_DEMO_EMAIL,
  password = process.env.NEXT_PUBLIC_DEMO_PASSWORD,
): DemoAccount | null {
  const e = email?.trim();
  return e && password ? { email: e, password } : null;
}

/** True for the shared account: its email, password and existence must not be changed by a visitor. */
export function isDemoEmail(email: string | null | undefined, demo: DemoAccount | null = demoAccount()): boolean {
  return !!demo && !!email && email.trim().toLowerCase() === demo.email.toLowerCase();
}
