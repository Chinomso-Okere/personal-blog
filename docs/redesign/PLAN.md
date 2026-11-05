# Redesign build plan: "elevated warm editorial"

**Owner:** Nonso (Chinomso Okere) · **Status:** direction approved (5 Nov 2026) · **Builder:** Claude Code in VS Code
**Reference mockups (read these, they are the source of truth for look and motion):**
- `docs/redesign/mockup/Main.dc.html`: Home
- `docs/redesign/mockup/Post.dc.html`: Post page
- `docs/redesign/mockup/System.dc.html`: design language board (tokens, type, components, motion)

The mockups are `.dc.html` files from a design canvas. Read the `<helmet><style>` block for every value (colours, sizes, easing, delays) and the markup for structure. Ignore `support.js`, `{{template}}` bindings, `/_blob/` image paths and the `DCLogic` script: they only exist inside the canvas. Port the CSS and structure into the Next.js site; do not copy the files into `app/`.

---

## 0. What this is, and what it is not

**Is:** a visual and interaction upgrade of the public site (Home, Post, header, footer, cards, theme toggle). Same warm editorial identity, evolved: larger and more confident type, a real hero, a 3-column post layout with a table of contents, a code block with filename bar and Copy button, and restrained, functional motion.

**Is not:** a change to content, data, publishing or the admin. Do not touch: `lib/github.ts`, `lib/publish.ts`, `lib/manage.ts`, `lib/post-input.ts`, `lib/frontmatter.ts`, `lib/auth.ts`, `lib/session.ts`, `proxy.ts`, `app/api/**`, `app/admin/**`, `components/PostEditor.tsx`, `components/AdminPostList.tsx`, the five `scripts/test-*.mjs` suites. The admin keeps working and keeps looking as it does now (see "Admin isolation" below).

## 1. Working rules (read first)

1. **Plan first.** Before changing anything in a phase, post a short plan (files you will touch, anything in this document you would decide differently) and wait for Nonso's approval.
2. **One phase at a time, in order. Stop at each phase's check and wait.** Never build ahead.
3. **Do not commit or push.** Nonso reviews the diff and commits himself. Leave the working tree uncommitted at the end of each phase.
4. **Never read, print or edit `.env.local`** or any secret file.
5. **Real data only.** No invented posts, dates, titles, counts, bios or links. Where the mockup shows a placeholder (`Part 2 · [title to come]`, `[date to come]`), keep it visibly a placeholder or leave it out (see phase notes). Dates come from the post's real `date`.
6. **After every phase run:** `npm run lint`, `npm run build`, and all five test suites (`test:safety`, `test:auth`, `test:post`, `test:publish`, `test:manage`). Report results honestly, including warnings.
7. **No new dependencies** unless a phase says so or Nonso approves. Everything here is CSS plus a few small client components.
8. Keep components small and readable. Comments only where the reason is not obvious.

## 2. Current code you are building on (verified 5 Nov 2026)

- `app/layout.tsx`: loads Newsreader (with `opsz` axis, normal + italic), Inter (400/500/600), JetBrains Mono (400/500) via `next/font/google` as CSS variables; theme bootstrap script sets `data-theme` from `localStorage.blogTheme`. Root `robots: noindex` is intentional until launch. Leave it.
- `app/globals.css` (559 lines): tokens on `:root`, dark under `@media (prefers-color-scheme: dark) :root:not([data-theme="light"])` and `:root[data-theme="dark"]`; Tailwind v4 `@theme` aliasing; `@layer base` and `@layer components` holding `.masthead`, `.nav`, `.toggle`, `.article*`, `.pull`, `figure.code`, `.more`, `.cards`, `.card`, `footer`, `.foot*`.
- `components/`: `Header`, `Footer`, `PostCard`, `ThemeToggle` (uses `useSyncExternalStore`, `data-theme` on `<html>`, `localStorage.blogTheme`), `ExternalArrow`.
- `app/(public)/page.tsx` (home), `app/(public)/blog/page.tsx`, `app/(public)/blog/[slug]/page.tsx`, `about`, `writing`.
- `lib/markdown.ts`: unified pipeline remark → rehype → **custom Shiki theme "warm-editorial"** → **rehype-sanitize** → stringify. First paragraph gets class `lead`; blockquote gets class `pull`; fenced code becomes `<figure class="code">` with optional `<div class="cap">` from `title="..."`.
- `lib/writing.ts` reads `content/writing.json` (entries: title, type, venue, year, status `published|accepted`, note, optional url). **This is the real data for the Research band.**
- `lib/site.ts`: name, tagline ("Applied AI, evidence first."), description, bio, links. `links.portfolio` is empty, so Portfolio stays hidden.
- Post type has: title, slug, date, description, tags (max 3 from ALLOWED_TAGS), coverImage, coverImageAlt, originalUrl, readingTime. **There is no `series` field.**

