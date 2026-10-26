// The fixed fields of each 학과 정보 category. The same definitions drive the write form, the post
// page and the per-department summary, so a new field only needs to be added here.
import type { Category } from "./types";

export type FieldKind = "text" | "long" | "tags" | "choice" | "scale" | "dept";

export interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  options?: readonly string[]; // tags and choice
  hint?: string;
  placeholder?: string;
  required?: boolean;
}

export interface CategoryDef {
  id: Category;
  label: string;
  desc: string;
  fields: readonly FieldDef[];
}

/** 학업 부담, 1..4 */
export const LOAD_LABEL = ["여유로움", "보통", "빠듯함", "매우 힘듦"] as const;

export const CATEGORIES: Record<Category, CategoryDef> = {
  curriculum: {
    id: "curriculum",
    label: "배우는 내용·수업",
    desc: "어떤 과목을 어떤 방식으로 배우는지",
    fields: [
      { key: "courses", label: "대표 과목", kind: "text", required: true, placeholder: "예: 자료구조, 알고리즘", hint: "쉼표로 구분해요" },
      { key: "style", label: "수업 방식", kind: "tags", options: ["강의 중심", "실습 중심", "팀 프로젝트", "발표·토론", "과제가 많음", "시험 중심"] },
      { key: "load", label: "학업 부담", kind: "scale", required: true },
      { key: "tip", label: "알아두면 좋은 점", kind: "long", placeholder: "수업을 들을 때의 팁이나 주의점" },
    ],
  },
  culture: {
    id: "culture",
    label: "학과 분위기·문화",
    desc: "사람들과 분위기, 행사",
    fields: [
      { key: "vibe", label: "분위기 키워드", kind: "tags", required: true, options: ["조용한", "활발한", "친목 중심", "자유로운", "성적 경쟁", "협력적", "선후배 가까움", "개인주의"] },
      { key: "events", label: "행사·모임", kind: "text", placeholder: "예: 개강 총회, 학과 MT, 스터디" },
      { key: "people", label: "선후배·친구 관계", kind: "long", placeholder: "학생 수나 선후배 사이는 어떤지" },
    ],
  },
  clubs: {
    id: "clubs",
    label: "동아리·학회",
    desc: "학과와 이어진 동아리와 학회",
    fields: [
      { key: "name", label: "동아리·학회 이름", kind: "text", required: true },
      { key: "kind", label: "종류", kind: "choice", required: true, options: ["학과 동아리", "학회·스터디", "중앙 동아리", "연합 동아리"] },
      { key: "activity", label: "하는 일", kind: "long", required: true, placeholder: "정기 모임, 대회, 프로젝트 등" },
      { key: "join", label: "가입 방법·시기", kind: "text", placeholder: "예: 학기 초 모집" },
    ],
  },
  career: {
    id: "career",
    label: "진로·취업·대학원",
    desc: "졸업 후 어디로 가는지",
    fields: [
      { key: "paths", label: "졸업 후 진로", kind: "text", required: true, placeholder: "예: 개발자, 연구원" },
      { key: "fields", label: "취업 분야", kind: "tags", options: ["대기업", "중견·중소기업", "공기업·공무원", "연구소", "스타트업", "교직", "대학원", "창업"] },
      { key: "grad", label: "대학원 진학", kind: "choice", options: ["진학하는 사람이 많아요", "진학과 취업이 반반이에요", "대부분 취업해요"] },
    ],
  },
  multimajor: {
    id: "multimajor",
    label: "다전공 경험",
    desc: "이 학과를 다전공·부전공·마이크로디그리로 해 본 경험",
    fields: [
      { key: "partner", label: "함께 한 전공", kind: "dept", required: true },
      { key: "form", label: "이수 형태", kind: "choice", required: true, options: ["다전공", "부전공", "마이크로디그리"] },
      { key: "load", label: "학업 부담", kind: "scale", required: true },
      { key: "tip", label: "해 보니 어땠나요", kind: "long", placeholder: "좋았던 점과 힘들었던 점" },
    ],
  },
};
