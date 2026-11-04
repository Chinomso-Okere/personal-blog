# Product PRD — Personal AI Technical Blog

**Owner:** Nonso (Chinomso Okere)
**Date:** 1 November 2026 (Updated 4 November 2026)
**Status:** In implementation
**Document type:** Product document — *what* and *why*. No code, no stack decisions. Those live in the Technical PRD.

---

## 1. Overview

A personal, self-owned blog where I publish AI technical write-ups, articles and knowledge. It replaces posting on Medium and similar platforms with a site I fully control, under my own domain and brand.

The blog has two sides:

- **A public website** — clean, well-designed, fast, and good for SEO, where readers find and read my work.
- **A private admin back-end** — where I log in, paste or write a blog post (drafted externally in a Claude Project or Gemini notebook), review, edit, preview, and publish it. A human-first editorial back-end.

## 2. Why build this (and why build, not assemble)

- **Visibility and ownership.** This is part of a deliberate push for professional visibility. Owning the platform means the audience, the SEO value, and the brand accrue to me, not to Medium.
- **Control of voice and quality.** Drafting posts in my dedicated Claude Project and Gemini notebooks keeps every post in my voice. A mandatory human review and edit step protects credibility.
- **It doubles as a portfolio and skills piece.** Building it in code (rather than assembling it from off-the-shelf tools) demonstrates capability, fits my AI engineering learning, and is something I could extend or adapt later.

An off-the-shelf blog (Medium, Ghost, Substack) would get me publishing faster, but would not give ownership, full design control, or portfolio value. Those are the reasons to build.

## 3. Who it's for

- **Primary user (admin): me.** The only person who logs in, edits and publishes. Single author.
- **Audience (readers):** peers and leaders in the AI and tech community — people I want to reach through the visibility push. Technical and semi-technical readers. Also anyone who lands on a post via search or a shared link, and may click through to my portfolio, my published work, or my other ventures.

Readers are mostly on desktop and mobile; the site must work well on both.

## 4. The problem being solved

- Publishing on someone else's platform means I don't own the audience or the SEO value, and I'm bound by their design and rules.
- Writing polished technical posts from scratch, consistently, is slow — which is why drafting happens in dedicated AI workspaces (Claude Project, Gemini notebook).
- Once a draft exists, having a friction-free publishing pipeline that formats, previews, and commits the post to the repository makes publishing consistent.

This product provides that publishing pipeline: paste an externally drafted post, review, format/edit, preview, and publish — on a platform I own.

## 5. Features, by priority

### Must-have (MVP — version 1 I would genuinely use)

- Public blog with a clean, well-designed, responsive layout.
- Five core pages: **Home, Blog, Writing, About, Portfolio** (see §6).
- Individual blog post pages, readable and well-formatted.
- A secure admin login (only I can reach the back-end).
- Admin post editor screen (`/admin/new`): title, slug, date, description, tags, optional cover image URL & alt text, canonical URL, and markdown body.
- Paste box with frontmatter parsing: paste a full post with frontmatter or just body text to auto-populate fields.
- Preview and validation: render full post preview and validate fields before publishing. **Nothing auto-publishes.**
- Publish action that makes a post public on the blog by committing to GitHub via the API.
- Good SEO basics on every public page (titles, descriptions, clean URLs).
- Link-only images: images in posts and cover images use https URLs (or static images in `/images/`). Image upload is dropped.

### Should-have (next, after MVP is live)

- **Post management** in admin: list existing posts, edit/update published posts, unpublish/delete posts.
- **Draft status**: save posts with `published: false` in the repository without showing publicly.
- Tags filter or category views on the blog.

### Nice-to-have (later)

- Post scheduling.
- Basic analytics (views).
- RSS feed.
- Newsletter / email capture.

## 6. The screens (pages)

| Page | Type | Purpose |
|---|---|---|
| **Home** | Public | Short intro to who I am + a feed of recent posts. First impression and routing. |
| **Blog** | Public | All published posts, newest first. |
| **Post** | Public | A single blog post, cleanly formatted. |
| **Writing** | Public (internal page) | My published work *elsewhere* — IEEE paper(s), media articles, talks. Each entry links out to the real thing. A credibility page I control. |
| **About** | Public | Who I am, what I write about, professional links. |
| **Portfolio** | External link | Points out to my separate portfolio website (new tab). Built separately, not part of this project. |
| **Login** | Private | Admin sign-in. |
| **Admin / New Post** | Private | Paste post / edit fields → preview → publish (`/admin/new`). |

**Header (every public page):** name/logo (links home) on the left; nav on the right — Blog · Writing · Portfolio · About. Portfolio opens externally in a new tab.

**Footer (every public page):** one-line bio; professional links (LinkedIn, GitHub, email, others); copyright.

## 7. User journeys

**Reader — discovers and explores**
Lands on a post (via search or a shared link) → reads it → sees the header/footer → clicks **Writing** to see my papers and articles, or **Portfolio** to see my other work → leaves knowing who I am.

**Me — publishing a post (the core loop)**
Log in → open `/admin/new` → paste externally drafted post (with frontmatter or plain text) → fields auto-fill → refine title, slug, tags, description → preview in full blog styling → publish → committed to GitHub via API → redeploys and appears on Blog.

**Me — updating credibility**
Log in (or edit directly) → update the **Writing** page with a new paper or article → it's live.

## 8. Out of scope (explicitly not in this build)

- The **portfolio website itself** — separate project, this blog only links to it.
- In-app AI drafting APIs or tokens — drafting happens externally in Claude Projects / Gemini notebooks.
- Image file uploads — images are hosted via https links or static repo files.
- Multiple authors / user accounts beyond me.
- Reader comments.
- Payments, subscriptions, paywalls.
- A mobile app.
- Anything that auto-publishes without my review.

## 9. What "done" looks like (definition of done for MVP)

- The site is live on my own domain with HTTPS.
- A reader can browse Home, Blog, a Post, Writing and About, on desktop and mobile, and the design is clean and professional.
- The Portfolio nav link opens my external site in a new tab.
- Only I can log into the admin area.
- I can paste an externally drafted post into `/admin/new`, inspect the auto-parsed fields, preview the rendered post, and publish it to GitHub.
- At least one real post is published and looks good on the live site.
- The published posts maintain high quality, clear voice, and accurate claims.
