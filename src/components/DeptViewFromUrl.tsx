"use client";

import { useSearchParams } from "next/navigation";

import DeptView from "@/components/DeptView";
import type { DeptOption } from "@/lib/depts";

/** /community/dept?name=컴퓨터공학과 (the page stays static, so the name is read in the browser) */
export default function DeptViewFromUrl({ depts }: { depts: DeptOption[] }) {
  return <DeptView depts={depts} name={useSearchParams().get("name")} />;
}
