/**
 * `next/og` (satori under the hood) needs explicit font binaries to render
 * non-Latin glyphs — it won't fall back to a system font for Hebrew. Pull a
 * Hebrew-supporting TTF (Frank Ruhl Libre, the same serif we use on the site)
 * from jsDelivr at OG-image build time. Cached in-process so a build that
 * generates many cards only fetches twice (regular + bold).
 *
 * If the network call fails (offline build, jsDelivr down) we degrade to no
 * fonts. Latin OG images still render; Hebrew text renders as boxes. The
 * caller decides whether to skip the Hebrew payload in that case.
 */

const FONT_URLS = {
  regular:
    "https://cdn.jsdelivr.net/gh/google/fonts/ofl/frankruhllibre/static/FrankRuhlLibre-Regular.ttf",
  bold: "https://cdn.jsdelivr.net/gh/google/fonts/ofl/frankruhllibre/static/FrankRuhlLibre-Bold.ttf",
} as const;

type Weight = keyof typeof FONT_URLS;

const cache = new Map<Weight, ArrayBuffer | null>();

async function loadOne(weight: Weight): Promise<ArrayBuffer | null> {
  if (cache.has(weight)) return cache.get(weight) ?? null;
  try {
    const res = await fetch(FONT_URLS[weight], { cache: "force-cache" });
    if (!res.ok) {
      cache.set(weight, null);
      return null;
    }
    const buf = await res.arrayBuffer();
    cache.set(weight, buf);
    return buf;
  } catch {
    cache.set(weight, null);
    return null;
  }
}

export interface OgFont {
  name: string;
  data: ArrayBuffer;
  style: "normal";
  weight: 400 | 700;
}

export async function loadOgFonts(): Promise<OgFont[]> {
  const [regular, bold] = await Promise.all([loadOne("regular"), loadOne("bold")]);
  const fonts: OgFont[] = [];
  if (regular) fonts.push({ name: "Frank Ruhl Libre", data: regular, style: "normal", weight: 400 });
  if (bold) fonts.push({ name: "Frank Ruhl Libre", data: bold, style: "normal", weight: 700 });
  return fonts;
}
