import bidiFactory from "bidi-js";

/**
 * `next/og`'s satori does not run the Unicode BiDi algorithm, so Hebrew text
 * passed in logical order renders left-to-right (visually reversed). Run
 * BiDi here to convert each line into the visual order satori will then draw
 * in source order.
 *
 * Apply per-line so embedded LTR runs (digits, punctuation, URLs) keep their
 * own direction within an RTL paragraph — exactly what UAX #9 specifies.
 */

const bidi = bidiFactory();

export function bidiReorder(text: string, baseDirection: "rtl" | "ltr" = "rtl"): string {
  if (!text) return text;
  return text
    .split("\n")
    .map((line) => {
      const embed = bidi.getEmbeddingLevels(line, baseDirection);
      return bidi.getReorderedString(line, embed);
    })
    .join("\n");
}

/**
 * BiDi-reorder Hebrew/RTL text into a fixed number of visual lines, breaking
 * on word boundaries. Use this for headings in OG cards: satori's own line
 * wrapping happens *after* BiDi reorder, so wrapped lines come out in
 * reversed visual order. Doing the wrap ourselves before reorder keeps lines
 * in the right top-to-bottom sequence.
 *
 * `maxCharsPerLine` is a glyph-count budget, not a pixel measurement —
 * tune it per font size at the call site.
 */
export function bidiWrapLines(
  text: string,
  maxCharsPerLine: number,
  baseDirection: "rtl" | "ltr" = "rtl",
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxCharsPerLine && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.map((line) => bidiReorder(line, baseDirection));
}
