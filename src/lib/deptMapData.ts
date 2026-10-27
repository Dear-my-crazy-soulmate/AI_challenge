// The curated 2026 data the 학과 지도 is built from, shaped for src/lib/deptMap.ts.
// Relative imports (no "@/") so the tests can load it too.
import courses from "../../data/curated/2026/courses.json";
import microdegrees from "../../data/curated/2026/microdegrees.json";
import credits from "../../data/curated/credits_global.json";
import aiRequirements from "../../data/curated/requirements/인공지능학과.json";
import type { MapDept, MapMicrodegree } from "./deptMap";

export const mapDepts: MapDept[] = (credits as { dept: string; college: string }[]).map(({ dept, college }) => ({ dept, college }));

export const catalogs: Record<string, string[]> = Object.fromEntries(
  Object.entries((courses as { depts: Record<string, { catalog: { name: string }[] }> }).depts).map(([d, v]) => [d, v.catalog.map((c) => c.name)]),
);
// 인공지능학과 is missing from courses.json, so its courses come from its own requirements file
const ai = (aiRequirements as { requirements: { kind: string; groups: { courses: string[] }[] }[] }).requirements.find((r) => r.kind === "single");
if (ai) catalogs[aiRequirements.dept] = ai.groups.flatMap((g) => g.courses);

export const mapMicrodegrees: MapMicrodegree[] = (
  microdegrees as { microdegrees: { name: string; dept: string; courses: { offered_by: string | null }[] }[] }
).microdegrees.map((m) => ({
  name: m.name,
  host: m.dept,
  from: m.courses.map((c) => c.offered_by).filter((x): x is string => !!x),
}));

export const mapAsOf = (courses as { as_of: string }).as_of;
