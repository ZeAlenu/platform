import { ImageResponse } from "next/og";

import { SITE_DESCRIPTION, SITE_LEGAL_NAME, SITE_NAME } from "@/lib/site";
import { loadOgFonts } from "@/lib/og-fonts";
import { bidiReorder } from "@/lib/og-bidi";

export const runtime = "nodejs";

// Short OG tagline. The full SITE_DESCRIPTION is too long to fit one visual
// line in 1200px, and satori's line wrapping happens *after* BiDi reorder, so
// wrapped Hebrew lines come out in reversed visual-line order. Keeping the
// OG copy single-line sidesteps that.
const OG_TAGLINE = "מחקרי מדיניות ופעילות שטח";

export const alt = `${SITE_NAME} — ${SITE_DESCRIPTION}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const fonts = await loadOgFonts();

  // Satori (the renderer behind next/og) does not run the Unicode BiDi
  // algorithm — Hebrew passed in logical order renders left-to-right.
  // bidiReorder() returns the visual-order string we then draw normally.
  return new ImageResponse(
    (
      <div
        lang="he"
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: "#FFFCF8",
          color: "#1F1F1F",
          fontFamily: '"Frank Ruhl Libre", serif',
        }}
      >
        <div style={{ display: "flex", justifyContent: "flex-end", fontSize: 32, color: "#7A6C56", letterSpacing: 4 }}>
          {bidiReorder(SITE_LEGAL_NAME)}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 24,
          }}
        >
          <div style={{ display: "flex", fontSize: 120, fontWeight: 700, lineHeight: 1.05 }}>
            {bidiReorder(SITE_NAME)}
          </div>
          <div style={{ display: "flex", fontSize: 48, color: "#3F3F3F", textAlign: "right" }}>
            {bidiReorder(OG_TAGLINE)}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 28, color: "#7A6C56" }}>
          <span>zealenu.org</span>
          <span>{bidiReorder("מחקר · מדיניות · שטח")}</span>
        </div>
      </div>
    ),
    { ...size, fonts: fonts.length > 0 ? fonts : undefined },
  );
}