## 3. Design tokens (target)

Replace the colour block in `globals.css`. Keep the existing variable names (`--bg`, `--surface`, `--fg`, `--muted`, `--border`, `--accent`, `--accent-ink`, `--code-bg`, `--code-fg`, `--band`) so nothing else breaks, and add the new ones.

| Token | Light | Dark | Notes |
|---|---|---|---|
| `--bg` | `#F5F1E8` | `#191510` | paper |
| `--surface` | `#FBF8F1` | `#221C14` | **changed from `#FFFFFF`**: cards, figures, author card |
| `--tint` (new) | `#EDE5D3` | `#2A2318` | inline code bg, toggle track, pill hover |
| `--border` | `#E4DBCB` | `#332A1E` | hairlines |
| `--fg` | `#211B12` | `#ECE3D2` | ink |
| `--muted` | `#6F6553` | `#A79B84` | |
| `--accent` | `#9C3B1B` | `#E59A5E` | **dark accent unified to `#E59A5E`** (was `#E08A4C`; `--accent-ink` was `#E59A5E`). Set `--accent` and `--accent-ink` equal in both themes. |
| `--code-bg` | `#2A2317` | `#120E09` | |
| `--code-fg` | `#EADFC9` | `#E7DDC8` | |
| `--code-line` (new) | `#3D3322` | `#2A2318` | code bar divider |
| `--band` | `#211B12` | `#120E09` | **research band is dark in BOTH themes**; keep `--band` as the dark band colour. Previously `--band` was reused for the header and safe-area paint: re-point those to `--bg`. |
| `--band-fg` (new) | `#F5F1E8` | `#ECE3D2` | |
| `--band-muted` (new) | `#BDB19B` | `#A79B84` | |
| `--band-line` (new) | `#3A3023` | `#2A2318` | |
| `--band-accent` (new) | `#E59A5E` | `#E59A5E` | |

Shadow: the old spec said "no shadows". The new rule is **one soft hover shadow only**: `0 18px 40px -22px rgba(33,27,18,.3)` on cards, `0 24px 48px -24px rgba(33,27,18,.28)` on the home feature image, appearing on hover, never at rest. Dark mode uses the same shadow with higher alpha (`rgba(0,0,0,.5)`). Radii: 16px for cards/figures/author card, 18px for the post cover, 12px for code blocks, 999px for pills/buttons/toggle. Hairline borders remain the default separator.

Shiki code token colours (update the `warm-editorial` theme in `lib/markdown.ts`; **do not change the pipeline or the sanitiser**): keyword `#E59A5E`, type/class `#E3C58A`, function and class name `#F4EAD5` (weight 500), string `#B8C08A` (keep), comment `#8C8066` italic (keep), number `#DD9A72` (keep). Where Shiki scopes cannot express "type", approximate with `entity.name.type`, `support.type`, `entity.name.class`.

## 4. Typography (target)

Fonts unchanged (Newsreader, Inter, JetBrains Mono, already loaded). Use the `opsz` axis: large display text uses `font-variation-settings: "opsz" 72`. Add Newsreader weight 300–700 range if the current `next/font` config restricts weights (it currently requests the variable font with `opsz`, so verify the weight range is available).

