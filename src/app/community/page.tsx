import type { Metadata } from "next";

import CommunityHome from "@/components/CommunityHome";

export const metadata: Metadata = { title: "커뮤니티 · 다전공 길잡이" };

export default function CommunityPage() {
  return <CommunityHome />;
}
