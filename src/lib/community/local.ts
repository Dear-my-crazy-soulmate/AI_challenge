// Where community posts live for now: this browser only (no server yet). Sample posts from
// data/seed/community_sample.json are merged in on read and are never written to storage.
// When Supabase is connected, this file is the one to swap (screens use useCommunity only).
import { GRADES } from "../auth/types";
import { CATEGORY_IDS, POST_TYPES } from "./types";
import type { Comment, Post } from "./types";

// v2: posts are now about a department (v1 posts were multi-major reviews and are simply ignored)
export const COMMUNITY_KEY = "community.v2";
const CHANGE_EVENT = "communitychange"; // 'storage' does not fire in the tab that wrote

export interface Stored {
  posts: Post[];
  comments: Comment[];
}

const isBadge = (b: unknown): boolean => {
  const x = b as Partial<Post["badge"]> | null;
  return !!x && typeof x.primary === "string" && GRADES.includes(x.grade as never);
};

export const isPost = (p: unknown): p is Post => {
  const x = p as Partial<Post> | null;
  return (
    !!x &&
    typeof x.id === "string" &&
    POST_TYPES.includes(x.type as never) &&
    typeof x.dept === "string" &&
    (x.category === null || CATEGORY_IDS.includes(x.category as never)) &&
    typeof x.title === "string" &&
    typeof x.body === "string" &&
    typeof x.createdAt === "string" &&
    !!x.fields &&
    typeof x.fields === "object" &&
    isBadge(x.badge) &&
    (x.type !== "info" || x.category !== null)
  );
};

export const isComment = (c: unknown): c is Comment => {
  const x = c as Partial<Comment> | null;
  return !!x && typeof x.id === "string" && typeof x.postId === "string" && typeof x.body === "string" && typeof x.createdAt === "string" && isBadge(x.badge);
};

export function parseStored(raw: string | null): Stored {
  try {
    const v = JSON.parse(raw ?? "{}") as Partial<Stored>;
    return {
      posts: Array.isArray(v.posts) ? v.posts.filter(isPost) : [],
      comments: Array.isArray(v.comments) ? v.comments.filter(isComment) : [],
    };
  } catch {
    return { posts: [], comments: [] };
  }
}

/** Order does not matter here: filterPosts sorts by time. */
export const mergeWithSeed = (seed: Stored, mine: Stored): Stored => ({
  posts: [...mine.posts, ...seed.posts],
  comments: [...mine.comments, ...seed.comments],
});

/** Comments kept on this device for the sample posts, which the server does not have. */
export const sampleComments = (device: Stored, sampleIds: ReadonlySet<string>): Comment[] =>
  device.comments.filter((c) => sampleIds.has(c.postId));

export const withPost = (s: Stored, post: Post): Stored => ({ ...s, posts: [...s.posts, { ...post, mine: true }] });
export const withComment = (s: Stored, c: Comment): Stored => ({ ...s, comments: [...s.comments, { ...c, mine: true }] });
/** Only your own posts can be removed; their comments go with them. */
export const withoutPost = (s: Stored, id: string): Stored => ({
  posts: s.posts.filter((p) => p.id !== id),
  comments: s.comments.filter((c) => c.postId !== id),
});
export const withoutComment = (s: Stored, id: string): Stored => ({ ...s, comments: s.comments.filter((c) => c.id !== id) });

export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function readRaw(): string | null {
  try {
    return localStorage.getItem(COMMUNITY_KEY);
  } catch {
    return null;
  }
}

export function update(change: (s: Stored) => Stored): boolean {
  try {
    localStorage.setItem(COMMUNITY_KEY, JSON.stringify(change(parseStored(readRaw()))));
    window.dispatchEvent(new Event(CHANGE_EVENT));
    return true;
  } catch {
    return false; // private mode or blocked storage
  }
}

export function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}
