// 관심 분야 a student can pick (up to MAX_TOPICS). This is the app's own list, not a school fact:
// which departments match a field comes from the book text (data/curated/<year>/dept_topics.json).

export interface Topic {
  id: string;
  label: string;
}

export const TOPICS: readonly Topic[] = [
  { id: "ai-data", label: "AI·데이터" },
  { id: "software", label: "소프트웨어·IT" },
  { id: "electronics", label: "전자·반도체" },
  { id: "mechanics", label: "기계·로봇·모빌리티" },
  { id: "energy-env", label: "에너지·환경" },
  { id: "bio-health", label: "바이오·의료·식품" },
  { id: "chem-materials", label: "화학·소재" },
  { id: "architecture", label: "건축·도시" },
  { id: "business", label: "경영·경제·무역" },
  { id: "global", label: "언어·국제·문화" },
  { id: "media-design", label: "미디어·콘텐츠·디자인" },
  { id: "sports", label: "스포츠·건강" },
];

export const MAX_TOPICS = 3;

export const topicLabel = (id: string): string => TOPICS.find((t) => t.id === id)?.label ?? id;
