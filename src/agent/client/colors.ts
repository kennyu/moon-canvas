"use client";

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

export const COLOR_ALIASES: Record<string, ParsedColor> = {
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


