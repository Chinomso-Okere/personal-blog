---
title: "Inbound enquiry triage for a service business"
slug: "enquiry-triage"
summary: "Reads a raw customer enquiry and returns a structured triage decision (intent, urgency, route, key details, confidence), sending uncertain cases to a person."
type: "proof-of-concept"
status: "Proof of concept"
date: "2026-11"
role: "Builder"
stack: ["Python", "Claude API", "Pydantic", "FastAPI", "SQLite", "Slack webhooks", "pytest"]
links: {}
featured: true
order: 3
published: true
---

## Problem

Small service businesses receive enquiries through web forms and email: new jobs, existing bookings, complaints, billing questions, spam, job applications. Someone has to read each one, work out what it is and how urgent it is, and pass it to the right person. Mistakes are costly when a complaint or a vulnerable customer sits unread.

## Approach

- **One structured model call per enquiry.** The enquiry is sent to Claude, which returns a validated structure: intent, urgency, a short summary, key details (name, service, date, location, contact), a suggested route, a confidence score and its reasoning.
- **Code decides when a person must look, not the model.** A "needs review" flag is raised when confidence falls below a threshold, and an "escalate" flag when review is needed or the enquiry is routed to a person. Both are computed in code.
- **Built in five increments,** each with its own product document, technical document and acceptance report: the AI layer, storage (a local SQLite database with list, show, verify-against-a-human-verdict and secure delete), escalation, a local API, and a demo page that posts a Slack alert, loudly when an enquiry is escalated.
- **Privacy by default.** The API listens on the local machine only and fails closed without its key. Enquiry text and keys are never logged or echoed back, and the Slack alert never includes the enquiry text or contact details.

## Evidence

- In the recorded acceptance run, on nine labelled test enquiries covering new work, an existing booking, a complaint, a billing refund, spam, a job application, a vulnerable customer, a vague message and a mixed complaint-and-billing case, the model returned the expected intent and route in all nine. The vague message was correctly flagged for review, at confidence 0.35.
- A free automated test suite runs with no API calls and checks storage, the command line, the API's error handling, and the demo's security behaviour (secrets, fixed address and cross-site scripting).
- Each increment has a written acceptance report, with every criterion recorded as pass or fail.

## What it doesn't show

- It is a local proof of concept: a person acts on its suggestion, and nothing is sent to customers.
- Nine synthetic enquiries are a smoke test, not a measure of accuracy on real enquiry volumes.
- It has no TLS, no rate limiting, no login on the demo form and no CSRF protection, so it must not be exposed on a network.
- Data-protection work (lawful basis, retention, a privacy notice, encryption at rest) is not done. That is needed before any real enquiry arrives.
