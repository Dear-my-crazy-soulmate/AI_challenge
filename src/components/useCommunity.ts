"use client";

import { useMemo, useSyncExternalStore } from "react";

import seed from "../../data/seed/community_sample.json";
import { isComment, isPost, mergeWithSeed, parseStored, readRaw, subscribe } from "@/lib/community/local";
import type { Stored } from "@/lib/community/local";

const SEED: Stored = {
  posts: (seed.posts as unknown[]).filter(isPost),
  comments: (seed.comments as unknown[]).filter(isComment),
};

/** Sample posts plus what this browser wrote. The same on the server and in the first render. */
export function useCommunity(): Stored {
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  return useMemo(() => mergeWithSeed(SEED, parseStored(raw)), [raw]);
}
