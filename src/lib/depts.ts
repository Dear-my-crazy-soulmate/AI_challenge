// Department list for the sign-up and profile pickers, from the credit overview.
import type { CreditData } from "./rules/credits";
import { trackOf } from "./rules/majorRules";
import type { MajorRules } from "./rules/majorRules";

export interface DeptOption {
  dept: string;
  college: string;
  single: boolean; // can be a 본전공 (runs a single major)
  school?: string; // set when this major is a track of a 학부 (기계공학부 등)
  trackNote?: string; // when a track is chosen
}

export function listDepts(data: CreditData, rules: MajorRules): DeptOption[] {
  return data.depts.map((d) => {
    const t = trackOf(d.dept, rules);
    return {
      dept: d.dept,
      college: d.college,
      single: d.programs.single.available === true,
      ...(t ? { school: t.school, trackNote: t.choose } : {}),
    };
  });
}
