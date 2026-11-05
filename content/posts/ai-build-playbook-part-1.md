---
title: "My AI build playbook, part 1: the model is the easy part"
slug: "ai-build-playbook-part-1"
date: "2026-11-05"
description: "Part one of the playbook I use to build AI systems: the principles behind reliable outputs, and a stack you add to only when a build needs it."
tags: ["AI Implementation","AI Evaluation"]
published: true
coverImage: "/images/ai-build-playbook-five-layers.png"
coverImageAlt: "The five layers of an AI build — AI layer, backend, storage, optional frontend, infrastructure — with the AI layer marked as the easy part"
---

The hardest part of building an AI system is almost never the AI. The model call is usually a single API request, and the work that decides whether the system holds up is everything around it. This is the first part of a series on the playbook I use to build AI systems, and it starts with the shape of the thing: the layers a build can have, and the discipline of using only the ones it needs.
 
I keep this playbook so that no build has to re-argue the same basic decisions, and so that a coding agent can be pointed at it and stay inside choices I already trust. It is less a tutorial than a set of defaults with reasons attached.
 
## Five layers, and the discipline of using few
 
Any system I build can be read as up to five layers. The AI layer is the model calls, the intelligence, and in practice it is the easiest of the five: often one API call. The backend is the engine that ties everything together and runs the logic. Storage is where data persists. The frontend is the visual layer, and it exists only when a person needs to click something. Infrastructure is where it all runs and how it ships.
 
The point of naming them is to stand up only the ones a given build actually needs. A classification script is the AI layer in a single Python file, with no backend, no storage and no screen. A client-facing assistant might genuinely need all five. Most early builds use two or three, and reaching for the other layers before there is a reason for them is the most common way to turn a two-day job into a two-week one.
 
Calling the model layer the easy one is not a dismissal of the model. It is a statement about where the difficulty actually lives. A good answer from the model is cheap to produce and expensive to trust, and trust is built in the layers around it.
 
## The principles that make outputs reliable
 
A model that returns free text is hard to build on, because the next step has to guess at what it got. So I force the model to return data in a fixed, typed shape rather than prose. In Python that means Pydantic, and it is the backbone of the whole method: predictable outputs, a next step that can rely on them, and a shape you can evaluate against.
 
```python title="structured_output.py"
from pydantic import BaseModel
 
class Classification(BaseModel):
    label: str
    confidence: float
    reason: str
```

The second principle is to use deterministic code wherever it will do the job, and reserve the model for genuine language or judgement tasks. A model call is powerful, but it is non-deterministic and it costs money. A lookup, a rule or a calculation is none of those things, so it stays in plain code. The model earns its place; it is not the default tool for every step.
 
Third, I store facts and compute what is derived. I persist the inputs and the snapshots: what the model returned, and which settings were in force when it did. Anything derived from those, a flag or a score or a status, is computed when it is read, not written to the record. A stored derived value goes stale the moment its rule changes, and old records then quietly disagree with new ones. If I do store something derived, it is a deliberate, labelled snapshot of the rule at that time.
 
Two more carry a lot of weight. Ground the model in real data, through retrieved documents or tool results, wherever the answer has to be correct, because free-form generation invents things. And keep the build modular: each capability or integration is a separate component the system calls, so adding a new one is adding a module rather than rewiring the system.
 
## A stack you add to, not start with
 
The tools matter less than the order in which you reach for them. I keep a default choice for each layer, and a note on when to add it and when to leave it alone. Grouped by that question, the stack looks like this.
 
![The reference stack grouped into three columns: from day one, add when it is needed, and defer until you feel the need](/images/ai-build-playbook-reference-stack.png)
 
From day one, every build gets Python as the single backend language, `uv` to manage the version, packages and virtual environment in one tool, and Pydantic the moment there is any structured data. These are cheap to add and expensive to retrofit, so they go in at the start.
 
The middle group waits for a concrete trigger. I add a backend framework such as FastAPI when something external has to call the system, a webhook or a frontend or another service; a standalone script needs none. I add a database, Postgres through a wrapper like Supabase, when data has to survive between runs, and a file or SQLite is fine until then. A managed vector store comes in when retrieval quality is proven and scale or multi-user access demands it, not before. Observability, model traces and error tracking, goes in before anything serves real users, because you cannot run a real system blind.
 
The last group I defer until the need is real: background job queues until there is genuinely slow or scheduled work, a frontend unless a person truly has to click a screen, agents only when a fixed workflow cannot do the job, and the deployment stack of containers and a small server late, once something has to run for real users. Over-building early is the mistake I see most, so these stay off the table until the build asks for them.
 
One deliberate omission: I do not pin model names or library versions in the playbook itself. Those go stale fast, and pinning them would work against the whole idea of building once and swapping the model later. The choice of tool is stable; the specific version is confirmed fresh at the start of each build.
 
None of this is exotic, and that is the point. The reliability of an AI system comes from unglamorous decisions made early: a typed output instead of a string, a rule instead of a model call, a stored fact instead of a stored guess. The next parts get more concrete, starting with how I lay out a project from the first commit and how I decide a build is reliable enough to ship.
