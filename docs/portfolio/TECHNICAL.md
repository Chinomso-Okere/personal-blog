# Portfolio — technical document and build plan

**Owner:** Chinomso Okere · **Date:** 6 Nov 2026 · **Status:** draft for approval
**Read first:** `CLAUDE.md`, `docs/portfolio/PRODUCT.md`, `design-spec.md`. Builder: Claude Code. Reviewer: Claude (chat).

## 1. Rules (unchanged from the blog)

Plan first and wait for approval · one phase at a time, stop at each check · no commit or push by the agent · never read `.env.local` · real data only · lint, build and all test suites after every phase · report honestly · reuse existing components and tokens; no new fonts, colours or dependencies without asking.

## 2. Routes

- `app/(public)/portfolio/page.tsx` — index.
- `app/(public)/portfolio/[slug]/page.tsx` — case study; `generateStaticParams`, `dynamicParams = false`.
- `app/(public)/cv/page.tsx` — CV.
All static at build time, inside the public layout (header, footer, theme, view transitions).

## 3. Content model

One file per project: `content/projects/<slug>.md`, parsed only through `lib/frontmatter.ts` (the safe gray-matter wrapper).

```yaml
---
title: "Persona-driven feedback agents for high-stakes documents"   # required, ≤ 120
slug: "gtv-feedback-agents"         # required, ^[a-z0-9]+(?:-[a-z0-9]+)*$, ≤ 80, = filename
summary: "One sentence, ≤ 200 chars" # required (cards, meta description)
type: "research"                    # required: research | build | proof-of-concept
status: "Published"                 # required, short label: Published | Accepted | Live | Proof of concept
date: "2026"                        # required, YYYY or YYYY-MM (real; use the year alone when the month isn't known); sorting
role: "Co-author"                   # optional
venue: "IEEE AAIML 2026"            # optional (research)
stack: ["CrewAI", "OpenAI o3-mini"] # optional, ≤ 8 items
links:                              # optional; every value https only
  paper: "https://doi.org/..."
  repo: "https://github.com/..."
  live: "https://..."
  post: "/blog/<slug>"              # internal path allowed for post only
cover: "/images/..."                # optional, /images/ or https; coverAlt required with it
coverAlt: "..."
featured: true                      # optional; featured first, then date desc
published: true                     # required; false hides the entry everywhere
---
## Problem
...
## Approach
...
## Evidence
...
## What it doesn't show
...
```

- `lib/projects.ts`: `getAllProjects()` (published only, sorted featured → date desc → title), `getProjectBySlug()`, and a pure `validateProject()` with the same strictness as `lib/post-input.ts` (impossible dates rejected, unknown keys rejected, https-only links, slug = filename). Invalid files fail the build with a clear message naming the file and field.
- Body rendered through the existing `renderMarkdown()` (same sanitiser; no schema changes). The four H2 sections are expected; a missing "What it doesn't show" section fails validation for type `research` and `proof-of-concept`.
- Tests: add a `test:projects` suite (or assertions in `test:post`): valid fixture passes; bad slug, bad date, http link, unknown type, cover without alt, missing limitations section, draft excluded.

## 4. Pages