| Element | Spec |
|---|---|
| Home hero display | `clamp(52px, 9.2vw, 124px)`, line-height .95, letter-spacing -.035em, weight 400; second line italic in `--accent` |
| Post title | `clamp(40px, 6vw, 78px)`, line-height 1, letter-spacing -.032em, weight 400, opsz 72 |
| Post dek (description) | `clamp(21px, 2.2vw, 27px)`, line-height 1.45, italic, `--muted`, max-width 32em |
| Post body | 20.5px / 1.72 (mobile may drop to 19px / 1.65) |
| Post lead | 27px / 1.5, letter-spacing -.008em, **drop cap** via `::first-letter` (4.7em, `--accent`, weight 500, float left) |
| Post h2 | `clamp(30px, 3.2vw, 40px)`, line-height 1.15, letter-spacing -.022em, weight 500, with a small numbered marker above (`01`, `02`…, Inter 12.5px, 600, .16em tracking, `--accent`) and a hover-revealed `#` anchor |
| Pull quote | `clamp(28px, 3.1vw, 42px)` italic, 3px `--accent` left rule, breaks out right by 176px on wide screens |
| Eyebrow / labels | Inter 12.5px, 600, `.14em`–`.16em` tracking, uppercase |
| Nav | Inter 12.5px, 500, `.14em` tracking |
| Inline code | JetBrains Mono .82em, `--tint` background, radius 5px, **no border**, padding `.12em .4em` |
| Code block | JetBrains Mono 15.5px / 1.7 |

Global polish: `text-wrap: balance` on display text, titles, h2, pull quotes, card titles; `text-wrap: pretty` on paragraphs; `font-variant-numeric: tabular-nums` on dates, numbers, TOC; `font-feature-settings: "kern","liga","calt"`; `::selection` = accent at 24% via `color-mix`.

## 5. Motion spec (subtle, functional)

Every animation must answer "what does this help the reader do or understand?" If it does not, drop it.

- **Easing:** the single curve `cubic-bezier(.16, 1, .3, 1)` for entrances and the toggle knob; `ease` for colour/border changes.
- **Page-load rise:** `@keyframes rise` (opacity 0→1, translateY 14px→0, .9s) with staggered delays `.05 .18 .34 .48 .62s` (`.d1`–`.d5`) on the hero and post header only. Runs once on load.
- **Hero line reveal:** each hero line is masked (`.ln` overflow hidden) and slides up (`lineup`, 1.1s, second line +.14s).
- **Theme cross-fade:** `background-color, border-color, color` .45s ease on everything (`:where(*)` so specificity stays zero). Respect that this can flash on first paint: apply the transition **only after** the first client render (e.g. add a `theme-ready` class on `<html>` after mount) so there is no animated flash from the bootstrap script.
- **Header:** frosted sticky (`color-mix(in srgb, var(--bg) 86%, transparent)` + `backdrop-filter: saturate(1.4) blur(14px)`), hairline bottom border; nav links get an accent underline that scales in from the left (.25s) on hover/focus.
- **Theme toggle:** a switch (`role="switch"`, `aria-checked`), 38×22 track in `--tint`, accent knob that slides 16px (.4s, the curve above), plus the "Dark"/"Light" label. Min target height 44px.
- **Reading progress (post page only):** a 3px bar under the header whose width follows scroll through the article. Implement with a small client component using a passive scroll listener + `requestAnimationFrame` (or CSS `animation-timeline: scroll()` with a JS fallback). Hide it when the article is short enough not to scroll.
- **TOC active section:** `IntersectionObserver` on the article's h2s; the matching TOC link gets `.on` (accent left border, `--fg`, weight 600). Clicking scrolls smoothly to the heading (with `scroll-margin-top` to clear the sticky header).
- **Code Copy button:** copies the code text via `navigator.clipboard`, label flips to "Copied" for ~1.6s (`data-done="yes"`, accent border/text). Must degrade silently if the clipboard API is unavailable.
- **Cards and figures:** card `translateY(-3px)` + soft shadow + border to `--muted` on hover (.3s). Home feature image: border to `--muted`, soft shadow, image `scale(1.03)` over 1.1s on hover; title underline sweeps in (`background-size` 0→100%, .35s); arrow nudges 5px right.
- **Numbered index (home):** row padding-left grows to 12px on hover, a 1px accent hairline sweeps across the bottom edge (.6s), arrow moves 4px and turns accent.
- **Buttons:** hover lifts 1px and fills accent; active `scale(.98)`; arrow glyph nudges 4px.
- **View transitions between routes:** enable `experimental.viewTransition` in `next.config.ts` (React 19.3 / Next 16 support it) **only if** it works cleanly in `next build`; use a short (≈250ms) cross-fade of the main content and keep the header persistent. If it is flaky, skip it and say so. It is a nice-to-have, not a requirement.
- **Reduced motion:** `@media (prefers-reduced-motion: reduce)` removes the rise, line reveal, hover transforms and sweeps, makes the toggle knob and colour transitions near-instant, and disables smooth scrolling and the view transition. Progress bar and TOC highlighting stay (they are state, not decoration).
- No parallax, no scroll-jacking, no autoplay, no animation on admin pages.

