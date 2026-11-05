# CLAUDE.md — Personal AI Technical Blog

Standing context for this project. Read this first, every session.

## What this is

A personal, self-owned AI technical blog for Nonso Okere — a public reading-first
website plus a private admin back-end where a post (drafted externally in a Claude
Project or Gemini notebook) is pasted, edited, previewed, and published. Part of a
professional visibility push.

## The planning documents (authoritative — read before building)

- @product-prd.md — what and why: features, pages, journeys, scope, done.
- @technical-prd.md — how: stack, folder structure, content model, API routes,
  auth, security rules, and the **phased implementation order**.
- @design-spec.md — the visual system: colour tokens (light + dark), type scale,
  spacing, components.
- @design/reference.html — the original approved design mockup. **Superseded for
  the public site** by the redesign mockups in `docs/redesign/mockup/` (5 Nov 2026);
  still the reference for anything the redesign does not cover.

Redesign in progress: read `docs/redesign/PLAN.md`; mockups in `docs/redesign/mockup/`.

> If you place these in a `/docs` folder instead of the repo root, update the
> paths above to match.

## How to work on this project (the single most important rule)

**Build one phase at a time, in the order in `technical-prd.md` §8. Stop at each
phase's stated check and wait for my approval before starting the next. Never
build ahead.** At the start of a phase, give me your plan and anything in the
docs you'd decide differently, then wait. At the end of a phase, propose the
update to the "Current status" section below.

## Stack & conventions

- Next.js (App Router) + TypeScript + Tailwind CSS (v4 via `@tailwindcss/postcss`). Hosted on Vercel.
- Blog posts are **markdown files in the repo** under `content/posts/`.
- Publishing commits files to the GitHub repo via the GitHub API (see dead ends).
- Match the design system in `design-spec.md` exactly. Do not add new fonts,
  accents, shadows, or radii without asking.
- Keep components small and readable. Prefer clarity over cleverness.

## Commands

- Dev server: `npm run dev`
- Production build: `npm run build`
- Lint: `npm run lint`
- Tests: `npm test` (once set up)

## Hard rules (never break these)

- **No secret ever reaches client-side code or the repo.** The GitHub token,
  admin password/hash, and session secret live only in `.env.local` (local) and
  Vercel environment variables (hosted).
- **All GitHub API calls are server-side**, in `/api` routes only.
- `.env.local` and any secret file are in `.gitignore`. Confirm they do not
  appear in `git status` before the first commit.
- **Least privilege:** the GitHub token is a fine-grained token scoped to this
  repo only, contents read/write — nothing more.
- **Nothing auto-publishes.** A post goes live only on an explicit human Publish
  action, after review.
- **Parse front matter only through `lib/frontmatter.ts`; never call `gray-matter` directly.**
- Validate and sanitise admin inputs, even though the admin area is single-user.
- Every admin page and every mutating API route verifies the session itself; never rely on the guard file alone.
- Never trust request headers for auth or routing decisions; use route groups and session checks.
- Vercel environment variables take the UNescaped bcrypt hash (`.env.local` uses `\$` because Next.js expands `$` in local env files).

## Current status

