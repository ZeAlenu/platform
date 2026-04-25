import { ImageResponse } from "next/og";

import { listResearchFiles, readResearchFile } from "@/lib/research";
import { SITE_LEGAL_NAME, SITE_NAME } from "@/lib/site";
import { loadOgFonts } from "@/lib/og-fonts";
import { bidiReorder, bidiWrapLines } from "@/lib/og-bidi";

export const runtime = "nodejs";

export const alt = `${SITE_NAME} — מחקר`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Pre-render an OG card per article alongside the page itself. Falls back to
// the parent route's OG handler if the slug isn't known.
export async function generateStaticParams() {
  const all = await listResearchFiles();
  return all.map((entry) => ({ slug: entry.slug }));
}

const HE_DATE = new Intl.DateTimeFormat("he-IL", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

interface ImageProps {
  params: Promise<{ slug: string }>;
}

export default async function Image({ params }: ImageProps) {
  const { slug } = await params;
  const { frontmatter } = await readResearchFile(slug);
  const fonts = await loadOgFonts();

  const dateLine = HE_DATE.format(new Date(frontmatter.published_at));
  const authorLine = frontmatter.authors.join(" · ");
  // ~28 chars/line at 64px Frank Ruhl Libre fits the 1056px content width.
  // Wrap before BiDi so the visual lines appear top-to-bottom in reading order.
  const titleLines = bidiWrapLines(frontmatter.title, 28);

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
          padding: 72,
          background: "#FFFCF8",
          color: "#1F1F1F",
          fontFamily: '"Frank Ruhl Libre", serif',
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 28, color: "#7A6C56", letterSpacing: 2 }}>
          <span>{bidiReorder(dateLine)}</span>
          <span>{bidiReorder(SITE_LEGAL_NAME)}</span>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            fontSize: 64,
            fontWeight: 700,
            lineHeight: 1.15,
            maxWidth: "100%",
            textAlign: "right",
          }}
        >
          {titleLines.map((line, i) => (
            <span key={i} style={{ display: "flex" }}>
              {line}
            </span>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 12 }}>
          {authorLine && (
            <div style={{ display: "flex", fontSize: 32, color: "#3F3F3F" }}>
              {bidiReorder(`מאת ${authorLine}`)}
            </div>
          )}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 28,
              color: "#7A6C56",
              borderTop: "2px solid #E6DCC9",
              paddingTop: 24,
              width: "100%",
            }}
          >
            <span>zealenu.org</span>
            <span>{bidiReorder(SITE_NAME)}</span>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: fonts.length > 0 ? fonts : undefined },
  );
}
