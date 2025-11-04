import { NextRequest } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

export const dynamic = "force-dynamic";
const DEBUG = process.env.NODE_ENV !== "production";

const BoundsSchema = z.object({ x: z.number().finite(), y: z.number().finite(), w: z.number().positive().finite(), h: z.number().positive().finite() });
const ShapeSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  bounds: BoundsSchema,
  geo: z.string().optional(),
  color: z.string().optional(),
  text: z.string().optional(),
  rotation: z.number().optional(),
});

const RequestSchema = z.object({
  message: z.string().min(1),
  viewportSize: z.object({ w: z.number().positive().finite(), h: z.number().positive().finite() }),
  visibleCenter: z.object({ x: z.number().finite(), y: z.number().finite() }),
  shapes: z.array(ShapeSchema).default([]),
  selectionIds: z.array(z.string()).default([]),
});

// Tool payload schemas
const AddShapeSchema = z.object({
  idHint: z.string().optional(),
  type: z.string().min(1),
  geo: z.string().optional(),
  x: z.number().finite(),
  y: z.number().finite(),
  w: z.number().positive().finite(),
  h: z.number().positive().finite(),
  color: z.string().optional(),
  text: z.string().optional(),
});

const UpdateShapeSchema = z.object({
  id: z.string().min(1),
  x: z.number().finite().optional(),
  y: z.number().finite().optional(),
  props: z
    .object({ w: z.number().positive().finite().optional(), h: z.number().positive().finite().optional(), color: z.string().optional(), text: z.string().optional() })
    .optional(),
  rotation: z.number().finite().optional(),
});

const MoveShapesSchema = z.object({
  moves: z.array(
    z.object({
      id: z.string().min(1),
      to: z.object({ x: z.number().finite(), y: z.number().finite() }).optional(),
      by: z.object({ dx: z.number().finite(), dy: z.number().finite() }).optional(),
    })
  ),
});

const ResizeShapeSchema = z.object({
  id: z.string().min(1),
  to: z.object({ w: z.number().positive().finite(), h: z.number().positive().finite() }).optional(),
  by: z.object({ dw: z.number().finite(), dh: z.number().finite() }).optional(),
});

const RotateShapeSchema = z.object({
  id: z.string().min(1),
  to: z.number().finite().optional(),
  by: z.number().finite().optional(),
  unit: z.enum(["deg", "rad"]).default("deg").optional(),
});

const LayoutDistributeSchema = z.object({
  ids: z.array(z.string()).optional(),
  axis: z.enum(["row", "column"]).default("row"),
  align: z.enum(["left", "center", "right", "top", "middle", "bottom"]).optional(),
  gapPx: z.number().int().nonnegative().max(2000).optional(),
  target: z.enum(["selection", "viewport"]).optional(),
});

const DeleteShapesSchema = z.object({ ids: z.array(z.string().min(1)) });

type ToolName =
  | "addShape"
  | "updateShape"
  | "moveShapes"
  | "resizeShape"
  | "rotateShape"
  | "layoutDistribute"
  | "deleteShapes";

const StepSchema = z.object({
  tool: z.custom<ToolName>((v): v is ToolName => typeof v === "string" && [
    "addShape",
    "updateShape",
    "moveShapes",
    "resizeShape",
    "rotateShape",
    "layoutDistribute",
    "deleteShapes",
  ].includes(v as any)),
  args: z.unknown(),
});

const ModelResponseSchema = z.object({
  steps: z.array(StepSchema).default([]),
  say: z.string().optional(),
});

function sseEncode(event: string, data?: unknown) {
  const lines = [
    `event: ${event}`,
    ...(data === undefined ? [] : [`data: ${JSON.stringify(data)}`]),
    "",
  ];
  return lines.join("\n");
}

function clampSizeToViewport(viewportSize: { w: number; h: number }, size: { w: number; h: number }) {
  const minSize = 8;
  const w = Math.max(minSize, Math.min(size.w, viewportSize.w));
  const h = Math.max(minSize, Math.min(size.h, viewportSize.h));
  return { w, h };
}

const SUPPORTED_COLORS = [
  "black",
  "grey",
  "red",
  "orange",
  "yellow",
  "green",
  "teal",
  "blue",
  "indigo",
  "violet",
  "pink",
  "white",
] as const;
type SupportedColor = (typeof SUPPORTED_COLORS)[number];

function detectColorFromText(text: string): SupportedColor | undefined {
  const lower = text.toLowerCase();
  const aliasMap: Record<string, SupportedColor> = {
    black: "black",
    grey: "grey",
    gray: "grey",
    silver: "grey",
    red: "red",
    orange: "orange",
    yellow: "yellow",
    green: "green",
    teal: "teal",
    cyan: "teal",
    turquoise: "teal",
    blue: "blue",
    indigo: "indigo",
    navy: "indigo",
    violet: "violet",
    purple: "violet",
    pink: "pink",
    white: "white",
    ivory: "white",
    "off-white": "white",
  };
  for (const key of Object.keys(aliasMap)) {
    if (lower.includes(key)) return aliasMap[key]!;
  }
  return undefined;
}

