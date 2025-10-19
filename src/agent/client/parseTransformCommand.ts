"use client";

import { COLOR_ALIASES, type ParsedColor } from "@/agent/client/colors";

export type TransformAction = "move" | "resize" | "rotate";
export type TargetShapeHint =
  | "rectangle"
  | "circle"
  | "ellipse"
  | "triangle"
  | "diamond"
  | "text"
  | "line";

export type ParsedTransform = {
  hasTransformIntent: boolean;
  action?: TransformAction;
  shapeHint?: TargetShapeHint;
  colorHint?: ParsedColor;
};

const ACTION_REGEXPS: Record<TransformAction, RegExp> = {
  move: /(\bmove\b|\btranslate\b|\bdrag\b|\bposition\b|\bcenter\b)/i,
  resize: /(\bresize\b|\bscale\b|\bgrow\b|\bshrink\b|\bdouble size\b|\btwice as big\b)/i,
  rotate: /(\brotate\b|\bturn\b|\bspin\b)/i,
};

const SHAPE_HINT_REGEXPS: Record<TargetShapeHint, RegExp> = {
  rectangle: /\b(rectangle|rect|box|square)\b/i,
  circle: /\b(circle|ellipse|oval)\b/i,
  ellipse: /\b(ellipse|oval)\b/i,
  triangle: /\btriangle\b/i,
  diamond: /\bdiamond\b/i,
  text: /\b(text|label|title|heading|word|words)\b/i,
  line: /\b(line|arrow|rule|stroke)\b/i,
};

export function parseTransformCommand(input: string): ParsedTransform {
  const hasMove = ACTION_REGEXPS.move.test(input);
  const hasResize = ACTION_REGEXPS.resize.test(input);
  const hasRotate = ACTION_REGEXPS.rotate.test(input);

  const hasTransformIntent = hasMove || hasResize || hasRotate;
  if (!hasTransformIntent) return { hasTransformIntent };

  let action: TransformAction | undefined;
  if (hasMove) action = "move";
  else if (hasResize) action = "resize";
  else if (hasRotate) action = "rotate";

  let shapeHint: TargetShapeHint | undefined;
  for (const key of Object.keys(SHAPE_HINT_REGEXPS) as TargetShapeHint[]) {
    if (SHAPE_HINT_REGEXPS[key].test(input)) {
      shapeHint = key;
      break;
    }
  }

  let colorHint: ParsedColor | undefined;
  for (const key of Object.keys(COLOR_ALIASES)) {
    if (new RegExp(`\\b${key}\\b`, "i").test(input)) {
      colorHint = COLOR_ALIASES[key];
      break;
    }
  }

  return { hasTransformIntent, action, shapeHint, colorHint };
}


