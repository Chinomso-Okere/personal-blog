# Technical PRD — Personal AI Technical Blog

**Owner:** Nonso (Chinomso Okere)
**Date:** 2 November 2026 (Updated 4 November 2026)
**Status:** In implementation
**Companion to:** `product-prd.md` (the *what* and *why*) and `design-spec.md` (the visual system). This document is the *how* — the build spec for the coding agent (Gemini, in Antigravity IDE).
**Instruction to the building agent:** Build **one phase at a time**, in the order below. At the end of each phase, stop at the stated check and wait for human approval before starting the next. Never build ahead. Keep to the hard rules in §7.

---

## 1. Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js (latest stable, App Router)** | Server + client in one project; native to Vercel. |
| Language | **TypeScript** | Type safety; standard for Next.js. |
| Styling | **Tailwind CSS** | Fast, consistent, responsive. |
| Content format | **Markdown files in the repo** | Posts are files. Portable, versioned, owned. |
| Hosting | **Vercel** | Hosts the site and the serverless API routes. |
| Registrar | **Namecheap** | Domain only; DNS points at Vercel. |
| Repo writes | **GitHub API (via Octokit)** | How the admin publishes — see §3. |
| Auth | **Single-admin credentials + signed session cookie** | One user (me). See §5. |

Lock exact versions at Phase 0 and record them in the context file (`GEMINI.md`).

## 2. Folder structure

```
/
├── app/                         # Next.js App Router
│   ├── (public)/                # Public site
│   │   ├── page.tsx             # Home
│   │   ├── blog/                # Blog list + [slug] post pages
│   │   ├── writing/             # Writing (published work elsewhere)
│   │   └── about/               # About
│   ├── admin/                   # Protected admin area
│   │   ├── (protected)/         # Layout with session verification
│   │   │   ├── page.tsx         # Admin landing page
│   │   │   └── new/page.tsx     # Post editor (/admin/new)
│   │   └── login/               # Admin login
│   └── api/                     # Serverless routes (see §4)
│       ├── parse/               # Frontmatter parser (safe wrapper)
│       ├── preview/             # Server markdown renderer
│       ├── publish/             # GitHub commit publisher (Phase 4)
│       ├── login/
│       └── logout/
├── content/
│   ├── posts/                   # One markdown file per post
│   └── writing.json             # Entries for the Writing page
├── docs/
│   └── writing-instructions.md  # Reference style guide for external drafting
├── public/
│   └── images/                  # Static assets committed to repo
├── components/                  # Header, Footer, PostCard, PostEditor, etc.
├── lib/                         # frontmatter.ts, post-input.ts, tags.ts, posts.ts, auth.ts, markdown.ts
├── design/
│   └── reference.html           # Approved design mockup (source of truth for styling)
├── proxy.ts                     # Protects /admin and /api routes (Next.js 16)
├── .env.local                   # Secrets (gitignored) — never committed
└── GEMINI.md                    # Context file Antigravity reads (status, rules, decisions)
```

## 3. Content model & how publishing works

**A post is a single markdown file** at `content/posts/<slug>.md` with frontmatter:

```yaml
---
title: "Post title"
slug: "post-title"
date: "2026-11-04"
description: "One-line summary for SEO and cards."
tags: ["AI Evaluation", "Multi-Agent Systems"]
published: true
coverImage: "https://example.com/cover.jpg"
coverImageAlt: "Diagram of system architecture"
originalUrl: "https://example.com/original-article"
---

Body in markdown. Images inserted inline as ![alt](https://image-url)
at any point the author chooses.
```

**Publishing flow (the key architectural decision):**

1. In the admin post editor screen (`/admin/new`), the finished post exists as markdown text + frontmatter in the form.
2. On **Publish**, a server-side API route uses the GitHub API to **commit** the file to `content/posts/<slug>.md` in the repo.
3. The commit triggers a **Vercel redeploy**, which rebuilds the site with the new post included.
4. The post is live within ~1 minute.

