import type { Metadata } from "next";

import MyCourses from "@/components/MyCourses";

export const metadata: Metadata = { title: "내 이수 과목 · 다전공 길잡이" };

export default function MyCoursesPage() {
  return <MyCourses />;
}
