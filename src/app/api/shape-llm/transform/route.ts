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

const HintsSchema = z
  .object({
    action: z.enum(["move", "resize", "rotate"]).optional(),
    shape: z.string().optional(),
    color: z.string().optional(),
  })
  .optional();

const ShapeSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  geo: z.string().optional(),
  color: z.string().optional(),
  text: z.string().optional(),
  rotation: z.number().optional(),
  bounds: z.object({
    x: z.number().finite(),
    y: z.number().finite(),
    w: z.number().positive().finite(),
    h: z.number().positive().finite(),
  }),
});

const RequestSchema = z.object({
  message: z.string().min(1),
  viewport: ViewportSchema,
  hints: HintsSchema,
  shapes: z.array(ShapeSchema).min(1),
});

const ResponseSchema = z.object({
  action: z.enum(["move", "resize", "rotate"]),
  shapeId: z.string().min(1),
  move: z
    .object({
      to: z
        .object({ x: z.number().finite(), y: z.number().finite() })
        .optional(),
      by: z
        .object({ dx: z.number().finite(), dy: z.number().finite() })
        .optional(),
    })
    .optional(),
  resize: z
    .object({
      to: z
        .object({ w: z.number().positive().finite(), h: z.number().positive().finite() })
        .optional(),
      by: z
        .object({ dw: z.number().finite(), dh: z.number().finite() })
        .optional(),
    })
    .optional(),
  rotate: z
    .object({
      to: z.number().finite().optional(),
      by: z.number().finite().optional(),
      unit: z.enum(["deg", "rad"]).optional(),
    })
    .optional(),
});

function pickBestShape(
  shapes: Array<z.infer<typeof ShapeSchema>>,
  hints: z.infer<typeof HintsSchema>
) {
  if (!shapes.length) return undefined;
  const shapeHint = hints?.shape?.toLowerCase();
  const colorHint = hints?.color?.toLowerCase();

  // 1) match color + shape
  if (shapeHint || colorHint) {
    const both = shapes.find((s) => {
      const geo = (s.geo || s.type || "").toLowerCase();
      const color = (s.color || "").toLowerCase();
      const matchesShape = shapeHint ? geo.includes(shapeHint) || s.type.toLowerCase().includes(shapeHint) : true;
      const matchesColor = colorHint ? color.includes(colorHint) : true;
      return matchesShape && matchesColor;
    });
    if (both) return both;

    const byShape = shapeHint
      ? shapes.find((s) => (s.geo || s.type || "").toLowerCase().includes(shapeHint) || s.type.toLowerCase().includes(shapeHint))
      : undefined;
    if (byShape) return byShape;

    const byColor = colorHint ? shapes.find((s) => (s.color || "").toLowerCase().includes(colorHint)) : undefined;
    if (byColor) return byColor;
  }

  // 2) else first
  return shapes[0];
}

function centerOf(viewport: z.infer<typeof ViewportSchema>) {
  return { cx: viewport.x + viewport.w / 2, cy: viewport.y + viewport.h / 2 };
}

function clampSizeToViewport(
  viewport: z.infer<typeof ViewportSchema>,
  size: { w: number; h: number }
) {
  const minSize = 8;
  const w = Math.max(minSize, Math.min(size.w, viewport.w));
  const h = Math.max(minSize, Math.min(size.h, viewport.h));
  return { w, h };
}

function heuristics(
  req: z.infer<typeof RequestSchema>
): z.infer<typeof ResponseSchema> {
  const { viewport, hints, shapes, message } = req;
  const chosen = pickBestShape(shapes, hints)!;
  const action = (hints?.action ?? (message.match(/rotate/i)
    ? "rotate"
    : message.match(/resize|scale|grow|shrink|twice as big|double size/i)
    ? "resize"
    : "move")) as "move" | "resize" | "rotate";

  if (action === "move") {
    const { cx, cy } = centerOf(viewport);
    return { action: "move", shapeId: chosen.id, move: { to: { x: Math.round(cx), y: Math.round(cy) } } };
  }

  if (action === "resize") {
    const targetW = chosen.bounds.w * 2;
    const targetH = chosen.bounds.h * 2;
    const { w, h } = clampSizeToViewport(viewport, { w: targetW, h: targetH });
    return { action: "resize", shapeId: chosen.id, resize: { to: { w: Math.round(w), h: Math.round(h) } } };
  }

  // rotate default 45 deg
  return { action: "rotate", shapeId: chosen.id, rotate: { by: 45, unit: "deg" } };
}

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = RequestSchema.safeParse(json);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = parsed.data;
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      const result = heuristics(data);
      return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    const openai = new OpenAI({ apiKey });

    const system = [
      "You transform one selected shape on a 2D canvas.",
      "You receive: user message, viewport {x,y,w,h}, hints {action,shape,color}, and a list of shapes.",
      "Pick the one shape that best matches by type, color, text, size, and proximity to described location.",
      "Return ONLY strict JSON with keys: action, shapeId, and one of move|resize|rotate.",
      "For move: prefer absolute {to:{x,y}}. For resize: prefer absolute {to:{w,h}}.",
      "If the user says 'center', choose the center of viewport.",
      "If the user says 'twice as big', double w/h for that shape.",
      "If rotate degrees specified, use {rotate:{to:deg,unit:'deg'}}; otherwise use {by:deg}.",
    ].join("\n");

    const user = JSON.stringify({
      message: data.message,
      viewport: data.viewport,
      hints: data.hints,
      shapes: data.shapes.slice(0, 150),
    });

    let result = heuristics(data);
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
      if (validated.success) {
        result = validated.data;
      }
    } catch {
      // fall back to heuristics
    }

    return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}


