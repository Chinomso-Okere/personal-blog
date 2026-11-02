# Technical PRD — Personal AI Technical Blog

**Owner:** Nonso (Chinomso Okere)
**Date:** 2 November 2026
**Status:** Draft for review
**Companion to:** `product-prd.md` (the *what* and *why*) and `design-spec.md` (the visual system). This document is the *how* — the build spec for the coding agent (Gemini, in Antigravity IDE).
**Instruction to the building agent:** Build **one phase at a time**, in the order below. At the end of each phase, stop at the stated check and wait for human approval before starting the next. Never build ahead. Keep to the hard rules in §7.

---

## 1. Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js (latest stable, App Router)** | Server + client in one project; native to Vercel. |
| Language | **TypeScript** | Type safety; standard for Next.js. |
| Styling | **Tailwind CSS** | Fast, consistent, responsive. |
| Content format | **Markdown / MDX files in the repo** | Posts are files. Portable, versioned, owned. |
| Hosting | **Vercel** | Hosts the site and the serverless API routes. |
| Registrar | **Namecheap** | Domain only; DNS points at Vercel. |
| AI | **Anthropic Claude API** | Server-side only. Drafts posts. |
| Repo writes | **GitHub API (via Octokit)** | How the admin publishes — see §3. |
| Auth | **Single-admin credentials + signed session cookie** | One user (me). See §5. |

Lock exact versions at Phase 0 and record them in the context file (`GEMINI.md`).

## 2. Folder structure (starting shape)

```
/
├── app/                      # Next.js App Router
│   ├── (public)/             # Public site
│   │   ├── page.tsx          # Home
│   │   ├── blog/             # Blog list + [slug] post pages
│   │   ├── writing/          # Writing (published work elsewhere)
│   │   └── about/            # About
│   ├── admin/                # Protected admin area
│   │   ├── login/
│   │   └── draft/            # Paste source → draft → edit → publish
│   └── api/                  # Serverless routes (see §4)
│       ├── draft/
│       ├── publish/
│       ├── upload-image/
│       ├── login/
│       └── logout/
├── content/
│   ├── posts/                # One markdown file per post
│   ├── writing.json          # Entries for the Writing page
│   └── writing-instructions.md  # THE writing-instruction prompt (first-class)
├── public/
│   └── images/               # Post images, committed to repo
├── components/               # Header, Footer, PostCard, etc.
├── lib/                      # claude.ts, github.ts, auth.ts, posts.ts
├── design/
│   └── reference.html        # Approved design mockup (source of truth for styling)
├── middleware.ts             # Protects /admin
├── .env.local                # Secrets (gitignored) — never committed
└── GEMINI.md                 # Context file Antigravity reads (status, rules, decisions)
```

## 3. Content model & how publishing works

**A post is a single markdown file** at `content/posts/<slug>.md` with frontmatter:

```yaml
---
title: "Post title"
slug: "post-title"
date: "2026-11-02"
description: "One-line summary for SEO and cards."
tags: ["ai", "engineering"]   # optional
coverImage: "/images/xyz.png" # optional
published: true               # false = draft, not shown publicly
---

Body in markdown. Images inserted inline as ![alt](/images/name.png)
at any point the author chooses.
```

**Publishing flow (the key architectural decision):**

1. In the admin draft screen, the finished post exists as markdown text + frontmatter in the browser.
2. On **Publish**, a server-side API route uses the GitHub API to **commit** the file to `content/posts/<slug>.md` in the repo (images likewise to `public/images/`).
3. The commit triggers a **Vercel redeploy**, which rebuilds the site with the new post included.
4. The post is live within ~1 minute.

**Why this way:** Vercel's runtime filesystem is read-only, so the app cannot write posts to its own repo directly. Committing via the GitHub API is the standard git-backed-CMS pattern. It preserves the markdown-in-repo benefits (portability, version history, full ownership) while allowing a hosted admin to publish. Trade-off accepted: publish is not instant (deploy latency), and a scoped GitHub token is required. Recorded in §9.

