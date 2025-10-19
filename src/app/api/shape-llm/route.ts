import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

type Body = {
  message: string;
  viewport: { x: number; y: number; w: number; h: number };
  shapeHint?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    const { viewport } = body ?? {};
    // For first version, return a reasonable default centered in viewport
    const defaultW = body.shapeHint === "circle" ? 160 : 200;
    const defaultH = body.shapeHint === "circle" ? 160 : 120;

    const x = Math.round(viewport.x + viewport.w / 2 - defaultW / 2);
    const y = Math.round(viewport.y + viewport.h / 2 - defaultH / 2);

    return new Response(JSON.stringify({ x, y, w: defaultW, h: defaultH }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}


