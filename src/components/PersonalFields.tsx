"use client";

import { Field } from "@/components/Field";
import { GRADES, MAX_NAME } from "@/lib/auth/types";
import type { Grade } from "@/lib/auth/types";

export interface Personal {
  name: string;
  studentId: string;
  grade: Grade;
}

/** 이름·학번 (both optional) and 학년. Shared by the sign-up form and the MY editor. */
export default function PersonalFields({ value, onChange }: { value: Personal; onChange: (next: Personal) => void }) {
  return (
    <div className="flex flex-col gap-3.5">
      <div className="grid grid-cols-2 gap-2.5">
        <Field
          label="이름 (선택)"
          autoComplete="off"
          maxLength={MAX_NAME}
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          placeholder="김경희"
        />
        <div className="flex flex-col gap-2 text-sm font-semibold">
          학년
          <div role="radiogroup" aria-label="학년" className="grid h-12 grid-cols-4 gap-1 rounded-xl bg-sand-2 p-1">
            {GRADES.map((g) => {
              const on = value.grade === g;
              return (
                <button
                  key={g}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => onChange({ ...value, grade: g })}
                  className={`flex items-center justify-center rounded-[10px] text-[15px] font-bold ${
                    on ? "bg-white text-ink shadow-[0_1px_3px_rgba(0,0,0,.12)]" : "text-mute"
                  }`}
                >
                  {g}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <Field
        label="학번 (선택)"
        inputMode="numeric"
        autoComplete="off"
        maxLength={10}
        value={value.studentId}
        onChange={(e) => onChange({ ...value, studentId: e.target.value.replace(/\D/g, "") })}
        placeholder="2026100123"
      />
    </div>
  );
}
