// GET /icons/192, /icons/512, /icons/180 -> PNG app icons drawn in code.
// Two overlapping circles: one major plus a second one (다전공).
import { ImageResponse } from "next/og";

const SIZES = [180, 192, 512] as const;

export function generateStaticParams() {
  return SIZES.map((s) => ({ size: String(s) }));
}

export async function GET(_req: Request, ctx: { params: Promise<{ size: string }> }) {
  const size = Number((await ctx.params).size);
  if (!SIZES.includes(size as (typeof SIZES)[number])) return new Response("Not found", { status: 404 });
  const circle = Math.round(size * 0.42);
  const border = Math.max(4, Math.round(size * 0.045));
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#8b1e2d",
        }}
      >
        <div
          style={{
            width: circle,
            height: circle,
            borderRadius: "50%",
            border: `${border}px solid #ffffff`,
            marginRight: -Math.round(circle * 0.32),
          }}
        />
        <div
          style={{
            width: circle,
            height: circle,
            borderRadius: "50%",
            border: `${border}px solid #f5c542`,
            background: "rgba(245, 197, 66, 0.25)",
          }}
        />
      </div>
    ),
    { width: size, height: size },
  );
}
