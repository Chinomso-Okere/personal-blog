# Design Spec — Personal AI Technical Blog

**Owner:** Nonso (Chinomso Okere)
**Date:** 2 November 2026 (Updated 5 November 2026: elevated redesign)
**Status:** Approved direction; redesign in progress (`docs/redesign/PLAN.md`)
**Companion to:** `product-prd.md`, `technical-prd.md`. This is the visual reference the coding agent builds **Phase 1** from.
**Reference implementation:** the redesign mockups in `docs/redesign/mockup/` (`Main.dc.html`, `Post.dc.html`, `System.dc.html`) and the build plan `docs/redesign/PLAN.md`. Where this document and those mockups differ, the mockups' CSS is the source of truth. `design/reference.html` (the original mockup) is **superseded for the public site**.

---

## 0. Direction in one line

Warm editorial — a calm, reading-first blog with a serif voice and warm paper in light mode, and a **warm** (not cold) dark mode where the accent shifts to amber. Reading comfort comes first; personality is carried by typography and a single restrained accent, never by heavy UI.

**Hard design rules**
- Reading experience is the priority. Generous spacing, one comfortable column, no clutter.
- One accent only. Use it sparingly (eyebrows, link hover, pullquote rule, hover states, the primary button on hover). Never fill large areas with it.
- Full light **and** dark mode, both first-class. Dark stays in the warm family — never a cold near-black.
- No templated defaults: no emoji section markers, no gradient hero, no rounded-everything, no accent rail on every card.

---

## 1. Colour tokens

Define every colour as a CSS custom property on `:root` (light values), then redefine the tokens for dark under both `@media (prefers-color-scheme: dark){ :root:not([data-theme="light"]) }` and `:root[data-theme="dark"]`. Set `color-scheme: dark` in both dark blocks. `body` always takes `background` and `color` from tokens.

### Light (default)
| Token | Value | Use |
|---|---|---|
| `--bg` | `#F5F1E8` | page background (warm paper) |
| `--surface` | `#FBF8F1` | cards, figures, author card (was `#FFFFFF`) |
| `--tint` | `#EDE5D3` | inline code background, toggle track, pill hover |
| `--fg` | `#211B12` | primary text (warm ink) |
| `--muted` | `#6F6553` | meta, captions, nav |
| `--border` | `#E4DBCB` | rules, dividers, card edges |
| `--accent` | `#9C3B1B` | clay — pullquote rule, borders |
| `--accent-ink` | `#9C3B1B` | eyebrows, link hover (equal to `--accent`) |
| `--code-bg` | `#2A2317` | code block (dark in light mode too) |
| `--code-fg` | `#EADFC9` | code text |
| `--code-line` | `#3D3322` | code bar divider |
| `--band` | `#211B12` | research band background (dark in both themes) |
| `--band-fg` | `#F5F1E8` | text on the band |
| `--band-muted` | `#BDB19B` | muted text on the band |
| `--band-line` | `#3A3023` | hairlines on the band |
| `--band-accent` | `#E59A5E` | accent on the band |

### Dark
| Token | Value | Use |
|---|---|---|
| `--bg` | `#191510` | warm deep charcoal |
| `--surface` | `#221C14` | cards, figures, author card |
| `--tint` | `#2A2318` | inline code background, toggle track, pill hover |
| `--fg` | `#ECE3D2` | warm off-white text |
| `--muted` | `#A79B84` | meta, captions, nav |
| `--border` | `#332A1E` | rules, dividers, card edges |
| `--accent` | `#E59A5E` | amber — unified with `--accent-ink` (was `#E08A4C`) |
| `--accent-ink` | `#E59A5E` | eyebrows, link hover |
| `--code-bg` | `#120E09` | code block |
| `--code-fg` | `#E7DDC8` | code text |
| `--code-line` | `#2A2318` | code bar divider |
| `--band` | `#120E09` | research band background |
| `--band-fg` | `#ECE3D2` | text on the band |
| `--band-muted` | `#A79B84` | muted text on the band |
| `--band-line` | `#2A2318` | hairlines on the band |
| `--band-accent` | `#E59A5E` | accent on the band |

The header and the safe-area paint use `--bg` (they previously reused `--band`).

### Code syntax colours (same in both themes — they sit on the dark code block)
| Role | Value |
|---|---|
| keyword | `#E59A5E` |
| type / class | `#E3C58A` |
| function / class name | `#F4EAD5` (weight 500) |
| string | `#B8C08A` |
| comment | `#8C8066` (italic) |
| number | `#DD9A72` |

(Target values from the redesign; applied to the Shiki theme in Phase B.)

