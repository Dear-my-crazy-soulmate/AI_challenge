import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

export const primaryButton =
  "box-border flex h-[54px] w-full items-center justify-center rounded-2xl bg-ink text-base font-bold text-paper active:opacity-90 disabled:bg-chip disabled:text-faint";
export const secondaryButton =
  "box-border flex h-[50px] w-full items-center justify-center rounded-2xl border border-line bg-card text-[15px] font-semibold";

/** Labelled text input in the app's style (16px text so phones do not zoom in). */
export function Field({ label, ...props }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-2 text-sm font-semibold">
      {label}
      <input
        {...props}
        className="h-12 rounded-[14px] border border-line bg-card px-3.5 text-base font-normal outline-none focus:border-ink"
      />
    </label>
  );
}

/** Labelled multi-line input, same look as Field. */
export function Area({ label, hint, ...props }: { label: string; hint?: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="flex flex-col gap-2 text-sm font-semibold">
      {label}
      {hint && <span className="-mt-1 text-xs font-normal text-mute">{hint}</span>}
      <textarea
        {...props}
        className="min-h-24 resize-y rounded-[14px] border border-line bg-card px-3.5 py-3 text-base font-normal leading-normal outline-none focus:border-ink"
      />
    </label>
  );
}

/** Reminder shown on every login screen: this login is a stand-in (CLAUDE.md rule 6). */
export function SampleLoginNote() {
  return (
    <p className="flex items-start gap-2 text-xs leading-normal text-mute">
      <span className="flex-none rounded-md bg-sand-2 px-[7px] py-0.5 font-semibold text-ink-2">예시 로그인</span>
      <span>
        지금은 시연용이라 이 기기의 브라우저에만 저장돼요. 이름·학번은 넣고 싶을 때만 적고, AI에는 보내지 않아요. 연락처는 받지
        않아요.
      </span>
    </p>
  );
}

export function ErrorNote({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-[14px] border border-warn/30 bg-warn-soft px-4 py-3 text-sm text-ink">
      {message}
    </p>
  );
}