**Writing page & About:** static content for MVP. `writing.json` holds the list of published work (title, venue, year, one-line note, external URL). About is a simple page/markdown. Both edited as files + redeploy — no admin UI needed (revisit only if it becomes a chore).

## 4. API routes (all server-side)

| Route | Method | Input | Does |
|---|---|---|---|
| `/api/login` | POST | password | Verifies against hashed env var; sets signed httpOnly session cookie. |
| `/api/logout` | POST | — | Clears session. |
| `/api/draft` | POST | `{ sourceType, sourceText }` | Loads `writing-instructions.md`, builds the prompt, calls Claude, returns `{ draft }`. |
| `/api/publish` | POST | `{ frontmatter, body }` | Commits markdown file to repo via GitHub API. |
| `/api/upload-image` | POST | image file(s) | Commits image(s) to `public/images/`, returns the markdown tag/URL. |

All AI and GitHub calls happen in these routes only. Keys never reach the browser.

## 5. Auth & permissions

- **One admin (me).** No public sign-up, no other roles.
- Login: a password checked (hashed, e.g. bcrypt) against a value in an environment variable. On success, set a **signed, httpOnly, secure session cookie** (short-lived JWT or equivalent).
- `middleware.ts` guards every `/admin/*` route and every mutating API route — unauthenticated requests are redirected/rejected.
- Alternative if OAuth is wanted later: Auth.js (NextAuth). Not needed for MVP.

## 6. The writing-instruction prompt (core quality component)

- Lives in `content/writing-instructions.md`, loaded by `/api/draft` and prepended to every generation.
- Contents: my voice and tone, target audience, required post structure, formatting rules, length guidance, things to avoid, and **1–2 full sample posts in my voice** as style anchors.
- Treated as a real feature: versioned in the repo, iterated on deliberately. Draft quality rises and falls with this file more than with anything else in the build.

## 7. Hard rules (the agent must never break these)

- **No secret ever reaches client-side code or the repo.** Claude API key, GitHub token, admin password/hash, session secret live only in `.env.local` (local) and Vercel environment variables (hosted).
- **All Claude and GitHub calls are server-side**, in `/api` routes.
- `.env.local` and any secret file are in `.gitignore`. Confirm they don't appear before the first commit.
- **Least privilege:** the GitHub token is a fine-grained token scoped to **this repo only**, contents read/write — nothing more.
- **Nothing auto-publishes.** A post only goes live on an explicit human Publish action after review.
- Set a **monthly spend limit** on the Claude API key before any generation is wired up.
- Validate and sanitise admin inputs; the admin area is for me, but treat inputs defensively anyway.

## 8. Implementation order (phased — build one at a time, each ends in a check)

**Phase 0 — Scaffold & deploy pipeline**
Set up the Next.js + TypeScript + Tailwind project, private GitHub repo, and a Vercel project auto-deploying from main. Point the Namecheap domain at Vercel with HTTPS.
*Check:* a blank/placeholder site is live on the real domain over HTTPS, and a push to main redeploys it.

**Phase 1 — Public blog shell (static, no AI, no auth)**
Build the layout (header with nav: Blog · Writing · Portfolio · About; footer with bio + links), all public pages, and markdown post rendering from `content/posts/`. Match `design-spec.md` / `design/reference.html` exactly (tokens, type scale, both light and dark themes). Portfolio = external link, new tab. Seed 1–2 hand-written markdown posts. Responsive + SEO basics (per-page title/description, clean URLs).
*Check:* I can browse Home, Blog, a Post, Writing, About on desktop and mobile; posts render from markdown; Portfolio opens externally; it matches the approved design in both themes.

**Phase 2 — Admin auth & shell**
Login page, session cookie, `middleware.ts` protecting `/admin`. Empty admin landing page behind the login.
*Check:* only a logged-in user reaches `/admin`; wrong/no password is rejected; logout works.

