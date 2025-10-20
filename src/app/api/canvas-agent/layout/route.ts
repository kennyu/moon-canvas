import { NextRequest } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

export const dynamic = "force-dynamic";

const ViewportSchema = z.object({ x: z.number(), y: z.number(), w: z.number().positive(), h: z.number().positive() });

const HintsSchema = z.object({
  axis: z.enum(["row", "column"]).optional(),
  distribute: z.literal("even").optional(),
  align: z.enum(["left", "center", "right", "top", "middle", "bottom"]).optional(),
  gapPx: z.number().int().positive().max(2000).optional(),
  target: z.enum(["selection", "viewport"]).optional(),
});

const ShapeSchema = z.object({
  id: z.string(),
  type: z.string(),
  bounds: z.object({ x: z.number(), y: z.number(), w: z.number().positive(), h: z.number().positive() }),
});

const RequestSchema = z.object({
  message: z.string().min(1),
  viewport: ViewportSchema,
  hints: HintsSchema.optional(),
  shapes: z.array(ShapeSchema),
  selectionIds: z.array(z.string()).optional(),
});

const MoveSchema = z.object({ id: z.string(), to: z.object({ x: z.number(), y: z.number() }) });
const ResponseSchema = z.object({ moves: z.array(MoveSchema) });

function median(values: number[]): number {
  if (!values.length) return 0;
  const arr = [...values].sort((a, b) => a - b);
  const mid = Math.floor(arr.length / 2);
  return arr.length % 2 ? arr[mid]! : (arr[mid - 1]! + arr[mid]!) / 2;
}

function pickTargets(
  shapes: z.infer<typeof ShapeSchema>[],
  selectionIds: string[] | undefined,
  hints: z.infer<typeof HintsSchema> | undefined
) {
  if (hints?.target === "selection" && selectionIds?.length) {
    const set = new Set(selectionIds);
    return shapes.filter((s) => set.has(s.id));
  }
  return shapes;
}

function layoutHeuristics(req: z.infer<typeof RequestSchema>): z.infer<typeof ResponseSchema> {
  const { shapes, hints } = req;
  const targets = pickTargets(shapes, req.selectionIds, hints);
  if (targets.length < 2) return { moves: [] };

  const axis = hints?.axis ?? "row";
  const align = hints?.align;
  const gap = hints?.gapPx;
  const distributeEven = hints?.distribute === "even" || !gap; // if no gap specified, default to even

  const sorted = [...targets].sort((a, b) => (axis === "row" ? a.bounds.x - b.bounds.x : a.bounds.y - b.bounds.y));

  // Compute line baseline (y for row, x for column) using median of centers
  const centers = sorted.map((s) => ({
    cx: s.bounds.x + s.bounds.w / 2,
    cy: s.bounds.y + s.bounds.h / 2,
  }));
  const baseline = axis === "row" ? median(centers.map((c) => c.cy)) : median(centers.map((c) => c.cx));

  // Determine starting point and spacing
  if (axis === "row") {
    const totalWidth = sorted.reduce((acc, s) => acc + s.bounds.w, 0);
    const minX = Math.min(...sorted.map((s) => s.bounds.x));
    const maxX = Math.max(...sorted.map((s) => s.bounds.x + s.bounds.w));
    const span = maxX - minX;
    let gapPx = gap ?? 0;
    if (distributeEven) {
      const free = Math.max(0, span - totalWidth);
      gapPx = sorted.length > 1 ? Math.round(free / (sorted.length - 1)) : 0;
    }

    let cursorX = minX;
    const moves = sorted.map((s) => {
      const y = align === "top" ? baseline - s.bounds.h / 2 : align === "bottom" ? baseline - s.bounds.h / 2 : baseline - s.bounds.h / 2;
      const move = { id: s.id, to: { x: Math.round(cursorX), y: Math.round(y) } };
      cursorX += s.bounds.w + gapPx;
      return move;
    });
    return { moves };
  } else {
    const totalHeight = sorted.reduce((acc, s) => acc + s.bounds.h, 0);
    const minY = Math.min(...sorted.map((s) => s.bounds.y));
    const maxY = Math.max(...sorted.map((s) => s.bounds.y + s.bounds.h));
    const span = maxY - minY;
    let gapPx = gap ?? 0;
    if (distributeEven) {
      const free = Math.max(0, span - totalHeight);
      gapPx = sorted.length > 1 ? Math.round(free / (sorted.length - 1)) : 0;
    }

    let cursorY = minY;
    const moves = sorted.map((s) => {
      const x = align === "left" ? baseline - s.bounds.w / 2 : align === "right" ? baseline - s.bounds.w / 2 : baseline - s.bounds.w / 2;
      const move = { id: s.id, to: { x: Math.round(x), y: Math.round(cursorY) } };
      cursorY += s.bounds.h + gapPx;
      return move;
    });
    return { moves };
  }
}

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = RequestSchema.safeParse(json);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    const data = parsed.data;

    // No key → heuristics
    if (!process.env.OPENAI_API_KEY) {
      const result = layoutHeuristics(data);
      return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    // With key → try model, fallback to heuristics
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const system = [
      "You lay out multiple shapes on a 2D canvas.",
      "Return ONLY strict JSON: { moves: [{ id, to: { x, y } }] }.",
      "Follow axis (row|column), distribute (even), align (left|center|right|top|middle|bottom), gapPx.",
      "Use spatial order (increasing x for row, y for column).",
    ].join("\n");
    const user = JSON.stringify({ message: data.message, viewport: data.viewport, hints: data.hints, shapes: data.shapes, selectionIds: data.selectionIds });

    let result = layoutHeuristics(data);
    try {
      const res = await openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0,
        response_format: { type: "json_object" },
      });
      const content = res.choices?.[0]?.message?.content ?? "";
      const jsonResp = JSON.parse(content);
      const validated = ResponseSchema.safeParse(jsonResp);
      if (validated.success) result = validated.data;
    } catch {}

    return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
}