**Index (`/portfolio`)**
- Hero: eyebrow "Portfolio", one positioning line (copy to be approved), short lede.
- Cards in the existing card style: type + status kicker, title, summary, date, venue/role, small link icons (paper / repo / live). Whole card links to the case study.
- Filter tabs by type only when there are > 6 published entries (built now, hidden below the threshold).
- Capabilities strip (copy from the CV skills, to be approved).
- Closing block with two routes: "Hiring? See my CV" (→ `/cv`) + LinkedIn; "Work with me" (→ About's work-with-me section or email).

**Case study (`/portfolio/<slug>`)**
- Reuses the post page's header pattern and `.article` typography (single column, no drop cap, no TOC unless ≥ 4 H2s).
- Meta strip: type · status · date · venue · role · stack chips.
- Link buttons: Read the paper ↗ / View code ↗ / Live site ↗ / Related post. External links open in a new tab with hidden "(opens in new tab)". Accepted papers without a link show "Accepted, link coming".
- "What it doesn't show" section styled as a distinct, quiet panel (it's the differentiator).
- Prev/next project navigation.

**CV (`/cv`)**
- Content from `content/cv.md` (front matter + markdown), drafted in `docs/portfolio/drafts/cv.md`.
- Print stylesheet: single column, light theme forced, no header/footer/nav, A4 margins, links printed as text.
- "Save as PDF" button calls `window.print()` (no new dependency). A generated PDF file is a later option.
- No phone number, no home address.

## 4b. Motion (richer than the blog, same rules)

Nonso wants the portfolio to feel more alive than the blog. Every motion must still help the reader (continuity, orientation, feedback), use the site's one easing curve (`--ease-out`), animate only `transform` and `opacity`, run once, and be fully disabled under `prefers-reduced-motion` (content shown in its final state).

- **Index hero:** the home page's line reveal + staggered rise, reused.
- **Cards enter on scroll:** each card rises and fades in as it enters the viewport, staggered by about 60ms per card within a row, once only. Prefer CSS scroll-driven animation (`animation-timeline: view()`) with an `IntersectionObserver` fallback; content must be visible without JS.
- **Card hover/focus:** lift (−4px) with the soft shadow, cover image scale 1.03, title underline sweep, arrow nudge (the existing feature-card language).
- **Card → case study continuity:** a shared-element view transition so the clicked card's title (and cover, when present) morphs into the case study header, using React's `<ViewTransition name>` already in use for route cross-fades. Back navigation reverses it.
- **Filter tabs (when shown):** a sliding active indicator, and cards reflow smoothly when the filter changes (view transition on the list), never a hard jump.
- **Case study sections:** each H2 section fades up as it enters; the "What it doesn't show" panel draws its accent rule from top to bottom on entry; stack chips stagger in.
- **No:** parallax, scroll-jacking, counting-up numbers (numbers are evidence and must read correctly at all times), autoplay, cursor effects.
- *Check:* measure layout shift (must stay 0), verify reduced-motion shows final states, and check 60fps-safe properties only.

## 5. SEO, sharing, linking

- Sitemap: `/portfolio`, every published project, `/cv`.
- Canonicals and `pageMetadata()` for all new pages; branded OG cards via the existing versioned `/og/...` route (label "Portfolio" / project type), or the project cover when present.
- JSON-LD: `CollectionPage` on the index; `CreativeWork` per project (with `author` Person, `url`, `sameAs` the paper DOI when present). CV: `ProfilePage` with the existing `Person`.
- `siteConfig.links.portfolio = "/portfolio"`; Header and About render it as an internal link (no new-tab, no ↗) when it starts with `/`.
- RSS unchanged (projects are not posts).

## 6. Phases (each ends with a check and a stop)

**Phase 0 — make the blog repo safe to publish.** Before the repo goes public: scan the full git history for secrets (e.g. `npx gitleaks@<pinned> detect` or an equivalent history grep for token patterns, `.env`, keys). Report findings; change nothing in history. Also add a pointer to `docs/portfolio/` and a portfolio status line to `CLAUDE.md`. *Check:* clean report, or a list of exposures with a remediation plan (rotate first, then rewrite history only if needed). Nonso flips the repo to public himself.

**Phase 1 — content model.** `lib/projects.ts`, validation, tests, the five draft files moved into `content/projects/` (after Nonso approves the text), `content/cv.md`. No UI. *Check:* tests pass; build fails clearly on a deliberately broken fixture (scratch copy only).

**Phase 2 — case study page.** `/portfolio/[slug]`, metadata, OG, JSON-LD, sitemap. *Check:* all five render at 1440 and 390 in both themes; links correct; zero layout shift; no PDFs linked.

**Phase 3 — index page and navigation.** `/portfolio`, cards, hidden-until-needed filters, routes block, header link internal, About button internal. *Check:* first screen measured at 1440×900 and 390; tab order; 44px targets.

**Phase 4 — CV page.** `/cv`, print stylesheet, Save as PDF. *Check:* screen render both themes; print preview to PDF on A4 (Chrome) is one or two clean pages; no phone or address anywhere in the HTML.

**Phase 5 — polish and launch.** Contrast, Lighthouse, LinkedIn Post Inspector on `/portfolio`, one case study, `/cv`; `CLAUDE.md` status and decisions log updated.

## 7. Open items

1. ~~Triage repo link~~ — **decided:** no repo link in v1 (the repo name contains "Silverpath"); revisit if renamed.
2. ~~Public CV email~~ — **decided:** use the site's existing email (`siteConfig.links.email`); the CV must read it from there so a future company address changes in one place.
3. ~~Design mockup~~ — **decided:** no separate mockup; built from existing approved components, reviewed by rendering each phase. Motion per §4b.
4. **Approval of all draft texts** in `docs/portfolio/drafts/` before Phase 1 moves them into `content/`.
