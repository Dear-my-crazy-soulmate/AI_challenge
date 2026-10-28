"use client";

import { useMemo, useSyncExternalStore } from "react";

import seed from "../../data/seed/community_sample.json";
import { isComment, isPost, mergeWithSeed, parseStored, readRaw, sampleComments, subscribe as subscribeDevice } from "@/lib/community/local";
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

const SAMPLE_IDS = new Set(SEED.posts.map((p) => p.id));
let deviceStore: CommunityStore | null = null;

/** Where a comment on this post is saved. The server does not have the sample posts (it would
 * refuse the comment), so comments on them stay on this device and show only here. */
export function commentStoreFor(postId: string): CommunityStore {
  const main = getCommunityStore();
  if (main.kind === "device" || !SAMPLE_IDS.has(postId)) return main;
  deviceStore ??= createLocalStore();
  return deviceStore;
}
export const isSamplePost = (postId: string) => SAMPLE_IDS.has(postId);

const subscribe = (onChange: () => void) => getCommunityStore().subscribe(onChange);
const snapshot = () => getCommunityStore().getSnapshot();
const deviceSnapshot = () => readRaw() ?? "{}";

/** Sample posts plus everyone's posts (server) or this browser's posts (stand-in).
 * `loading` is true until the first server answer, so screens do not flash "no posts". */
export function useCommunity(): Stored & { loading: boolean } {
  const raw = useSyncExternalStore(subscribe, snapshot, () => "");
  const device = useSyncExternalStore(subscribeDevice, deviceSnapshot, () => "{}");
  return useMemo(() => {
    const s = getCommunityStore();
    const merged = mergeWithSeed(SEED, s.parse(raw));
    // with the server, this device still keeps the comments on sample posts
    const extra = s.kind === "server" ? sampleComments(parseStored(device), SAMPLE_IDS) : [];
    return { posts: merged.posts, comments: [...merged.comments, ...extra], loading: s.kind === "server" && raw === "" };
  }, [raw, device]);
}
