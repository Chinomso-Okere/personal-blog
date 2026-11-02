# Design Spec — Personal AI Technical Blog

**Owner:** Nonso (Chinomso Okere)
**Date:** 2 November 2026
**Status:** Approved direction
**Companion to:** `product-prd.md`, `technical-prd.md`. This is the visual reference the coding agent builds **Phase 1** from.
**Reference implementation:** `reference.html` (the approved mockup). Where this document and the mockup differ, the mockup's CSS is the source of truth — it is a working example of every token and component below.

---

## 0. Direction in one line

Warm editorial — a calm, reading-first blog with a serif voice and warm paper in light mode, and a **warm** (not cold) dark mode where the accent shifts to amber. Reading comfort comes first; personality is carried by typography and a single restrained accent, never by heavy UI.

**Hard design rules**
- Reading experience is the priority. Generous spacing, one comfortable column, no clutter.
- One accent only. Use it sparingly (eyebrows, link hover, pullquote rule, hover states). Never fill large areas with it.
- Full light **and** dark mode, both first-class. Dark stays in the warm family — never a cold near-black.
- No templated defaults: no emoji section markers, no gradient hero, no rounded-everything, no accent rail on every card.

---

## 1. Colour tokens

Define every colour as a CSS custom property on `:root` (light values), then redefine the tokens for dark under both `@media (prefers-color-scheme: dark){ :root:not([data-theme="light"]) }` and `:root[data-theme="dark"]`. Set `color-scheme: dark` in both dark blocks. `body` always takes `background` and `color` from tokens.

### Light (default)
| Token | Value | Use |
|---|---|---|
| `--bg` | `#F5F1E8` | page background (warm paper) |
| `--surface` | `#FFFFFF` | cards, code caption bar |
| `--fg` | `#211B12` | primary text (warm ink) |
| `--muted` | `#867B67` | meta, captions, nav |
| `--border` | `#E4DBCB` | rules, dividers, card edges |
| `--accent` | `#9C3B1B` | clay — pullquote rule, borders |
| `--accent-ink` | `#9C3B1B` | eyebrows, link hover |
| `--code-bg` | `#2A2317` | code block (dark in light mode too) |
| `--code-fg` | `#EADFC9` | code text |

### Dark
| Token | Value | Use |
|---|---|---|
| `--bg` | `#191510` | warm deep charcoal |
| `--surface` | `#221C14` | cards, code caption bar |
| `--fg` | `#ECE3D2` | warm off-white text |
| `--muted` | `#A79B84` | meta, captions, nav |
| `--border` | `#332A1E` | rules, dividers, card edges |
| `--accent` | `#E08A4C` | amber-clay — the touch of boldness |
| `--accent-ink` | `#E59A5E` | eyebrows, link hover |
| `--code-bg` | `#120E09` | code block |
| `--code-fg` | `#E7DDC8` | code text |

### Code syntax colours (same in both themes — they sit on the dark code block)
| Role | Value |
|---|---|
| keyword | `#E0A05A` |
| string | `#B8C08A` |
| function | `#ECD9AC` |
| comment | `#8C8066` (italic) |
| number | `#DD9A72` |

---

## 2. Typography

Three roles, loaded from Google Fonts. Always declare the fallback stack.

| Role | Face | Weights | Fallback |
|---|---|---|---|
| Display + body | **Newsreader** (serif) | 400, 500, 600, + italic 400/500 | `"Iowan Old Style", Georgia, serif` |
| UI / labels / nav / meta / captions | **Inter** | 400, 500, 600 | `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` |
| Code | **JetBrains Mono** | 400, 500 | `ui-monospace, "SF Mono", Menlo, monospace` |

The serif carries the content (headlines **and** body — this is what makes it feel editorial). Inter is used only for small functional text: nav, eyebrows, meta, captions, card descriptions, buttons.

### Type scale
| Element | Face | Size | Weight | Line height | Notes |
|---|---|---|---|---|---|
| Post title (h1) | Newsreader | `clamp(30px,6vw,46px)` | 500 | 1.1 | `letter-spacing:-.015em`; `text-wrap:balance` |
| Lead paragraph | Newsreader | 20px | 400 | 1.55 | first paragraph of a post |
| Body paragraph | Newsreader | 18px | 400 | 1.64 | the default reading size |
| Pullquote | Newsreader italic | 23px | 500 | 1.38 | left rule in `--accent` |
| Card / section title (h3) | Newsreader | 20px | 500 | 1.2 | `letter-spacing:-.01em` |
| Eyebrow / label | Inter | 12px | 600 | — | uppercase, `letter-spacing:.1em`, `--accent-ink` |
| Nav | Inter | 12px | 500 | — | uppercase, `letter-spacing:.11em`, `--muted` |
| Meta (date, read time) | Inter | 13px | 500 | — | `--muted`, dot separators |
| Card description | Inter | 14px | 400 | 1.5 | `--muted` |
| Caption | Inter | 12.5px | 400 | 1.45 | `--muted` |
| Code | JetBrains Mono | 13px | 400 | 1.7 | — |