**Why this way:** Vercel's runtime filesystem is read-only, so the app cannot write posts to its own repo directly. Committing via the GitHub API is the standard git-backed-CMS pattern. It preserves the markdown-in-repo benefits (portability, version history, full ownership) while allowing a hosted admin to publish.

**Writing page & About:** static content for MVP. `writing.json` holds the list of published work. About is a simple markdown page. Both edited as files + redeploy.

## 4. API routes (all server-side)

| Route | Method | Input | Does |
|---|---|---|---|
| `/api/login` | POST | password | Verifies against hashed env var; sets signed httpOnly session cookie. |
| `/api/logout` | POST | — | Clears session. |
| `/api/parse` | POST | `{ text }` | Safe frontmatter parsing via `lib/frontmatter.ts`; returns parsed fields and body. |
| `/api/preview` | POST | `{ body }` | Renders markdown body with `renderMarkdown` and returns sanitized HTML. |
| `/api/publish` | POST | `{ fields }` | Validates post and commits markdown file to repo via GitHub API (Phase 4). |
| `/api/posts` | GET | — | Lists posts live from GitHub via Contents API with bounded concurrency (Phase 5). |
| `/api/posts/[slug]` | GET | — | Retrieves single post fields and SHA for editing (Phase 5). |
| `/api/posts/[slug]` | PATCH | `{ published }` | Toggles publication status, validates front matter without tag dropping, commits update (Phase 5). |
| `/api/posts/[slug]` | DELETE | — | Fetches file SHA and title server-side, commits file deletion via GitHub API (Phase 5). |

All GitHub calls happen in server routes only. Keys never reach the browser.

## 5. Auth & permissions

- **One admin (me).** No public sign-up, no other roles.
- Login: password checked (bcrypt, cost 12) against `ADMIN_PASSWORD_HASH`. On success, set a **signed, httpOnly, secure session cookie** (HS256, 8h expiry).
- `proxy.ts` guards every `/admin/*` route and mutating API routes. Every admin page and mutating route independently verifies the session (defense in depth).
- Fail-closed rate limiting on `/api/login` (5 attempts per 15 min per IP).
- CSRF defense: Origin header validation matching host, or Sec-Fetch-Site same-origin requirement.

## 6. External drafting (no in-app AI API)

Drafting happens outside the blog in dedicated authoring tools (a Claude Project with custom system instructions; a Gemini notebook for YouTube transcripts). The admin interface is an editorial paste-and-publish form. Reference writing instructions are preserved in `docs/writing-instructions.md`.

## 7. Hard rules (the agent must never break these)

- **No secret ever reaches client-side code or the repo.** GitHub token, admin password hash, and session secret live only in `.env.local` (local) and Vercel environment variables (hosted).
- **All GitHub API calls are server-side**, in `/api` routes only.
- `.env.local` and any secret file are in `.gitignore`. Confirm they don't appear before the first commit.
- **Least privilege:** the GitHub token is a fine-grained token scoped to **this repo only**, contents read/write — nothing more.
- **Nothing auto-publishes.** A post only goes live on an explicit human Publish action after review.
- **Parse front matter only through `lib/frontmatter.ts`; never call `gray-matter` directly.**
- Validate and sanitise admin inputs; the admin area is for me, but treat inputs defensively anyway.
- Every admin page and mutating API route verifies the session itself; never rely on the guard file alone.

## 8. Implementation order (phased — build one at a time, each ends in a check)

**Phase 0 — Scaffold & deploy pipeline**
Next.js + TypeScript + Tailwind project, private GitHub repo, Vercel project auto-deploying from main with HTTPS.

**Phase 1 — Public blog shell (static, no AI, no auth)**
Layout, all public pages, and markdown post rendering from `content/posts/`. Match `design-spec.md` / `design/reference.html`. Writing and About pages. SEO basics.