function pickTargetShape(
  shapes: Array<z.infer<typeof ShapeSchema>>,
  selectionIds: string[]
) {
  if (!shapes.length) return undefined;
  const set = new Set(selectionIds);
  const inSel = shapes.find((s) => set.has(s.id));
  return inSel ?? shapes[0];
}

function buildHeuristicSteps(req: z.infer<typeof RequestSchema>): z.infer<typeof ModelResponseSchema> {
  const text = req.message;
  const steps: Array<z.infer<typeof StepSchema>> = [];

  const hasCreate = /(\bcreate\b|\badd\b|\bmake\b)/i.test(text);
  const hasMove = /(\bmove\b|\btranslate\b|\bdrag\b|\bposition\b|\bcenter\b)/i.test(text);
  const hasResize = /(\bresize\b|\bscale\b|\bgrow\b|\bshrink\b|\bdouble size\b|\btwice as big\b)/i.test(text);
  const hasRotate = /(\brotate\b|\bturn\b|\bspin\b)/i.test(text);
  const hasLayout = /(arrange|layout|space|distribute|row|column|horizontal|vertical|stack)/i.test(text);
  const color = detectColorFromText(text);

  if (hasCreate) {
    const isCircle = /(circle|ellipse|oval)/i.test(text);
    const isTriangle = /triangle/i.test(text);
    const isDiamond = /diamond/i.test(text);
    const geo = isCircle ? "ellipse" : isTriangle ? "triangle" : isDiamond ? "diamond" : "rectangle";
    const size = clampSizeToViewport(req.viewportSize, { w: isCircle ? 160 : 200, h: isCircle ? 160 : 120 });
    steps.push({
      tool: "addShape",
      args: {
        type: "geo",
        geo,
        x: req.visibleCenter.x - Math.round(size.w / 2),
        y: req.visibleCenter.y - Math.round(size.h / 2),
        w: size.w,
        h: size.h,
        ...(color ? { color } : {}),
      },
    });
  }

  const target = pickTargetShape(req.shapes, req.selectionIds);
  if (target) {
    if (color) {
      steps.push({ tool: "updateShape", args: { id: target.id, props: { color } } });
    }
    if (hasMove) {
      steps.push({ tool: "moveShapes", args: { moves: [{ id: target.id, to: { x: req.visibleCenter.x, y: req.visibleCenter.y } }] } });
    }
    if (hasResize) {
      const size = clampSizeToViewport(req.viewportSize, { w: target.bounds.w * 2, h: target.bounds.h * 2 });
      steps.push({ tool: "resizeShape", args: { id: target.id, to: { w: Math.round(size.w), h: Math.round(size.h) } } });
    }
    if (hasRotate) {
      steps.push({ tool: "rotateShape", args: { id: target.id, by: 45, unit: "deg" } });
    }
  }

  if (hasLayout) {
    const axis = /(\brow\b|horizontal)/i.test(text) ? "row" : /(\bcolumn\b|vertical|stack)/i.test(text) ? "column" : "row";
    const align = /(left)/i.test(text)
      ? "left"
      : /(right)/i.test(text)
      ? "right"
      : /(top)/i.test(text)
      ? "top"
      : /(bottom)/i.test(text)
      ? "bottom"
      : /(middle|center|centre)/i.test(text)
      ? (axis === "row" ? "middle" : "center")
      : undefined;
    const gapMatch = text.match(/(gap|spacing|space)\s*(of|=)?\s*(\d{1,4})/i);
    const gapPx = gapMatch ? Math.min(2000, Math.max(0, parseInt(gapMatch[3]!, 10))) : undefined;
    steps.push({ tool: "layoutDistribute", args: { axis, align, gapPx, target: /selected|selection|these/i.test(text) ? "selection" : "viewport" } });
  }

  const say = steps.length ? undefined : "(note) No intent detected.";
  return { steps, say } as any;
}

function validateStep(step: z.infer<typeof StepSchema>, viewportSize: { w: number; h: number }) {
  switch (step.tool) {
    case "addShape":
      {
        const base = (step.args && typeof step.args === "object") ? (step.args as Record<string, unknown>) : {};
        const clamped = clampAdd(step.args as any, viewportSize);
        return AddShapeSchema.parse({ ...base, ...clamped });
      }
    case "updateShape":
      return UpdateShapeSchema.parse(step.args);
    case "moveShapes":
      return MoveShapesSchema.parse(step.args);
    case "resizeShape":
      {
        const base = (step.args && typeof step.args === "object") ? (step.args as Record<string, unknown>) : {};
        const clamped = clampResize(step.args as any, viewportSize);
        return ResizeShapeSchema.parse({ ...base, ...clamped });
      }
    case "rotateShape":
      return RotateShapeSchema.parse(step.args);
    case "layoutDistribute":
      return LayoutDistributeSchema.parse(step.args);
    case "deleteShapes":
      return DeleteShapesSchema.parse(step.args);
  }
}

