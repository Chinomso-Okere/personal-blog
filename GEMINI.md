# GEMINI.md — Personal AI Technical Blog

Standing context for this project. Read this first, every session.

## What this is

A personal, self-owned AI technical blog for Nonso Okere — a public reading-first
website plus a private admin back-end where a source (topic / document / pasted
transcript) is drafted into an on-brand blog post by the Claude API, reviewed,
edited, and published. Part of a professional visibility push.

## The planning documents (authoritative — read before building)

- @product-prd.md — what and why: features, pages, journeys, scope, done.
- @technical-prd.md — how: stack, folder structure, content model, API routes,
  auth, security rules, and the **phased implementation order**.
- @design-spec.md — the visual system: colour tokens (light + dark), type scale,
  spacing, components.
- @design/reference.html — the approved design mockup. Its CSS is the source of
  truth for exact token values and component styling.

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

- **No secret ever reaches client-side code or the repo.** The Claude API key,
  GitHub token, admin password/hash, and session secret live only in
  `.env.local` (local) and Vercel environment variables (hosted).
- **All Claude API and GitHub API calls are server-side**, in `/api` routes only.
- `.env.local` and any secret file are in `.gitignore`. Confirm they do not
  appear in `git status` before the first commit.
- **Least privilege:** the GitHub token is a fine-grained token scoped to this
  repo only, contents read/write — nothing more.
- **Nothing auto-publishes.** A post goes live only on an explicit human Publish
  action, after review.
- A monthly spend limit must be set on the Claude API key before any generation
  is wired up.
- Validate and sanitise admin inputs, even though the admin area is single-user.

## Current status

- **Phase:** Phase 1 in progress (Checkpoint a complete, awaiting user review).
- **Done:**
  - Phase 0: scaffold, initial folder structure with .gitkeep placeholders, production build & lint verified, remote GitHub repo linked, live deployment verified on Vercel over HTTPS (https://personal-blog-omega-flax.vercel.app/).
  - Phase 1 Checkpoint (a): design tokens (light & dark mode), Google Fonts (Newsreader with opsz axis, Inter, JetBrains Mono), @layer base & @layer components in globals.css, header with nav and external link hints, footer with bio from lib/site.ts, client theme toggle with zero layout shift and aria-labels, site-wide noindex and robots.ts, lib/site.ts configuration.
- **Next:** Phase 1 Checkpoint (b) — Markdown pipeline with unified/remark/rehype + Shiki, seeded sample posts, blog list page, dynamic post page [slug].
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
- [ ] Remove `robots: { index: false, follow: false }` from root metadata in `app/layout.tsx`
- [ ] Remove the disallow rule in `app/robots.ts` (allow search indexing)
- [ ] Delete all sample posts in `content/posts/`
- [ ] Replace all placeholders in `lib/site.ts` (portfolio URL, GitHub profile, LinkedIn URL, email, bio)
- [ ] Replace placeholder Home and About copy with real text
- [ ] Set `NEXT_PUBLIC_SITE_URL` to the real production custom domain in Vercel project environment variables

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