**Phase 2 — Admin auth & shell**
Login page, session cookie, route guard protecting `/admin`. Empty admin landing page behind login.

**Phase 3 — Post editor and preview (no publishing and no GitHub yet)**
Admin `/admin/new` screen with paste-a-post parsing, fields editing (title, slug, date, description, tags, cover image URL & alt, canonical URL, body, status), validation (`lib/post-input.ts`), rendered preview in `.article` styling (`/api/preview`), and collapsible generated file inspector. Image upload is dropped: images are links only (https URLs).
*Check:* I can paste a post, edit fields, see live preview and generated frontmatter, and all validations pass.

**Phase 4 — Publish (commit to repo)**
`/api/publish` commits the post as a markdown file (with frontmatter) to the repo via the GitHub API; redeploy makes it live.
*Check:* paste → edit → preview → publish → a real post appears on the Blog after redeploy.

**Phase 5 — Manage posts (list, edit, unpublish, delete)**
Admin post listing, editing existing posts, unpublishing, deleting.

## 9. Decisions log

**Architecture & product**
- [2026-11-01] Chose **build in code** over assembling from off-the-shelf tools — ownership, design control, portfolio value.
- [2026-11-01] Chose **markdown files in repo** over a database — portability, simplicity, ownership; fine for a solo blog.
- [2026-11-01] Chose **Vercel** over Netlify — native Next.js fit, server-side API routes in one project.
- [2026-11-02] Chose **git-backed publishing** (commit via GitHub API → redeploy) over writing files at runtime — Vercel's runtime FS is read-only; keeps markdown-in-repo while allowing hosted admin.
- [2026-11-02] Chose **single-admin credentials + signed cookie** over Auth.js/OAuth — one user; keep it light but secure.
- [2026-11-03] Chose **proxy.ts** over deprecated middleware.ts for route guard per Next.js 16 conventions.
- [2026-11-02] Chose **`GEMINI.md`** as the context file — Antigravity reads `GEMINI.md` in repo root automatically.
- [2026-11-04] Dropped in-app AI drafting; posts are drafted outside (Claude Project / Gemini notebook) and pasted into an admin form. Simpler, no API key or spend, better drafting tools exist; code snapshot kept at tag phase-3-ai-drafting.
- [2026-11-04] Dropped image upload; images are links only (https URLs or static repo assets).
- [2026-11-04] Commit drafts with published: false to the repo via GitHub Contents API rather than client storage — versioned, portable, and allows unpublishing live posts.
- [2026-11-04] Phase 5 manage posts: direct GitHub Contents API reads with bounded concurrency (5) and 100-file cap. Server fetches current SHA and title for deletion. Unpublish/publish round-trips body exactly without tag-filtering. Edit mode automatically generates preview on load.

**Design** (full detail in `design-spec.md`)
- [2026-11-02] Chose **Warm Editorial (Direction A)** as the base — reading-first, serif, warm paper; best fit for technical blog.
- [2026-11-02] Folded in **a characterful dark mode** from Direction C, kept **warm**; accent shifts clay → amber on dark.
- [2026-11-02] Chose **serif for body as well as headlines** (Newsreader) — editorial reading feel.
- [2026-11-02] Chose **a dark code block in both themes** — keeps code legible and deliberate.
- [2026-11-02] Chose **hairline borders over shadows** for separating elements.
- [2026-11-02] Darkened light-mode --muted to #6F6553 for WCAG AA contrast on small text.
- [2026-11-03] Defined explicit article styling for in-post headings (h2/h3), lists, in-body links, and inline code using design tokens.

## 10. Accounts & secrets to have ready (human task, before Phase 4)

- GitHub — private repo + a fine-grained personal access token (this repo, contents read/write).
- Vercel — project linked to the repo; environment variables for all secrets.
- Namecheap — domain, DNS pointed at Vercel.

Secrets go in `.env.local` and Vercel env vars only. Never in code or the repo.