## 6. Admin isolation

The admin pages live under `app/admin/**` and currently inherit global styles. After the token and type changes, they must look **unchanged or better, never broken**. Rules:
- Do not apply the new rise/line animations or the progress bar to admin routes.
- If a global rule (`footer`, `.card`, `.toggle`, `body::before`, inline-code tint) leaks into admin and changes its look, scope the new rule to the public layout (a wrapper class on `app/(public)/layout.tsx`, e.g. `.site`) rather than editing admin components.
- Spot-check `/admin`, `/admin/new`, `/admin/edit/<slug>` in light and dark.

---

## Phase 0: housekeeping (small)

1. If `CLAUDE.md` does not exist: create it from `GEMINI.md` (this repo's standing context). Rename "GEMINI.md" references, keep every hard rule, the "one phase at a time" rule, stack, commands, security rules and the current-status section, and add: "Redesign in progress: read `docs/redesign/PLAN.md`; mockups in `docs/redesign/mockup/`." Then delete `GEMINI.md`. Check the `@`-imports still point to real files (`design/reference.html` is the OLD mockup: mark it as superseded by the redesign mockups for the public site once Phase A lands).
2. Add a short "Redesign" section to the project status noting phases A–D and that each stops for approval.

**Check:** `CLAUDE.md` exists, imports resolve, `GEMINI.md` gone, lint/build/tests unchanged.

## Phase A: tokens, type, global styles, header, footer, toggle

**Build**
1. Rewrite the colour tokens in `globals.css` per §3 (light, both dark blocks, `[data-theme="light"]` block). Keep names; add the new tokens. Extend `@theme` aliases for `tint`, `band-*`, `code-line`.
2. Apply the type system and global polish from §4 (`text-wrap`, tabular nums, selection, focus ring `2px solid var(--accent)`, `outline-offset: 3px`, radius 6px).
3. **Fix the inline-code tint leak:** the tinted pill style must apply only to inline code: use `.article :not(pre) > code`, and also ensure Shiki's `<code>` inside `<pre>` has no background, padding or border. Verify on the live post's code blocks in light and dark (earlier mockup bug: tint leaked into the dark block).
4. Header: frosted sticky with hairline, brand 25px weight 500 letter-spacing -.015em, nav with underline-sweep links, new switch-style `ThemeToggle` (keep the `useSyncExternalStore` logic and `localStorage.blogTheme`; change the markup and add `role="switch"`, `aria-checked`, label text). Add the "skip to content" link (first focusable element, visible on focus) and `id="main"` on the `<main>`.
5. Footer: spacing and type per mockup (`.foot` top border, bio left, links right with accent underline on hover, © line below).
6. Header width: widen the site container to 1200px with `clamp(20px, 5vw, 56px)` gutters (keep safe-area-inset handling). Post reading column stays 680px.
7. Add `theme-ready` class logic so theme cross-fade does not animate on first paint.
8. **Update `design-spec.md`** to match this plan: new tints and surface, unified dark accent, band tokens, the "one soft hover shadow" rule replacing "no shadows", radii, hero/post type scale, motion spec and reduced-motion rules, and a decisions-log entry dated 5 Nov 2026 ("Elevated the design: bigger type, 3-column post, functional motion"). Mark `design/reference.html` as superseded for the public site.

**Check (stop here):** lint, build, five test suites green. In the browser, in **both themes**: header, footer, toggle (keyboard + click + reduced motion), existing home/blog/post pages still render without layout breakage, admin pages unchanged. Report anything you decided differently.

## Phase B: post page (the most important page)

**Build** (`app/(public)/blog/[slug]/page.tsx`, `app/globals.css`, small client components under `components/`)
1. **Header block:** kicker line (`primaryTag` uppercase accent · dot · real meta), huge title, italic dek (= `post.description`), byline row with initials avatar "CO" (no photo exists), "Chinomso Okere", real `formatDate(post.date)`, `post.readingTime`, bordered top and bottom. Staggered `rise` entrance (d1–d4).
2. **Cover:** `post.coverImage` in a 1100px-max container, 18px radius, 1px border, hover border to `--muted`. Alt from `coverImageAlt`. Keep `<img>` (eslint-disable comment as today) unless `next/image` is already a clean fit.
3. **3-column grid** (`minmax(0,1fr) minmax(0,680px) minmax(0,1fr)`, 56px gap) at ≥1100px; single column below. Col 1: sticky TOC (190px, `top: 96px`). Col 2: article. Pull quotes and wide figures break out right by 176px at ≥1100px, zero below.
4. **TOC + numbered h2s without breaking the pipeline:** do **not** change the sanitiser's allowed output beyond what you need. Preferred approach: add a small rehype step in `lib/markdown.ts` that (a) gives each `h2` a stable slug `id` (lowercase, hyphenated, de-duplicated), (b) wraps nothing else. Add `id` to the sanitiser's allowed attributes for `h2`/`h3` only, using the default `clobberPrefix` behaviour *deliberately*: sanitise IDs consistently so the TOC links resolve (verify in a test render, since `rehype-sanitize` prefixes IDs with `user-content-` by default; either set `clobber: []` for headings or generate the TOC hrefs with the same prefix). Return the heading list (`{id, text}`) alongside the HTML so the TOC is built server-side. Numbering (`01`, `02`) and the `#` anchor are CSS/markup added by the rehype step or by CSS counters (`counter-increment` on h2, `::before { content: counter(h2, decimal-leading-zero) }`): CSS counters are simpler and keep the HTML clean.
5. **Drop cap + lead:** keep the existing `lead` class from `remarkEnhancements`; add `::first-letter` styling. Guard: only apply the drop cap when the lead paragraph starts with a letter (CSS can't test this; if the first character is a quote/number/code, the large first-letter looks wrong, so add a `data-dropcap` flag in the rehype step when the first text char matches `/[A-Za-z]/`).
6. **Code blocks:** restyle `figure.code` to the mockup: 12px radius, dark in both themes, bar with filename (JetBrains Mono 12.5px, `#A79B84`) on `--code-bg` with `--code-line` divider, Copy button on the right (36px high). When a block has no `title`, show a bar with only the language label (or hide the bar and float the Copy button top-right); decide and tell me. The Copy button is a tiny client component attached by event delegation on the article container (no changes to sanitiser: the button is rendered client-side, not in the markdown HTML). Horizontal scroll stays inside `<pre>`. Check long lines on mobile.
7. **Body figures:** images in markdown (`![alt](/images/...)`) get a bordered, rounded (16px) wrapper and break out right by 176px on wide screens. If the markdown pipeline outputs a bare `<img>`, wrap it in a `figure` in the rehype step and use the alt text as a visible caption (Inter 13.5px, `--muted`) **only if** that reads well; otherwise leave captionless and say so.
8. **Reading progress bar** and **TOC active tracking** per §5. TOC hidden below 1100px; consider a collapsed "On this page" disclosure above the article on mobile (optional: propose, don't assume).
9. **End mark** (`✦ ✦ ✦`-style, accent, letter-spaced; use plain characters such as `•••` or a CSS-drawn glyph, not an emoji) after the article.
10. **Author card** below the article: initials avatar (56px), name, one short bio from `siteConfig.bio`, link to `/about` in accent. No invented claims.
11. **"More from the blog"** → "Keep reading" pair of cards using the new card style. Real posts only; with one post total, render nothing (no ghost cards on the real site).
12. **Series navigation:** the mockup shows a series kicker and a "Part 2 · [title to come]" ghost card. The data model has no series field. **Do not build this in Phase B.** Propose a small optional-`series` addition in a separate, approved step (see Phase E) so the admin validation and editor are handled deliberately.
13. Make sure the not-found page (`app/not-found.tsx`) picks up the new type and spacing.

**Check (stop here):** the live post "My AI build playbook, part 1" renders correctly, both themes, at 1440 / 1024 / 768 / 390 px widths. Code block (with and without `title`), pull quote, figure, lists, links all look right; TOC highlights while scrolling and links scroll to the right place; progress bar tracks; Copy works; keyboard: tab order is skip link → header → TOC → article links → Copy buttons; reduced motion respected. `[CHECK:` publish blocking still works (run `test:publish`). Lint, build, tests green.

## Phase C: home page, blog index, writing, about

**Build**
1. **Hero** (`app/(public)/page.tsx`): eyebrow ("Applied AI researcher · Business analyst · Scotland"), two-line display headline using `siteConfig.tagline` split at the comma: "Applied AI," / *"evidence first."* (italic accent); lede on the right (reuse the existing real intro copy, shortened to the mockup's wording only if Nonso approves; otherwise keep his existing paragraph), primary button "Read the writing →" (`/blog`), text link "Research papers →" (`/writing`). Line-reveal + rise animation.
2. **Topic pills:** the mockup shows the 8 allowed tags as pills. Only render them as links if a tag filter exists. **Check `app/(public)/blog/page.tsx`.** If there is none, propose adding a minimal `/blog?tag=` filter (server-side, no JS) as a small separate step; until approved, render the pills as non-interactive labels without hover affordance, or skip the row. Do not ship pills that look clickable and do nothing.
3. **Latest:** the newest published post as the feature (cover image left, text right, hover behaviour per §5). If the post has no cover, fall back to a text-only feature. If more than one post exists, show the next ones as a compact list below the feature. **No "Next in the series" slot unless it is real data** (skip it; see Phase E).
4. **Research band** (dark in both themes) from `getWritingEntries()` (real `content/writing.json`): year, title, one-line note, status chip ("Published" filled amber, "Accepted · awaiting publication" outlined). Link a row to `url` when present. Do not edit the JSON content.
5. **"What I write about"** numbered index (01–05). Content is the five areas from `product-prd.md`; copy the wording from the PRD, not from memory. Arrows/hover affordance only if each row has a destination; otherwise render as a quiet static list.
6. **About strip:** large statement + "More about me →" link to `/about`. Use the real About copy; do not write new biography.
7. **Blog index** (`/blog`): same card system, large page title, count of posts, list rows with date, tag, title, description, read time. **Writing** and **About** pages: apply the new type scale and spacing; no layout redesign beyond what falls out of the tokens.
8. Empty states: with zero posts the home page still looks intentional (hero + research + about; no broken feature).

**Check (stop here):** home, blog, writing, about in both themes at 1440 / 1024 / 768 / 390 px; hero animation plays once and never replays on theme toggle; reduced motion shows everything static; no horizontal scroll at 390px; Lighthouse accessibility ≥ 95 on home and the post page (report the actual scores); lint, build, tests green.

## Phase D: polish and verification

1. Colour contrast pass: muted text on paper and on the dark band, accent on paper, accent on dark, button text, both themes (aim for WCAG AA on all text; report any failure and propose the smallest token tweak).
2. Mobile pass: touch targets ≥ 44px, no sticky elements covering content, safe-area insets, long titles/URLs wrapping, code block scroll.
3. Performance: no layout shift from fonts (check `next/font` `display: swap` and fallback metrics), no large unused CSS, the scroll listener is passive and rAF-throttled, no animation on the main thread that is not transform/opacity.
4. Remove dead CSS from the old design (old `.rule`, old `.more h2` styles, etc.) once nothing references it.
5. Final report: what changed per file, anything deferred, known issues, and screenshots or a description of each page in both themes.

**Check (stop here):** all checks above green; Nonso reviews on his phone (the production-style `npm run build && npm start` is the right way to judge motion).

## Phase E (optional, only if Nonso asks): series support

Add an optional `series` (name) and `seriesPart` (number) to the front matter, validated in `lib/post-input.ts` and parsed in `lib/posts.ts` (new tests in `test:post`), editable in `PostEditor`, and shown as the kicker line plus "In this series" navigation (previous/next real posts; an explicit dashed "Next · coming" card is **only** rendered if Nonso supplies a title and date in the post's front matter). This touches the admin and validation, so it needs its own plan and approval.

---

## Acceptance (whole redesign)

- Both themes first-class; no cold greys; contrast AA.
- Public pages visibly match the approved mockups; any deliberate difference is listed in the final report.
- Admin works exactly as before; all five suites green; `npm run build` clean.
- Motion is subtle, uses one easing curve, and is fully disabled under `prefers-reduced-motion`.
- No invented content anywhere; every number, date, title and link on the site is real or absent.
- Nothing committed or pushed by the agent.
