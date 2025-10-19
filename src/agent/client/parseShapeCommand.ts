"use client";

export type ParsedShape = "rectangle" | "ellipse" | "triangle" | "diamond" | "circle";
export type ParsedColor =
  | "black"
  | "grey"
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "teal"
  | "blue"
  | "indigo"
  | "violet"
  | "pink"
  | "white";

const COLOR_ALIASES: Record<string, ParsedColor> = {
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

export function parseShapeCommand(input: string): {
  hasCreateIntent: boolean;
  shape: ParsedShape;
  color: ParsedColor;
} {
  const hasCreateIntent = /(\bcreate\b|\badd\b|\bmake\b)/i.test(input);

  let shape: ParsedShape = "rectangle";
  if (/\b(circle|ellipse|oval)\b/i.test(input)) shape = "circle";
  else if (/\b(rectangle|rect|box|square)\b/i.test(input)) shape = "rectangle";
  else if (/\b(triangle)\b/i.test(input)) shape = "triangle";
  else if (/\b(diamond)\b/i.test(input)) shape = "diamond";

  let color: ParsedColor = "black";
  for (const key of Object.keys(COLOR_ALIASES)) {
    if (new RegExp(`\\b${key}\\b`, "i").test(input)) {
      color = COLOR_ALIASES[key];
      break;
    }
  }

  return { hasCreateIntent, shape, color };
}


