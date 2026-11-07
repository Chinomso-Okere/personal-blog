---
title: "A self-owned blog with a paste-and-publish admin"
slug: "blog-platform"
summary: "The site you're on: a technical blog where a post is pasted, previewed and published from a phone, with git as the content store and no database."
type: "build"
status: "Live"
date: "2026-11"
role: "Product owner and builder, working with AI coding agents"
stack: ["Next.js", "TypeScript", "Tailwind CSS", "GitHub API", "Vercel"]
links:
  live: "https://chinomsookere.co.uk"
  repo: "https://github.com/Chinomso-Okere/personal-blog"
  post: "/blog/ai-build-playbook-part-1"
featured: true
order: 2
published: true
---

## Problem

I wanted my writing on a site I own, replacing Medium, without running a database or a heavyweight CMS. It also had to be practical: I draft with AI help, review it myself, and often publish from my phone.

## Approach

- **Content in git.** Posts are markdown files in the repository. The private admin commits them through the GitHub API, and Vercel redeploys, so every change has history and there is nothing extra to host.
- **A safe publishing path.** Login with a signed session cookie, origin checks on every write, strict validation of each post, a sanitised markdown pipeline, and a rule that blocks publishing while any `[CHECK:` marker is left in a draft.
- **Built the way I build everything.** Product and technical documents first, then a phased build with AI coding agents, each phase planned, reviewed, tested and checked before the next. The method is in [my AI build playbook](/blog/ai-build-playbook-part-1).
- **A designed reading experience.** A warm editorial design system with full dark mode, a table of contents and reading progress on posts, and motion that is switched off for people who prefer reduced motion.

## Evidence

- Live at chinomsookere.co.uk, publishing real posts end to end.
- Five automated test suites covering markdown safety, authentication, post validation, publishing and post management.
- Lighthouse, measured during the build: accessibility 100 on desktop and mobile; performance 98–99 on desktop and 86 on mobile.
- Zero measured layout shift on the home page and post pages, on desktop and phone.

## What it doesn't show

- It is single-author: one admin account, no comments and no newsletter.
- Publishing depends on GitHub and a scoped access token, and a new post takes about a minute to appear while the site redeploys.
- The scores above come from Lighthouse's lab tests at build time, not from real-visitor data.