function clampAdd(args: any, viewportSize: { w: number; h: number }) {
  if (!args) return {};
  const { w, h } = clampSizeToViewport(viewportSize, { w: args.w ?? 100, h: args.h ?? 100 });
  return { w, h };
}

function clampResize(args: any, viewportSize: { w: number; h: number }) {
  if (!args?.to) return {};
  const { w, h } = clampSizeToViewport(viewportSize, { w: args.to.w ?? 100, h: args.to.h ?? 100 });
  return { to: { ...args.to, w, h } };
}

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = RequestSchema.safeParse(json);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const data = parsed.data;
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        function send(event: string, payload?: unknown) {
          controller.enqueue(encoder.encode(sseEncode(event, payload)));
          if (DEBUG) {
            try {
              const preview = payload === undefined ? "" : ` ${JSON.stringify(payload).slice(0, 200)}${JSON.stringify(payload).length > 200 ? "…" : ""}`;
              console.log(`[canvas-agent] -> ${event}${preview}`);
            } catch {}
          }
        }

        try {
          if (DEBUG) {
            console.log("[canvas-agent] start", {
              shapes: data.shapes.length,
              selection: data.selectionIds.length,
              viewportSize: data.viewportSize,
              visibleCenter: data.visibleCenter,
            });
          }
          // Fallback heuristics if no API key
          if (!process.env.OPENAI_API_KEY) {
            if (DEBUG) console.log("[canvas-agent] using heuristics fallback (no OPENAI_API_KEY)");
            const out = buildHeuristicSteps(data);
            if (out.say) send("message", { text: out.say });
            for (const step of out.steps) {
              try {
                const validated = validateStep(step, data.viewportSize);
                send(`tool.${step.tool}`, validated);
              } catch {}
            }
            send("done");
            controller.close();
            return;
          }

          const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
          const system = [
            "You are a canvas layout and drawing assistant controlling a 2D page-based editor.",
            "You will receive: message, viewportSize {w,h}, visibleCenter {x,y}, shapes[], selectionIds[].",
            "All coordinates are in page space. Use visibleCenter when the user requests centering.",
            "Respond ONLY with strict JSON: { steps: [{ tool, args }], say? }.",
            "Tools: addShape, updateShape, moveShapes, resizeShape, rotateShape, layoutDistribute, deleteShapes.",
            "For addShape, prefer type 'geo' with geo in {rectangle, ellipse, triangle, diamond}.",
            "When the user specifies a color, include a 'color' property using one of {black, grey, red, orange, yellow, green, teal, blue, indigo, violet, pink, white}.",
            "You may also change an existing shape's color using updateShape with props.color when requested.",
            "Clamp sizes (w,h) to viewportSize min 8px; do not clamp positions.",
          ].join("\n");

          const user = JSON.stringify({
            message: data.message,
            viewportSize: data.viewportSize,
            visibleCenter: data.visibleCenter,
            shapes: data.shapes.slice(0, 200),
            selectionIds: data.selectionIds?.slice(0, 200) ?? [],
          });

          let modelResp: z.infer<typeof ModelResponseSchema> | undefined;
          try {
            const res = await openai.chat.completions.create({
              model: "gpt-5",
              messages: [
                { role: "system", content: system },
                { role: "user", content: user },
              ],
              temperature: 0,
              response_format: { type: "json_object" },
            });
            const content = res.choices?.[0]?.message?.content ?? "";
            if (DEBUG) {
              try {
                console.log("[canvas-agent] model content", content);
              } catch {}
            }
            const parsed = ModelResponseSchema.safeParse(JSON.parse(content));
            if (parsed.success) {
              modelResp = parsed.data;
              if (DEBUG) {
                try {
                  console.log("[canvas-agent] model parsed", JSON.stringify(modelResp));
                } catch {}
              }
            }
          } catch {}

          if (!modelResp) modelResp = buildHeuristicSteps(data);

          if (DEBUG) console.log("[canvas-agent] model steps", modelResp.steps?.length ?? 0);
          if (modelResp.say) send("message", { text: modelResp.say });
          for (const step of modelResp.steps) {
            try {
              const validated = validateStep(step, data.viewportSize);
              send(`tool.${step.tool}`, validated);
            } catch {}
          }
          send("done");
        } catch {
          send("message", { text: "(error) Agent failed to process." });
        } finally {
          if (DEBUG) console.log("[canvas-agent] end");
          controller.close();
        }
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no", // for some proxies
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
}