**Phase 3 — AI drafting (core loop, no publishing yet)**
Admin draft screen: text input + source-type selector (Topic / Document / Transcript). `/api/draft` loads the writing-instruction prompt, calls Claude, returns a draft into an editable field. Claude key in env, spend limit set.
*Check:* I paste a source, choose its type, and get an on-brand draft I can edit on screen. No post is saved yet.

**Phase 4 — Publish (commit to repo)**
`/api/publish` commits the edited draft as a markdown file (with frontmatter) to the repo via the GitHub API; the redeploy makes it live. GitHub token in env, scoped to this repo.
*Check:* full loop works end to end — paste → draft → edit → publish → a real post appears on the Blog after redeploy.

**Phase 5 — Images**
`/api/upload-image` commits uploaded image(s) to `public/images/` and returns the markdown tag; I insert it at any chosen point in the post body. Images optional; optional cover image via frontmatter.
*Check:* a post with an image inserted after a specific paragraph renders correctly on the live site; a post with no images still works.

**Phase 6 — Post management (should-haves, split as needed)**
Edit/update a published post; delete/unpublish; keep drafts (`published: false`); regenerate from the same source; tags/categories.
*Check:* each sub-feature verified on the live site before moving on.

MVP = Phases 0–5. Phase 6 is the next tier.

## 9. Decisions log

**Architecture & product**
- [2026-11-01] Chose **build in code** over assembling from off-the-shelf tools — ownership, design control, custom AI pipeline, portfolio value.
- [2026-11-01] Chose **Claude API** for drafting — billing already set up.
- [2026-11-01] Chose **markdown files in repo** over a database — portability, simplicity, ownership; fine for a solo blog.
- [2026-11-01] Chose **Vercel** over Netlify — native Next.js fit, server-side API routes for the AI call in one project.
- [2026-11-02] Chose **single-input + source-type selector** over three separate input flows — one mechanism, three modes; simpler.
- [2026-11-02] Chose **git-backed publishing** (commit via GitHub API → redeploy) over writing files at runtime — Vercel's runtime FS is read-only; this keeps markdown-in-repo while allowing a hosted admin. Accepted trade-off: ~1-min publish latency + a scoped GitHub token.
- [2026-11-02] Chose **markdown-tag images with an upload helper** over a rich-text editor for MVP — insert-anywhere control without building a complex editor. Rich editor deferred.
- [2026-11-02] Chose **images stored in repo** over a CDN for MVP — simplest; revisit if image volume grows.
- [2026-11-02] Chose **single-admin credentials + signed cookie** over Auth.js/OAuth — one user; keep it light but secure.
- [2026-11-02] Chose **`GEMINI.md`** as the context file (not `CLAUDE.md`) — Antigravity reads `GEMINI.md` in the repo root automatically.

**Design** (full detail in `design-spec.md`)
- [2026-11-02] Chose **Warm Editorial (Direction A)** as the base — reading-first, serif, warm paper; best fit for a technical blog where long-form text and code dominate.
- [2026-11-02] Folded in **a characterful dark mode** from Direction C, kept **warm** (brown-charcoal, not cold black) so it stays in A's family; accent shifts clay → amber on dark. Otherwise kept A pure.
- [2026-11-02] Chose **serif for body as well as headlines** (Newsreader) — the editorial reading feel depends on it.
- [2026-11-02] Chose **a dark code block in both themes** — keeps code legible and reads as deliberate.
- [2026-11-02] Chose **hairline borders over shadows** for separating elements — quieter, more editorial.

## 10. Accounts & secrets to have ready (human task, before Phase 3–4)

- GitHub — private repo + a fine-grained personal access token (this repo, contents read/write).
- Vercel — project linked to the repo; environment variables for all secrets.
- Anthropic — Claude API key **with a monthly spend limit set**.
- Namecheap — domain, DNS pointed at Vercel.

Secrets go in `.env.local` and Vercel env vars only. Never in code or the repo.