---

## 2. Typography

Three roles, loaded from Google Fonts. Always declare the fallback stack.

| Role | Face | Weights | Fallback |
|---|---|---|---|
| Display + body | **Newsreader** (serif, variable with `opsz` axis) | 300–700, + italic | `"Iowan Old Style", Georgia, serif` |
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

### Redesign type scale (target, 5 Nov 2026)

These supersede the rows above as each redesign phase lands (post-page rows in Phase B, home in Phase C). Large display text uses `font-variation-settings: "opsz" 72`.

| Element | Spec |
|---|---|
| Home hero display | `clamp(52px, 9.2vw, 124px)`, line-height .95, letter-spacing -.035em, weight 400; second line italic in `--accent` |
| Post title | `clamp(40px, 6vw, 78px)`, line-height 1, letter-spacing -.032em, weight 400, opsz 72 |
| Post dek | `clamp(21px, 2.2vw, 27px)`, line-height 1.45, italic, `--muted`, max-width 32em |
| Post body | 20.5px / 1.72 (mobile may drop to 19px / 1.65) |
| Post lead | 27px / 1.5, letter-spacing -.008em, drop cap (4.7em, `--accent`, weight 500) |
| Post h2 | `clamp(30px, 3.2vw, 40px)`, line-height 1.15, letter-spacing -.022em, weight 500, numbered marker above, hover `#` anchor |
| Pull quote | `clamp(28px, 3.1vw, 42px)` italic, 3px `--accent` left rule, breaks out right by 176px on wide screens |
| Eyebrow / labels | Inter 12.5px, 600, `.14em`–`.16em` tracking, uppercase |
| Brand | Newsreader 25px, 500, letter-spacing -.015em |
| Nav | Inter 12.5px, 500, `.14em` tracking, uppercase |
| Inline code | JetBrains Mono .82em, `--tint` background, radius 5px, no border, padding `.12em .4em` |
| Code block | JetBrains Mono 15.5px / 1.7 |

Global polish: `text-wrap: balance` on display text, titles, h2, pull quotes and card titles; `text-wrap: pretty` on paragraphs; `font-variant-numeric: tabular-nums` on dates, numbers and the TOC; `font-feature-settings: "kern","liga","calt"`; `::selection` is the accent at 24% via `color-mix`; focus ring `2px solid var(--accent)`, `outline-offset: 3px`, radius 6px.

### Post Content Typography (In-article elements)
| Element | Face | Size | Weight | Line height | Notes |
|---|---|---|---|---|---|
| Section heading (h2) | Newsreader | 28px | 500 | 1.2 | `letter-spacing:-.01em`; margin `44px 0 12px` |
| Sub-heading (h3) | Newsreader | 22px | 500 | 1.25 | margin `32px 0 10px` |
| Lists (ul, ol) | Newsreader | 18px | 400 | 1.64 | `padding-left:1.4em`; `6px` between items |
| In-body links | Newsreader | inherit | inherit | inherit | 1px underline in `--accent-ink`, `text-underline-offset: 3px`, hover `--accent-ink` |
| Inline code | JetBrains Mono | 0.82em | 400 | inherit | `--tint` background, no border, radius `5px`, padding `.12em .4em`; inline only (`.article :not(pre) > code`), never inside `<pre>` |
| Strong & emphasis | Newsreader | inherit | 600 (strong) / italic (em) | inherit | — |
| Divider (hr) | — | 1px | — | — | hairline in `--border`, margin `32px 0` |

---

## 3. Layout, spacing, radius

- **Site max width:** 1200px (header, footer, home sections).
- **Reading column max width:** 680px (the article itself — keeps lines ~65–72 chars).
- **Side gutter:** `max(clamp(20px, 5vw, 56px), env(safe-area-inset-left/right, 0px))` — never less than 20px.
- **Spacing scale (px):** 4, 8, 12, 16, 20, 24, 30, 44, 60. Use flex/grid with `gap`, not stacked margins.
- **Radius:** 16px for cards, figures and the author card; 18px for the post cover; 12px for code blocks; `999px` for pills, buttons and the toggle. No radius on rules or the page itself.
- **Shadow:** one soft hover shadow only, never at rest: `0 18px 40px -22px rgba(33,27,18,.3)` on cards, `0 24px 48px -24px rgba(33,27,18,.28)` on the home feature image. Dark mode uses the same shadow with `rgba(0,0,0,.5)`. Hairline borders (`--border`) remain the default separator.

---

## 4. Components

Exact CSS for each is in the redesign mockups (`docs/redesign/mockup/`); for anything they do not cover, `reference.html`. Summary of intent:

