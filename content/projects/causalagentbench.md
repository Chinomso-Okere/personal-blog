---
title: "CausalAgentBench: testing whether causal pipelines catch their own mistakes"
slug: "causalagentbench"
summary: "A benchmark that scores multi-step causal analytics pipelines on whether they detect bad handoffs, recover, and abstain when no valid answer exists."
type: "research"
status: "Accepted"
date: "2026"
role: "Co-author"
venue: "ICSRS 2026"
stack: ["Python", "Structural causal models", "Language-model agent harness"]
links: {}
featured: false
published: true
---

## Problem

Consumer analytics increasingly answers causal questions with a chain of specialised components: one proposes how the variables relate, another chooses what to control for, a third estimates the effect and a fourth explains it. When one handoff is wrong (a reversed edge, a dropped confounder), the pipeline still returns a confident number. Existing benchmarks score single algorithms on single tasks, so they miss exactly this failure.

## Approach

CausalAgentBench is a reproducible benchmark and evaluation harness that scores the reliability of the whole pipeline:

- how errors propagate from one component to the next;
- whether a corrupted handoff is detected and recovered from;
- whether the pipeline abstains when no valid causal answer exists;

alongside structure recovery, intervention effects, counterfactual prediction, driver attribution and an identifiability audit.

Its simulated environments keep the noise terms, so the true answer is known exactly, even under hidden confounding, selection effects, delayed effects and nonlinear mechanisms. Handoffs between components are treated as corruptible artefacts, with a verifier that can fall back and recover. A language-model agent harness, with structured output validation and cost logging, is released with the code.

## Evidence

As reported in the paper, across twenty seeds:

- Correctly adjusted pipelines cut naive effect error by up to two orders of magnitude where the effect is identifiable.
- Deleting three edges from a graph handoff raised effect error from 0.085 to 0.20; verifier recovery brought it to 0.034 under every corruption tested.
- An audit based on the spread of estimates separated identifiable from non-identifiable cases with accuracy 0.95.
- Bootstrap intervals that were well calibrated when the effect was identifiable covered the truth in no seed under hidden treatment–outcome confounding.

## What it doesn't show

- No language-model results are reported. The evaluated pipelines are statistical stand-ins for the agent roles; the language-model harness is released so others can run it.
- Treatments are single binary interventions; missing data and multiple or sequential treatments are left to future work.
- How faithful the generated explanations are is defined but not yet scored.
- Accepted at ICSRS 2026 and not yet published, so there is no public link yet.