---

## 3. Layout, spacing, radius

- **Site max width:** 960px (header, footer, "more posts").
- **Reading column max width:** 680px (the article itself — keeps lines ~65–72 chars).
- **Side gutter:** `max(20px, env(safe-area-inset-left/right, 0px))` — never less than 20px.
- **Spacing scale (px):** 4, 8, 12, 16, 20, 24, 30, 44, 60. Use flex/grid with `gap`, not stacked margins.
- **Radius:** 10px for cards, figures and code blocks; `999px` for the pill toggle. No radius on rules or the page itself.
- **Shadow:** avoid. This design uses hairline borders (`--border`), not shadows, to separate objects. (The comparison deck used shadow; the real blog does not.)

---

## 4. Components

Exact CSS for each is in `reference.html`. Summary of intent:

- **Masthead (header):** sticky, `top: env(safe-area-inset-top,0px)`, translucent `--bg` with a subtle blur, hairline bottom border. Brand (name, Newsreader 500) left; nav + theme toggle right. Paint the safe-area band with `body::before` so nothing scrolls under the system bar. Nav: Blog · Writing · Portfolio · About. **Portfolio** is an external link with a `↗` marker, opens in a new tab.
- **Theme toggle:** a small pill button (Inter, uppercase) in the header; label reads "Dark" in light mode and "Light" in dark mode. Persists choice in `localStorage` (wrapped in try/catch), defaults to the system theme.
- **Article:** eyebrow (tag) → h1 → meta row (date · read time) → hairline rule → lead paragraph → body. Pullquote has a 2px `--accent` left rule and is italic.
- **Code block:** a `figure` with a caption bar (filename, Inter, on `--surface`) above a `--code-bg` `<pre>`. Dark in **both** themes. Horizontal scroll inside the block only (`overflow-x:auto`). Syntax colours per §1.
- **Image figure:** full-column image with a short Inter caption beneath. Images are optional and can appear at any point in the body (per the PRD). In the mockup this is a placeholder; real posts use `![alt](/images/name.png)`.
- **"More from the blog" cards:** two-column grid (one column under ~560px), hairline-separated. Each: eyebrow + Newsreader title + one-line Inter description. Title shifts to `--accent-ink` on hover. No border, no shadow — separated by whitespace.
- **Footer:** hairline top border, `--bg`. Left: one-line bio (bold name in `--fg`, rest `--muted`). Right: LinkedIn · GitHub · Email · © line. Links hover to `--accent-ink`.
- **Writing page (per PRD):** reuse the eyebrow + Newsreader title + Inter meta pattern. Each entry: title, venue + year (meta style), one-line note, external link (`↗`). Same accent and spacing rules.
- **About page:** standard article column; the same type scale and rhythm as a post.

---

## 5. Behaviour & accessibility

- Respect `prefers-reduced-motion` — disable transitions when set.
- Visible keyboard focus state on every link, button and the toggle.
- Hover states use `--accent-ink` for text, never a background fill.
- `font-variant-numeric: tabular-nums` anywhere digits align in columns.
- Keep contrast legible in both themes; the accent must stay readable on both backgrounds (the dark accent is deliberately lighter than the light one for this reason).

---

## 6. What the agent should take from this

Build Phase 1 to match `reference.html`: same tokens, same type scale, same component treatments, both themes. The mockup is a single post page plus header/footer/cards; extend the same system to the Home, Blog list, Writing and About pages. Do not introduce new fonts, accents, shadows or radii beyond what is defined here without asking.

---

## 7. Design decisions (for the decisions log)

- [2026-11-02] Chose **Warm Editorial (Direction A)** as the base — reading-first, serif, warm paper; best fit for a technical blog where long-form text and code dominate.
- [2026-11-02] Folded in **a characterful dark mode** from Direction C, kept **warm** (brown-charcoal, not cold black) so it stays in A's family; accent shifts clay → amber on dark. Otherwise kept A pure.
- [2026-11-02] Chose **serif for body as well as headlines** (Newsreader) — the editorial reading feel depends on it.
- [2026-11-02] Chose **a dark code block in both themes** — keeps code legible and reads as deliberate.
- [2026-11-02] Chose **hairline borders over shadows** for separating elements — quieter, more editorial.