- **Skip link:** "Skip to content" is the first focusable element on public pages, hidden until focused, and targets `<main id="main">`.
- **Masthead (header):** frosted sticky bar, `top: env(safe-area-inset-top,0px)`, background `color-mix(in srgb, var(--bg) 86%, transparent)` with `backdrop-filter: saturate(1.4) blur(14px)`, hairline bottom border. Brand (name, Newsreader 25px 500) left; nav + theme toggle right. Nav links get an accent underline that scales in from the left (.25s) on hover/focus. Paint the safe-area band with `body::before` (in `--bg`) so nothing scrolls under the system bar. Nav: Blog · Writing · Portfolio · About. **Portfolio** is an external link with a `↗` marker, opens in a new tab.
- **Theme toggle:** a switch (`role="switch"`, constant accessible name "Dark mode", `aria-checked` carries the state): a 38×22 track in `--tint` with an accent knob that slides 16px, plus a visible label showing the current theme ("Light" / "Dark"). Minimum height 44px. Persists choice in `localStorage.blogTheme` (wrapped in try/catch), defaults to the system theme.
- **Article:** eyebrow (tag) → h1 → meta row (date · read time) → hairline rule → lead paragraph → body. Pullquote has a 2px `--accent` left rule and is italic.
- **Code block:** a `figure` with a caption bar (filename, Inter, on `--surface`) above a `--code-bg` `<pre>`. Dark in **both** themes. Horizontal scroll inside the block only (`overflow-x:auto`). Syntax colours per §1.
- **Image figure:** full-column image with a short Inter caption beneath. Images are optional and can appear at any point in the body (per the PRD). In the mockup this is a placeholder; real posts use `![alt](/images/name.png)`.
- **"More from the blog" cards:** two-column grid (one column under ~560px), hairline-separated. Each: eyebrow + Newsreader title + one-line Inter description. Title shifts to `--accent-ink` on hover. No border, no shadow — separated by whitespace.
- **Footer:** hairline top border, `--bg`. Left: one-line bio (bold name in `--fg`, rest `--muted`). Right: LinkedIn · GitHub · Email, with an accent underline on hover. A small © line (year + name) sits below.
- **Writing page (per PRD):** reuse the eyebrow + Newsreader title + Inter meta pattern. Each entry: title, venue + year (meta style), one-line note, external link (`↗`). Same accent and spacing rules.
- **About page:** standard article column; the same type scale and rhythm as a post.

---

## 5. Behaviour & accessibility

- Respect `prefers-reduced-motion` — see Motion below.
- Visible keyboard focus state on every link, button and the toggle.
- Hover states use `--accent-ink` for text, never a background fill.
- `font-variant-numeric: tabular-nums` anywhere digits align in columns.
- Keep contrast legible in both themes; the accent must stay readable on both backgrounds (the dark accent is deliberately lighter than the light one for this reason).

### Motion (subtle, functional)

Every animation must help the reader do or understand something; otherwise drop it. Full spec in `docs/redesign/PLAN.md` §5.

- **Easing:** one curve, `cubic-bezier(.16, 1, .3, 1)`, for entrances and the toggle knob; `ease` for colour and border changes.
- **Page-load rise** (hero and post header only, once): opacity 0→1, translateY 14px→0, .9s, staggered `.05 .18 .34 .48 .62s`. **Hero line reveal:** masked lines slide up, 1.1s, second line +.14s.
- **Theme cross-fade:** `background-color, border-color, color` over .45s, applied only after the first client render (`theme-ready` on `<html>`), public pages only.
- **Hover:** nav underline sweep (.25s); cards lift 3px with the soft shadow (.3s); feature image scales 1.03 over 1.1s; index rows indent 12px with an accent hairline sweep (.6s); buttons lift 1px and fill accent, `scale(.98)` when pressed.
- **State, not decoration:** reading-progress bar and TOC active section on the post page; code Copy button flips to "Copied" for ~1.6s.
- **Reduced motion:** removes the rise, line reveal, hover transforms and sweeps; colour transitions and the toggle knob become near-instant; smooth scrolling and view transitions are disabled. Progress bar and TOC highlighting stay.
- No parallax, no scroll-jacking, no autoplay, no animation on admin pages.

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
- [2026-11-05] Elevated the design: bigger type, 3-column post, functional motion. Surface warmed to `#FBF8F1`, new `--tint` and band tokens, dark accent unified to `#E59A5E`, one soft hover shadow replaces "no shadows", larger radii. `design/reference.html` superseded for the public site by `docs/redesign/mockup/`.