- **Phase:** Phases 0 to 5 complete and live.
- **Done:**
  - Phase 0: scaffold, initial folder structure with .gitkeep placeholders, production build & lint verified, remote GitHub repo linked, live deployment verified on Vercel over HTTPS (https://personal-blog-omega-flax.vercel.app/).
  - Phase 1 (committed as 4245122): design tokens, fonts, header/footer/theme toggle, markdown pipeline with Shiki + rehype-sanitize, blog listing + post pages with SSG, custom 404, Writing page backed by content/writing.json, About page backed by content/about.md, SEO basics (title template, per-page canonicals, OpenGraph, sitemap.ts), site-wide noindex + robots disallow-all.
  - Phase 2: admin auth & shell (verified live on Vercel over HTTPS; the repo is now private). Features proxy.ts route guard, jose session tokens (HS256, 8h expiry, payload.admin verification), fail-closed rate-limited /api/login and /api/logout with Origin verification, route groups (protected) and login, scripts/hash-password.mjs (raw mode, no-echo, 16-char min, 72-byte max), and test:auth test suite.
  - Phase 3: Post editor and preview (`/admin/new`, `/api/parse`, `/api/preview`, `lib/frontmatter.ts`, `lib/post-input.ts`, `lib/reading-time.ts`, `components/PostEditor.tsx`, `test:post` suite).
  - Phase 4: Publish (`/api/publish`, `lib/github.ts`, `lib/publish.ts`, cache-busted post-publish polling, inline overwrite modal with live-to-draft warnings, `test:publish` suite).
  - Phase 5: Manage posts (`/admin`, `/admin/edit/[slug]`, `/api/posts`, `/api/posts/[slug]`, `lib/manage.ts`, `components/AdminPostList.tsx`, `test:manage` suite).
  - First post published: "My AI build playbook, part 1: the model is the easy part".
  - Self-hosted `/images/` covers allowed (alongside https cover URLs).
  - Redesign ("elevated warm editorial", `docs/redesign/PLAN.md`), phases 0 and A to D, built and checked (5 Nov 2026):
    - A: new tokens (warmer surface, `--tint`, band tokens, unified dark accent), frosted sticky header, switch-style theme toggle, skip link, footer, 1200px container.
    - B: post page with 3-column layout, sticky TOC (closed disclosure on phones), reading progress, numbered h2s with anchors, drop cap, code blocks with Copy, figure breakouts, author card. Heading IDs are added after sanitising; schema fingerprint is asserted in `test:safety`.
    - C: home (hero capped at 96px, Latest feature, dark research band from `writing.json`, "What I write about" from `about.md`, About strip), `/blog` rows, Writing and About restyled.
    - D: contrast AA on every measured pair, full-size image links, 44px touch targets on coarse pointers, zero layout shift, route cross-fade, dead CSS removed. Lighthouse accessibility 100 on home and post.
    - D follow-up: local `/images/` covers served through `next/image` (quality 90, ~2x variants on desktop so diagram text stays crisp; `https` covers stay plain `<img>`), body figures lazy-loaded. Mobile Lighthouse performance: home 85 -> 86 (median of 3), post 77 -> 86.
- **Next:** awaiting Nonso's review. Open options: `/blog/tag/[tag]` pages; series support (PLAN Phase E); not preloading the Newsreader italic font (skipped for now).
- **Locked versions & environment:**
  - Node.js: `v24.22.1`
  - `next`: `16.4.4`
  - `react`: `19.3.0`
  - `react-dom`: `19.3.0`
  - `typescript`: `5.9.3`
  - `tailwindcss`: `4.3.4`
  - `@tailwindcss/postcss`: `4.3.4`
  - `postcss`: `8.5.3`
  - `eslint`: `9.39.5`
  - `eslint-config-next`: `16.4.4`
- **Tailwind approach:** Tailwind CSS v4 configured via `@tailwindcss/postcss`.
  No `tailwind.config.ts`. Design tokens live in CSS using `@theme` and CSS custom
  properties. Dark mode will respond to both `prefers-color-scheme: dark` and
  `[data-theme="dark"]`, per `design-spec.md`.

## Pre-launch checklist

Everything that must change before the site goes public:
- [ ] Remove site-wide noindex from root metadata in `app/layout.tsx`
- [ ] Change `app/robots.ts` to allow search indexing and add the sitemap line
- [x] Delete both [Sample post] files in `content/posts/`
- [ ] Set `NEXT_PUBLIC_SITE_URL` to the real production custom domain in Vercel project environment variables
- [ ] Add the Portfolio URL to lib/site.ts (the nav link then appears automatically)
- [ ] Add the About photo at public/images/chinomso-okere.jpg
- [ ] Add the ICSRS paper URLs to content/writing.json when proceedings are published
- [ ] Confirm the CausalAgentBench title matches the camera-ready version
- [ ] Confirm the AAIML DOI resolves

## Checkpoint (c) notes

The Writing page lists three research papers. Only the Persona-Driven Feedback Agents paper has a link (https://doi.org/10.1109/AAIML67890.2026.11498196). The other two show their titles with 'Link coming soon'.

## Phase 4 notes

Frontmatter dates must always be written as quoted strings (YYYY-MM-DD); the publish route must enforce this and validate the slug with the same pattern as lib/posts.ts.
The publish route must REFUSE to publish if the body contains the text [CHECK: (case-sensitive) and tell the author to resolve every marker first.

## Dead ends (approaches that failed — do not retry)

- **Do not write post files to the Vercel runtime filesystem.** It is read-only
  at runtime, so the running app cannot save posts to its own repo. Publishing
  must commit to GitHub via the API, which triggers a redeploy. (Decided in
  `technical-prd.md` §3.)
- **Do not use `@tailwindcss/turbopack` loader bridge on Windows with Node 24.**
  Turbopack's IPC to child node processes for webpack loaders fails on Windows/Node 24
  (`node process exited before we could connect to it with exit code: 0`). Use
  standard `@tailwindcss/postcss` with `postcss.config.mjs` and
  `experimental: { turbopackPluginRuntimeStrategy: "forceWorkerThreads" }`.

## Decisions log

The running "why we chose X" log lives in `technical-prd.md` §9 and
`design-spec.md` §7. Add new decisions there as they're made, one line each.
- [2026-11-02] Chose **Tailwind CSS v4 with `@tailwindcss/postcss`** — standard PostCSS integration prevents child-process IPC crashes in Turbopack on Windows. Tokens defined in CSS (`@theme`).
- [2026-11-02] **Deferred custom domain purchase** — deployed initially to Vercel default URL (`personal-blog-omega-flax.vercel.app`) with HTTPS; custom domain will be mapped via DNS once acquired (IONOS/other).
- [2026-11-04] Dropped in-app AI drafting; posts are drafted outside (Claude Project / Gemini notebook) and pasted into an admin form. Simpler, no API key or spend, better drafting tools exist; code snapshot kept at tag phase-3-ai-drafting.
- [2026-11-04] Dropped image upload; images are links only (https URLs or static repo assets).
- [2026-11-04] Commit drafts with published: false to the repo via GitHub Contents API rather than client storage — versioned, portable, and allows unpublishing live posts.
- [2026-11-04] Phase 5 manage posts: direct GitHub Contents API reads with bounded concurrency (5) and 100-file cap. Server fetches current SHA and title for deletion. Unpublish/publish round-trips body exactly without tag-filtering. Edit mode automatically generates preview on load.
- [2026-11-04] Commit drafts with published: false to the repo via GitHub Contents API rather than client storage — versioned, portable, and allows unpublishing live posts.
