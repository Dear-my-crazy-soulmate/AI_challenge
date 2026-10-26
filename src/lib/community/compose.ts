// Turning what a student typed into a Post or Comment, or a message saying what to fix.
// Every text goes through the content check (phone numbers, 학번, insults) before it can be saved.
import type { Grade } from "../auth/types";
import { checkPostText } from "../safety/content";
import type { Checked } from "../safety/input";
import { CATEGORIES } from "./schema";
import type { FieldDef } from "./schema";
import { CATEGORY_IDS, INFO_RELATIONS, LIMITS, POST_TYPES } from "./types";
import type { Category, Comment, FieldValue, Post, PostType, Relation } from "./types";

export interface Author {
  primary: string;
  grade: Grade;
}

export interface PostDraft {
  type: PostType;
  dept: string;
  category: Category | null;
  relation: Relation;
  title: string;
  body: string;
  values: Record<string, FieldValue>; // keyed by the schema field keys of the category
}

const fail = (message: string): Checked<never> => ({ ok: false, message });

const text = (raw: string, max: number, label: string, required: boolean): Checked<string> => {
  const r = checkPostText(raw, max, label);
  if (r.ok && required && r.value === "") return fail(`${label}을(를) 적어 주세요.`);
  return r;
};

/** One schema field -> its clean value (undefined when it was left empty and is optional). */
function checkField(def: FieldDef, raw: FieldValue | undefined, knownDepts: string[]): Checked<FieldValue | undefined> {
  const empty = raw === undefined || raw === "" || (Array.isArray(raw) && raw.length === 0);
  if (empty) return def.required ? fail(`${def.label}을(를) 입력해 주세요.`) : { ok: true, value: undefined };
  switch (def.kind) {
    case "text":
    case "long": {
      if (typeof raw !== "string") return fail(`${def.label}을(를) 다시 확인해 주세요.`);
      const r = text(raw, def.kind === "long" ? LIMITS.long : LIMITS.text, def.label, def.required === true);
      return r.ok ? { ok: true, value: r.value || undefined } : r;
    }
    case "tags": {
      const ok = Array.isArray(raw) && raw.every((t) => def.options?.includes(t));
      return ok ? { ok: true, value: [...new Set(raw as string[])] } : fail(`${def.label}은(는) 목록에서 골라 주세요.`);
    }
    case "choice":
      return typeof raw === "string" && def.options?.includes(raw) ? { ok: true, value: raw } : fail(`${def.label}을(를) 목록에서 골라 주세요.`);
    case "scale":
      return typeof raw === "number" && Number.isInteger(raw) && raw >= 1 && raw <= 4 ? { ok: true, value: raw } : fail(`${def.label}을(를) 골라 주세요.`);
    case "dept":
      return typeof raw === "string" && knownDepts.includes(raw) ? { ok: true, value: raw } : fail(`${def.label}을(를) 목록에서 골라 주세요.`);
  }
}

export function buildPost(d: PostDraft, author: Author, knownDepts: string[], id: string, now: Date): Checked<Post> {
  if (!POST_TYPES.includes(d.type)) return fail("글 종류를 골라 주세요.");
  if (!knownDepts.includes(d.dept)) return fail("어떤 학과 이야기인지 목록에서 골라 주세요.");
  if (d.category !== null && !CATEGORY_IDS.includes(d.category)) return fail("항목을 다시 골라 주세요.");
  const isInfo = d.type === "info";
  if (isInfo && d.category === null) return fail("어떤 내용인지 항목을 골라 주세요.");
  if (isInfo && !INFO_RELATIONS.includes(d.relation)) return fail("학과 정보는 이 학과를 다녀 본 학생만 쓸 수 있어요. 궁금한 점은 질문으로 남겨 주세요.");

  const title = text(d.title, LIMITS.title, "제목", true);
  if (!title.ok) return title;
  const body = text(d.body, LIMITS.body, "내용", !isInfo); // a question needs words; an info post can rest on its fields
  if (!body.ok) return body;

  const fields: Record<string, FieldValue> = {};
  if (isInfo && d.category) {
    for (const def of CATEGORIES[d.category].fields) {
      const v = checkField(def, d.values[def.key], knownDepts);
      if (!v.ok) return v;
      if (v.value !== undefined) fields[def.key] = v.value;
    }
  }
  return {
    ok: true,
    value: {
      id, type: d.type, dept: d.dept, category: d.category, title: title.value, body: body.value, fields,
      badge: { primary: author.primary, grade: author.grade, relation: d.relation },
      createdAt: now.toISOString(), is_sample: false,
    },
  };
}

export function buildComment(postId: string, raw: string, author: Author, id: string, now: Date): Checked<Comment> {
  const body = text(raw, LIMITS.comment, "댓글", true);
  if (!body.ok) return body;
  return { ok: true, value: { id, postId, body: body.value, badge: { primary: author.primary, grade: author.grade }, createdAt: now.toISOString(), is_sample: false } };
}
