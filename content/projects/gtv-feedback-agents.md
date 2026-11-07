---
title: "Persona-driven feedback agents for high-stakes documents"
slug: "gtv-feedback-agents"
summary: "A multi-agent system that reviews UK Global Talent Visa applications from several expert perspectives and returns structured, scored feedback."
type: "research"
status: "Published"
date: "2026"
role: "Co-author"
venue: "IEEE AAIML 2026"
stack: ["CrewAI", "OpenAI o3-mini", "Pydantic", "Python"]
links:
  paper: "https://doi.org/10.1109/AAIML67890.2026.11498196"
featured: true
order: 1
published: true
---

## Problem

UK Global Talent Visa applications in the Digital Technology category are judged on evidence across four pillars: Innovation, Impact, Recognition and Leadership. An application is several documents (a personal statement, a CV, recommendation letters and supporting evidence), and applicants get little structured feedback before they submit. A single model pass over everything gives one blended opinion of a multi-part case.

## Approach

The system splits the review across agents that each take one expert perspective, the way human assessors read different parts of an application.

- **Stage 1** consolidates the applicant's documents into one structured representation.
- **Stage 2** runs specialised persona agents in parallel, such as a Personal Statement Assessor, an Evidence Examiner and a Recommendation Letter Evaluator. An Overview Agent then combines their results into a readiness score and feedback.
- Every agent returns JSON validated against a Pydantic schema, so outputs are typed and checkable rather than free text.
- Applications are classed as Strong (85% or above), Viable (60–84%) or Non-viable (below 60%). Those thresholds were anchored in a pilot where three certified Global Talent Visa mentors rated twenty anonymised applications.

The system is orchestrated with CrewAI and uses the OpenAI o3-mini reasoning model.

## Evidence

As reported in the paper, across its evaluation runs:

- Full assessment of one application in about 3 to 4 minutes (198.6 seconds end to end on average).
- 100% schema validation rate, with 99.7% of outputs valid on the first attempt.
- Inter-agent consistency (κ) of 0.97, and a correlation of 0.82 (ρ) with human ratings.
- About 12 model calls per application, at an estimated US$0.24 each application.

## What it doesn't show

- The evaluation used synthetic and anonymised applications, not real submissions.
- There is no validation against real outcomes: the paper has no labelled data on which applications were approved or refused.
- It is a research prototype for feedback, not a decision tool.
- The paper proposes a governance and bias-audit framework for this kind of system; that framework is described, not yet carried out.
