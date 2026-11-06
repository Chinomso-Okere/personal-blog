import fs from "fs";
import path from "path";
import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site";
import { OG_SIZE } from "@/lib/seo";

// Light-theme tokens (social cards have no dark mode). Kept in step with
// app/globals.css :root.
const PAPER = "#F5F1E8";
const INK = "#211B12";
const MUTED = "#6F6553";
const LINE = "#E4DBCB";
const CLAY = "#9C3B1B";

// Static Newsreader cuts at opsz 72 (the site's display size). next/og cannot
// read WOFF2 or pick a variable-font instance, hence these TTFs (OFL, see
// assets/fonts/OFL.txt).
const FONT_DIR = path.join(process.cwd(), "assets", "fonts");
const fonts = [
  {
    name: "Newsreader",
    data: fs.readFileSync(path.join(FONT_DIR, "Newsreader-Display-Regular.ttf")),
    weight: 400 as const,
    style: "normal" as const,
  },
  {
    name: "Newsreader",
    data: fs.readFileSync(path.join(FONT_DIR, "Newsreader-Display-Italic.ttf")),
    weight: 400 as const,
    style: "italic" as const,
  },
];

export interface CardContent {
  /** Small uppercase label above the title; omitted on section cards, where
   *  it would only repeat the name in the bottom row. */
  label?: string;
  title: string;
  /** Optional second part of the title, set in italic clay (home tagline). */
  titleAccent?: string;
  description?: string;
}

// Long post titles step down so they stay within three lines.
function titleSize(text: string): number {
  if (text.length <= 32) return 92;
  if (text.length <= 60) return 74;
  return 60;
}

export function renderCard({ label, title, titleAccent, description }: CardContent) {
  const domain = new URL(siteConfig.url).host;
  const fullTitle = titleAccent ? `${title} ${titleAccent}` : title;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px 60px",
          background: PAPER,
          color: INK,
          fontFamily: "Newsreader",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              width: 72,
              height: 4,
              background: CLAY,
              marginBottom: label ? 28 : 40,
            }}
          />
          {label && (
            <div
              style={{
                fontSize: 24,
                letterSpacing: 4,
                textTransform: "uppercase",
                color: CLAY,
                marginBottom: 26,
              }}
            >
              {label}
            </div>
          )}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: titleSize(fullTitle),
              lineHeight: 1.04,
              letterSpacing: -1.5,
              maxWidth: 1000,
            }}
          >
            <span>{title}</span>
            {titleAccent && (
              <span style={{ fontStyle: "italic", color: CLAY }}>{titleAccent}</span>
            )}
          </div>
          {description && (
            <div
              style={{
                marginTop: 28,
                fontSize: 30,
                lineHeight: 1.4,
                color: MUTED,
                maxWidth: 900,
              }}
            >
              {description}
            </div>
          )}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            paddingTop: 24,
            borderTop: `1px solid ${LINE}`,
            fontSize: 30,
          }}
        >
          <span>{siteConfig.name}</span>
          <span style={{ fontSize: 26, color: MUTED }}>{domain}</span>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts }
  );
}
