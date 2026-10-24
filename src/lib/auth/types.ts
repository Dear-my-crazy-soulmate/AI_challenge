// Login for the app. Components only talk to AuthService, so the stand-in in mock.ts can be
// replaced by Supabase Auth (PLAN Step 3) without touching any screen.

/** What we keep about a user besides the login itself: department names only.
 * Never a student number, a name or a phone number (CLAUDE.md rule 4). */
export interface Profile {
  primary: string; // 본전공 (department name from credits_global.json)
  interests: string[]; // 관심 있는 다전공·부전공 후보, at most MAX_INTERESTS
  avatar: string | null; // department the profile character belongs to; null = none chosen yet
}

export const MAX_INTERESTS = 5;

export type AuthResult = { ok: true } | { ok: false; message: string };

export interface AuthState {
  signedIn: boolean;
  profile: Profile | null;
}

export interface AuthService {
  /** Stable string that changes whenever the state changes (for useSyncExternalStore). */
  getSnapshot(): string;
  subscribe(onChange: () => void): () => void;
  /** Parse a snapshot into state. */
  parse(snapshot: string): AuthState;
  signUp(email: string, password: string, profile: Profile): Promise<AuthResult>;
  signIn(email: string, password: string): Promise<AuthResult>;
  signOut(): void;
  saveProfile(profile: Profile): AuthResult;
}
