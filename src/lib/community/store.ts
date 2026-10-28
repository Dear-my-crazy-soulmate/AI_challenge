// Where community posts are kept. Screens use getCommunityStore() / useCommunity only, so the
// in-browser stand-in (local.ts) and Supabase (supabase/migrations/0002_community_and_taken.sql)
// are interchangeable.
import type { SupabaseClient } from "@supabase/supabase-js";

import { isComment, isPost, parseStored, readRaw, subscribe as subscribeLocal, update, withComment, withPost, withoutComment, withoutPost } from "./local";
import type { Stored } from "./local";
import type { Comment, Post } from "./types";

export type WriteResult = { ok: true } | { ok: false; message: string };

export interface CommunityStore {
  readonly kind: "server" | "device";
  /** Stable string for useSyncExternalStore; "" while the first load is running. */
  getSnapshot(): string;
  subscribe(onChange: () => void): () => void;
  parse(snapshot: string): Stored;
  addPost(post: Post): Promise<WriteResult>;
  addComment(comment: Comment): Promise<WriteResult>;
  deletePost(id: string): Promise<WriteResult>;
  deleteComment(id: string): Promise<WriteResult>;
}

const BLOCKED = "이 브라우저에서는 저장할 수 없어요. 시크릿 모드를 끄고 다시 시도해 주세요.";

export function createLocalStore(): CommunityStore {
  const write = async (change: (s: Stored) => Stored): Promise<WriteResult> =>
    update(change) ? { ok: true } : { ok: false, message: BLOCKED };
  return {
    kind: "device",
    getSnapshot: () => readRaw() ?? "{}",
    subscribe: subscribeLocal,
    parse: parseStored,
    addPost: (p) => write((s) => withPost(s, p)),
    addComment: (c) => write((s) => withComment(s, c)),
    deletePost: (id) => write((s) => withoutPost(s, id)),
    deleteComment: (id) => write((s) => withoutComment(s, id)),
  };
}

interface PostRow {
  id: string;
  type: string;
  dept: string;
  category: string | null;
  title: string;
  body: string;
  fields: Record<string, unknown> | null;
  badge: unknown;
  created_at: string;
  mine: boolean | null;
}
interface CommentRow {
  id: string;
  post_id: string;
  body: string;
  badge: unknown;
  created_at: string;
  mine: boolean | null;
}

/** Server rows -> the app's Post / Comment shape; anything malformed is dropped. */
export function fromServer(posts: PostRow[], comments: CommentRow[]): Stored {
  const p = posts
    .map((r) => ({
      id: r.id,
      type: r.type,
      dept: r.dept,
      category: r.category,
      title: r.title,
      body: r.body,
      fields: r.fields ?? {},
      badge: r.badge,
      createdAt: r.created_at,
      is_sample: false,
      ...(r.mine ? { mine: true } : {}),
    }))
    .filter(isPost);
  const c = comments
    .map((r) => ({
      id: r.id,
      postId: r.post_id,
      body: r.body,
      badge: r.badge,
      createdAt: r.created_at,
      is_sample: false,
      ...(r.mine ? { mine: true } : {}),
    }))
    .filter(isComment);
  return { posts: p, comments: c };
}

const SERVER_FAIL = "서버에 저장하지 못했어요. 로그인 상태와 인터넷 연결을 확인하고 다시 시도해 주세요.";
const REFRESH_MS = 60_000;
const MAX_POSTS = 500;

export function createSupabaseStore(sb: SupabaseClient): CommunityStore {
  const listeners = new Set<() => void>();
  let snapshot = "";
  let timer: ReturnType<typeof setInterval> | null = null;
  let loading: Promise<void> | null = null;

  const publish = (s: Stored) => {
    const next = JSON.stringify(s);
    if (next !== snapshot) {
      snapshot = next;
      listeners.forEach((l) => l());
    }
  };

  function load(): Promise<void> {
    loading ??= (async () => {
      const [posts, comments] = await Promise.all([
        sb.from("community_posts_public").select("*").order("created_at", { ascending: false }).limit(MAX_POSTS),
        sb.from("community_comments_public").select("*").order("created_at", { ascending: true }),
      ]);
      // keep what we had when the network fails; an empty list would look like "all posts deleted"
      if (!posts.error && !comments.error) publish(fromServer((posts.data ?? []) as PostRow[], (comments.data ?? []) as CommentRow[]));
      else if (snapshot === "") publish({ posts: [], comments: [] });
    })().finally(() => {
      loading = null;
    });
    return loading;
  }

  const onFocus = () => void load();
  // a sign-in or sign-out changes which rows are "mine"
  sb.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_IN" || event === "SIGNED_OUT") setTimeout(() => void load(), 0);
  });

  async function after(error: { message?: string } | null): Promise<WriteResult> {
    if (error) return { ok: false, message: SERVER_FAIL };
    await load();
    return { ok: true };
  }

  return {
    kind: "server",
    getSnapshot() {
      if (snapshot === "" && !loading) void load();
      return snapshot;
    },
    subscribe(onChange) {
      listeners.add(onChange);
      if (listeners.size === 1 && typeof window !== "undefined") {
        window.addEventListener("focus", onFocus);
        timer = setInterval(() => void load(), REFRESH_MS);
      }
      return () => {
        listeners.delete(onChange);
        if (listeners.size === 0 && typeof window !== "undefined") {
          window.removeEventListener("focus", onFocus);
          if (timer) clearInterval(timer);
          timer = null;
        }
      };
    },
    parse: (s) => (s === "" ? { posts: [], comments: [] } : parseStored(s)),
    async addPost(p) {
      const { error } = await sb.from("community_posts").insert({
        id: p.id,
        type: p.type,
        dept: p.dept,
        category: p.category,
        title: p.title,
        body: p.body,
        fields: p.fields,
        badge: p.badge,
      });
      return after(error);
    },
    async addComment(c) {
      const { error } = await sb.from("community_comments").insert({ id: c.id, post_id: c.postId, body: c.body, badge: c.badge });
      return after(error);
    },
    async deletePost(id) {
      const { error } = await sb.from("community_posts").delete().eq("id", id);
      return after(error);
    },
    async deleteComment(id) {
      const { error } = await sb.from("community_comments").delete().eq("id", id);
      return after(error);
    },
  };
}
