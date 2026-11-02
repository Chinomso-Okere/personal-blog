# Product PRD — Personal AI Technical Blog

**Owner:** Nonso (Chinomso Okere)
**Date:** 1 November 2026
**Status:** Draft for review
**Document type:** Product document — *what* and *why*. No code, no stack decisions. Those live in the Technical PRD.

---

## 1. Overview

A personal, self-owned blog where I publish AI technical write-ups, articles and knowledge. It replaces posting on Medium and similar platforms with a site I fully control, under my own domain and brand.

The blog has two sides:

- **A public website** — clean, well-designed, fast, and good for SEO, where readers find and read my work.
- **A private admin back-end** — where I log in, paste a source (a topic, a document, or a YouTube transcript I've copied), and an AI drafts a well-written blog post from it, following a fixed set of writing instructions in my voice. I review and edit every draft before it publishes.

## 2. Why build this (and why build, not assemble)

- **Visibility and ownership.** This is part of a deliberate push for professional visibility. Owning the platform means the audience, the SEO value, and the brand accrue to me, not to Medium.
- **Control of voice and quality.** A fixed writing-instruction prompt keeps every post sounding like me, not like generic AI output. A mandatory human edit step protects credibility.
- **It doubles as a portfolio and skills piece.** Building it in code (rather than assembling it from off-the-shelf tools) demonstrates capability, fits my AI engineering learning, and is something I could extend or adapt later.

An off-the-shelf blog (Medium, Ghost, Substack) would get me publishing faster, but would not give ownership, full design control, a custom AI drafting pipeline, or portfolio value. Those are the reasons to build.

## 3. Who it's for

- **Primary user (admin): me.** The only person who logs in, drafts, edits and publishes. Single author.
- **Audience (readers):** peers and leaders in the AI and tech community — people I want to reach through the visibility push. Technical and semi-technical readers. Also anyone who lands on a post via search or a shared link, and may click through to my portfolio, my published work, or my other ventures.

Readers are mostly on desktop and mobile; the site must work well on both.

## 4. The problem being solved

- Publishing on someone else's platform means I don't own the audience or the SEO value, and I'm bound by their design and rules.
- Writing polished technical posts from scratch, consistently, is slow — which is the real reason publishing stalls.
- I already consume good source material (things I read, documents, talks/videos) that could become posts, but turning that raw input into a finished, on-brand article is the bottleneck.

This product removes the bottleneck: paste a source, get an on-brand draft, edit, publish — on a platform I own.

## 5. Features, by priority

### Must-have (MVP — version 1 I would genuinely use)

- Public blog with a clean, well-designed, responsive layout.
- Five core pages: **Home, Blog, Writing, About, Portfolio** (see §6).
- Individual blog post pages, readable and well-formatted.
- A secure admin login (only I can reach the back-end).
- Admin draft screen: a single text input with a **source-type selector** — *Topic*, *Document*, or *Transcript*. One input mechanism, three modes.
- AI drafting: the pasted source plus my fixed writing instructions produce a full draft.
- A **writing-instruction prompt** as a first-class, editable component — this is the core quality lever, not an afterthought.
- A review/edit step: I can read, edit and revise the draft before it goes live. **Nothing auto-publishes.**
- Publish action that makes a post public on the blog.
- Good SEO basics on every public page (titles, descriptions, clean URLs).

### Should-have (next, after MVP is live)

- **Images in posts** (built as the phase straight after the core publish loop):
  - Upload one or more images in the admin screen.
  - Insert any uploaded image at any point in a post — e.g. after a chosen paragraph to illustrate it — not only as a cover image.
  - A post can have no images at all; images are optional.
  - For MVP, images are inserted via markdown image tags with an upload helper (upload → app returns the tag → paste it where you want it), and stored in the repo. A full rich-text "insert inline" editor is a later upgrade, not now.
- Optional cover/header image per post (same upload mechanism).
- Edit or update an already-published post.
- Delete / unpublish a post.
- Draft status: keep unfinished drafts without publishing.
- Regenerate / re-draft from the same source if the first draft misses.
- Tags or categories for posts.

### Nice-to-have (later)

- A full rich-text editor for inserting images and formatting inline (the slicker upgrade over the markdown-tag approach).
- A way to tweak or switch writing instructions per post (e.g. a different style for a transcript vs a topic).
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
| **Admin / Draft** | Private | Paste source + select type → generate → review/edit → publish. |

**Header (every public page):** name/logo (links home) on the left; nav on the right — Blog · Writing · Portfolio · About. Portfolio opens externally in a new tab.

**Footer (every public page):** one-line bio; professional links (LinkedIn, GitHub, email, others); copyright.

## 7. User journeys

**Reader — discovers and explores**
Lands on a post (via search or a shared link) → reads it → sees the header/footer → clicks **Writing** to see my papers and articles, or **Portfolio** to see my other work → leaves knowing who I am.

**Me — publishing a post (the core loop)**
Log in → open the draft screen → pick source type (Topic / Document / Transcript) → paste the source → generate → AI returns a draft written to my instructions → I read and edit it → publish → it appears on the Blog.

**Me — showing credibility without the AI pipeline**
Log in (or edit directly) → update the **Writing** page with a new paper or article → it's live. (This path doesn't touch the AI engine at all.)

## 8. Out of scope (explicitly not in this build)

- The **portfolio website itself** — separate project, this blog only links to it.
- Automatic YouTube transcript fetching/scraping — I copy and paste the transcript manually. No transcript API.
- Multiple authors / user accounts beyond me.
- Reader comments.
- Payments, subscriptions, paywalls.
- A mobile app.
- Anything that auto-publishes without my review.

## 9. What "done" looks like (definition of done for MVP)

- The site is live on my own domain (Namecheap) with HTTPS.
- A reader can browse Home, Blog, a Post, Writing and About, on desktop and mobile, and the design is clean and professional.
- The Portfolio nav link opens my external site in a new tab.
- Only I can log into the admin area.
- I can paste a source, pick its type, generate an on-brand draft, edit it, and publish it — and it appears on the blog.
- At least one real post, drafted through the pipeline and edited by me, is published and looks good.
- The AI drafts in my voice closely enough that editing is light, because the writing-instruction prompt is strong. The honest test: **would a reader believe I wrote it, and would someone actually want to read it?**

## 10. The one risk worth naming

The code is the easy part. The quality of the published posts rests almost entirely on the **writing-instruction prompt** plus one or two sample posts in my voice. If that's weak, the blog produces generic AI content that *damages* the visibility it's meant to build. This component gets deliberate attention and iteration — it is treated as a core feature, not configuration.