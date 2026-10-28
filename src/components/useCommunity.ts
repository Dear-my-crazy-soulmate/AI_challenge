"use client";

import { useMemo, useSyncExternalStore } from "react";

import seed from "../../data/seed/community_sample.json";
import { isComment, isPost, mergeWithSeed } from "@/lib/community/local";
import type { Stored } from "@/lib/community/local";
import { createLocalStore, createSupabaseStore } from "@/lib/community/store";
import type { CommunityStore } from "@/lib/community/store";
import { getSupabase } from "@/lib/supabase/client";

const SEED: Stored = {
  posts: (seed.posts as unknown[]).filter(isPost),
  comments: (seed.comments as unknown[]).filter(isComment),
};

let store: CommunityStore | null = null;
/** Supabase when it is configured (posts shared by everyone), otherwise this browser only. */
export function getCommunityStore(): CommunityStore {
  if (!store) {
    const sb = getSupabase();
    store = sb ? createSupabaseStore(sb) : createLocalStore();
  }
  return store;
}

const subscribe = (onChange: () => void) => getCommunityStore().subscribe(onChange);
const snapshot = () => getCommunityStore().getSnapshot();

/** Sample posts plus everyone's posts (server) or this browser's posts (stand-in).
 * `loading` is true until the first server answer, so screens do not flash "no posts". */
export function useCommunity(): Stored & { loading: boolean } {
  const raw = useSyncExternalStore(subscribe, snapshot, () => "");
  return useMemo(() => {
    const s = getCommunityStore();
    return { ...mergeWithSeed(SEED, s.parse(raw)), loading: s.kind === "server" && raw === "" };
  }, [raw]);
}
