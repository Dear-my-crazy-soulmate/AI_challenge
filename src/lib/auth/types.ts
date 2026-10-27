// Login for the app. Components only talk to AuthService, so the stand-in in mock.ts can be
// replaced by Supabase Auth (PLAN Step 3) without touching any screen.

/** What we keep about a user besides the login itself.
 * name and studentId are personal data: the user chose to enter them (an exception to CLAUDE.md rule 4),
 * so they stay in this profile only and never go to an LLM (see forLlm in safety/input.ts). */
export interface Profile {
  primary: string; // 본전공 (department name from credits_global.json)
  interests: string[]; // 관심 있는 다전공·부전공 후보, at most MAX_INTERESTS
  avatar: string | null; // department the profile character belongs to; null = none chosen yet
  grade: Grade;
  name: string; // "" when not given
  studentId: string; // "" when not given, otherwise 10 digits
}

export type Grade = 1 | 2 | 3 | 4;
export const GRADES: readonly Grade[] = [1, 2, 3, 4];
export const MAX_INTERESTS = 5;
export const MAX_NAME = 20;

/** ok with a notice: done, but the user has to act (e.g. click a confirmation mail). */
export type AuthResult = { ok: true; notice?: string } | { ok: false; message: string };

export interface AuthState {
  signedIn: boolean;
  profile: Profile | null;
  email?: string; // set while signed in
}

/** "server": real accounts (Supabase), usable from any device. "device": stand-in kept in this browser. */
export type AuthKind = "server" | "device";

export interface AuthService {
  readonly kind: AuthKind;
  /** Stable string that changes whenever the state changes (for useSyncExternalStore). */
  getSnapshot(): string;
  subscribe(onChange: () => void): () => void;
  /** Parse a snapshot into state. */
  parse(snapshot: string): AuthState;
  signUp(email: string, password: string, profile: Profile): Promise<AuthResult>;
  signIn(email: string, password: string): Promise<AuthResult>;
  signOut(): Promise<void>;
  saveProfile(profile: Profile): Promise<AuthResult>;
  /** Account management. Each asks for the current password again before changing anything. */
  changePassword(currentPassword: string, newPassword: string): Promise<AuthResult>;
  changeEmail(currentPassword: string, newEmail: string): Promise<AuthResult>;
  deleteAccount(currentPassword: string): Promise<AuthResult>;
}
