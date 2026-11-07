---
title: "Adversarial causal deliberation among autonomous agents"
slug: "adversarial-causal-deliberation"
summary: "Agents with opposing roles must attack a causal claim before it is accepted; in simulation this cut the false-positive rate from 0.35 to 0.04."
type: "research"
status: "Accepted"
date: "2026"
role: "Co-author"
venue: "ICSRS 2026"
stack: ["Python", "Multi-agent protocols", "Causal inference"]
links: {}
featured: false
published: true
---

## Problem

Agents can produce plausible explanations of consumer behaviour even when the evidence does not support a causal conclusion. Letting several agents debate helps on some tasks, but most debate protocols reward agreement: when every agent reads the same misleading correlation, consensus arrives quickly and wrongly.

## Approach

Adversarial causal deliberation (ACD) does not let agents agree until a claim has survived a structured attack. Four roles compete:

- a **hypothesis agent** proposes candidate causal mechanisms;
- a **confounder critic** searches for alternative explanations;
- an **evidence verifier** runs adjusted estimates, falsification tests and refuters;
- a **causal judge** applies explicit identification criteria.

Every exchange is logged in a structured causal argument graph, so each accepted or rejected claim can be traced.

## Evidence

As reported in the paper, in a controlled simulation over six consumer scenarios with known ground truth (confounding, spurious correlation, mediation, collider bias, reverse causation and hidden confounding), across fifty seeded replications:

- ACD reached a claim F1 of 0.906, against 0.533 to 0.559 for single-agent reasoning, majority voting, cooperative debate and an adjust-for-everything analyst (Holm-corrected p ≤ 8.9 × 10⁻¹⁰).
- The false-positive rate fell from 0.35 to 0.04, and calibration error roughly halved.
- Ablations show which part does what: the critic protects recall, falsification protects against hidden confounding, and temporal reasoning prevents bad controls.

## What it doesn't show

- This is a simulation study. The agents follow programmatic policies, so the results model, rather than measure, the behaviour of any specific language model.
- The paper reports an honest failure mode: confounding weak enough to slip past both the critic and the falsification gate.
- Accepted at ICSRS 2026 and not yet published, so there is no public link yet.
