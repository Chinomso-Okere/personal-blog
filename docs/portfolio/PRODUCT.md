# Portfolio — product document

**Owner:** Chinomso Okere · **Date:** 6 Nov 2026 · **Status:** draft for approval
**Companion:** `docs/portfolio/TECHNICAL.md` (how), `docs/portfolio/drafts/` (content). Playbook stage 2.

## 1. What and why

A portfolio section of the existing blog at `chinomsookere.co.uk/portfolio`, plus a web CV at `/cv`. It proves capability with evidence, in the blog's "applied AI, evidence first" voice: each entry says what the problem was, how it was approached, what was measured, and what the evidence does **not** show.

Why build it rather than use LinkedIn or a template site: it sits on the domain that already carries the writing and research, reuses the design system and SEO already built, and makes the evidence-and-limitations format the default, which generic portfolio templates don't.

## 2. Who it's for

Employers (business analysis and applied AI roles) and organisations that might work with Chinomso, equally. Research collaborators are served by the research entries. The page leads with case studies; it ends with two routes: **Hiring? CV and LinkedIn** and **Work with me**.

## 3. Pages

| Route | Purpose |
|---|---|
| `/portfolio` | Positioning line, project cards (featured/newest first), short capabilities strip, the two routes |
| `/portfolio/<slug>` | One case study in the standard template |
| `/cv` | Web CV, print-optimised, with a "Save as PDF" button |

Header: the existing **Portfolio** link becomes internal (`/portfolio`, same tab). About's "View my portfolio" button points to `/portfolio`.

## 4. Features

**Must (v1)**
- Five entries: three papers (one published, two accepted), this blog platform, the enquiry-triage proof of concept.
- Case-study template: Problem · Approach · Evidence · What it doesn't show · Stack · Links.
- Links per entry, each optional: published paper (DOI), GitHub repo, live site, related blog post.
- **No PDFs of papers hosted or downloadable.** Papers link only to the publisher's page. Accepted papers show "Accepted, link coming" until published.
- Role shown simply (e.g. "Co-author"); no personal breakdown of contributions.
- Adding a project = adding one markdown file; cards, ordering, sitemap, OG card and JSON-LD follow automatically.
- `/cv` with no phone number or home address.
- Both themes, mobile-first, AA contrast, 44px touch targets, zero layout shift, reduced motion respected (all existing site standards).

**Should**
- Type filter (Research / Build / Proof of concept) once there are more than about six entries.
- Case study ↔ blog post cross-links.

**Nice to have (later)**
- Screenshots or diagrams per build.
- Publishing projects from the admin.
- A generated CV PDF file (instead of print-to-PDF).

## 5. Out of scope (v1)

- Hosting or embedding paper PDFs.
- Live demos hosted on the site (the triage demo is local-only by design).
- Testimonials, client logos, metrics not in a source document.
- A Silverpath case study beyond the triage proof of concept.

## 6. Content rules

- Real data only. Every number in a case study comes from the paper or the project's own acceptance documents, quoted as reported, with its limits.
- Each "What it doesn't show" section restates the source's own stated limitations.
- No naming of Silverpath on the triage entry (described as a proof of concept for a UK service business's inbound enquiries). **[confirm repo link — see TECHNICAL §7]**

## 7. Done when

- The five entries and the CV are live, readable on phone and desktop in both themes, and pass the site's lint/build/test suites.
- Header and About link to `/portfolio`; sitemap, canonical, OG cards and JSON-LD cover every new page.
- Nonso has approved every case-study text.
- LinkedIn Post Inspector shows correct previews for `/portfolio`, one case study and `/cv`.
