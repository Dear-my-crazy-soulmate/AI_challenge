// Department list for the sign-up and profile pickers, from the credit overview.
import type { CreditData } from "./rules/credits";

export interface DeptOption {
  dept: string;
  college: string;
  single: boolean; // can be a 본전공 (runs a single major)
}

export function listDepts(data: CreditData): DeptOption[] {
  return data.depts.map((d) => ({ dept: d.dept, college: d.college, single: d.programs.single.available === true }));
}
