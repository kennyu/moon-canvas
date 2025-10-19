import { NextRequest } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

export const dynamic = "force-dynamic";

const ViewportSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  w: z.number().positive().finite(),
  h: z.number().positive().finite(),
});

const RequestSchema = z.object({
  message: z.string().min(1),
  viewport: ViewportSchema,
  shapeHint: z.string().optional(),
});

const PlacementSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  w: z.number().positive().finite(),
  h: z.number().positive().finite(),
});

function centerDefault(viewport: z.infer<typeof ViewportSchema>, shapeHint?: string) {
  const defaultW = shapeHint === "circle" ? 160 : 200;
  const defaultH = shapeHint === "circle" ? 160 : 120;
  const x = Math.round(viewport.x + viewport.w / 2 - defaultW / 2);
  const y = Math.round(viewport.y + viewport.h / 2 - defaultH / 2);
  return { x, y, w: defaultW, h: defaultH };
}

function clampToViewport(viewport: z.infer<typeof ViewportSchema>, box: z.infer<typeof PlacementSchema>) {
  const minSize = 24;
  const maxW = Math.max(minSize, viewport.w);
  const maxH = Math.max(minSize, viewport.h);
  let w = Math.min(Math.max(box.w, minSize), maxW);
  let h = Math.min(Math.max(box.h, minSize), maxH);
  let x = box.x;
  let y = box.y;

  // Ensure box is within viewport; if too large, pin to viewport origin
  if (x < viewport.x) x = viewport.x;
  if (y < viewport.y) y = viewport.y;
  if (x + w > viewport.x + viewport.w) x = viewport.x + viewport.w - w;
  if (y + h > viewport.y + viewport.h) y = viewport.y + viewport.h - h;
  return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
}

export async function POST(req: NextRequest) {
  try {
    const parsed = RequestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { message, viewport, shapeHint } = parsed.data;
    const apiKey = process.env.OPENAI_API_KEY;

    // Fallback to centered defaults if there's no API key
    if (!apiKey) {
      const centered = centerDefault(viewport, shapeHint);
      return new Response(JSON.stringify(centered), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    const openai = new OpenAI({ apiKey });

    // Ask the model for a placement. We keep the prompt short and require strict JSON.
    const prompt = [
      "You are a UI assistant that picks a rectangle position and size in a 2D canvas viewport.",
      "Given a user message, a viewport {x,y,w,h}, and an optional shape hint (like 'circle' or 'rectangle'), return ONLY strict JSON with keys x,y,w,h.",
      "Rules:",
      "- x,y must be in the viewport's coordinate space.",
      "- w,h must be positive and reasonably sized for the viewport.",
      "- If shapeHint is 'circle', try to make w and h similar.",
      "Output example: {\"x\":120,\"y\":80,\"w\":200,\"h\":120}.",
    ].join("\n");

    const user = JSON.stringify({ message, viewport, shapeHint });

    let placement = centerDefault(viewport, shapeHint);
    try {
      const res = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: user },
        ],
        temperature: 0.2,
        response_format: { type: "json_object" },
      });

      const content = res.choices[0]?.message?.content ?? "";
      const json = JSON.parse(content);
      const validated = PlacementSchema.safeParse(json);
      if (validated.success) {
        placement = validated.data as z.infer<typeof PlacementSchema>;
      }
    } catch {
      // fall back to centerDefault
    }

    // Post-process: if circle, enforce w==h using min side
    if (shapeHint === "circle") {
      const size = Math.min(placement.w, placement.h);
      placement = { ...placement, w: size, h: size };
    }

    const clamped = clampToViewport(viewport, placement);
    return new Response(JSON.stringify(clamped), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}


