// GET /icons/192, /icons/512, /icons/180 -> PNG app icons drawn in code.
// Two overlapping circles (ink + accent red): one major plus a second one (다전공).
import { ImageResponse } from "next/og";

const SIZES = [180, 192, 512] as const;

export function generateStaticParams() {
  return SIZES.map((s) => ({ size: String(s) }));
}

export async function GET(_req: Request, ctx: { params: Promise<{ size: string }> }) {
  const size = Number((await ctx.params).size);
  if (!SIZES.includes(size as (typeof SIZES)[number])) return new Response("Not found", { status: 404 });
  const circle = Math.round(size * 0.4);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f3ee",
        }}
      >
        <div
          style={{
            width: circle,
            height: circle,
            borderRadius: "50%",
            background: "#1c1b18",
            marginRight: -Math.round(circle * 0.35),
          }}
        />
        <div
          style={{
            width: circle,
            height: circle,
            borderRadius: "50%",
            background: "rgba(179, 53, 43, 0.9)",
          }}
        />
      </div>
    ),
    { width: size, height: size },
  );
}
