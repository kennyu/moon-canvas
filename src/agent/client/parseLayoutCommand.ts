"use client";

export type LayoutAxis = "row" | "column";
export type LayoutAlign = "left" | "center" | "right" | "top" | "middle" | "bottom";

export type ParsedLayout = {
  hasLayoutIntent: boolean;
  axis?: LayoutAxis;
  distribute?: "even";
  align?: LayoutAlign;
  gapPx?: number;
  target?: "selection" | "viewport";
};

const AXIS_REGEX = {
  row: /(\brow\b|horizontal|side by side)/i,
  column: /(\bcolumn\b|vertical|stack(ed)?)/i,
};

const DISTRIBUTE_EVEN = /(space(\s+them|\s+these|\s+the)?\s+even(ly)?|distribute(\s+even(ly)?)?|equal(ly)?\s+spac(ed|ing)?)/i;

const ALIGN_REGEX: Record<LayoutAlign, RegExp> = {
  left: /\bleft\b/i,
  center: /\b(center|centre|middle)\b/i,
  right: /\bright\b/i,
  top: /\btop\b/i,
  middle: /\b(middle|center|centre)\b/i,
  bottom: /\bbottom\b/i,
};

const TARGET_SELECTION = /(these|selected|selection)/i;

export function parseLayoutCommand(input: string): ParsedLayout {
  const hasLayoutIntent = /(arrange|layout|space|distribute|row|column|horizontal|vertical|stack)/i.test(input);
  if (!hasLayoutIntent) return { hasLayoutIntent };

  let axis: LayoutAxis | undefined;
  if (AXIS_REGEX.row.test(input)) axis = "row";
  else if (AXIS_REGEX.column.test(input)) axis = "column";

  let distribute: "even" | undefined;
  if (DISTRIBUTE_EVEN.test(input)) distribute = "even";

  let align: LayoutAlign | undefined;
  for (const key of Object.keys(ALIGN_REGEX) as LayoutAlign[]) {
    if (ALIGN_REGEX[key].test(input)) {
      align = key;
      break;
    }
  }

  let gapPx: number | undefined;
  const gapMatch = input.match(/(gap|spacing|space)\s*(of|=)?\s*(\d{1,4})/i);
  if (gapMatch) {
    const val = parseInt(gapMatch[3]!, 10);
    if (Number.isFinite(val)) gapPx = val;
  }

  const target: "selection" | "viewport" | undefined = TARGET_SELECTION.test(input) ? "selection" : "viewport";

  return { hasLayoutIntent, axis, distribute, align, gapPx, target };
}


