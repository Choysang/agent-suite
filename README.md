# Agent Working Guidelines

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Edition: Universal](https://img.shields.io/badge/Edition-Universal%20%7C%20Codex%20%7C%20Claude-brightgreen.svg)](#the-three-adapted-editions)
[![Language: Bilingual](https://img.shields.io/badge/Language-English%20%7C%20%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-orange.svg)](#repository-structure)

A battle-tested, model-agnostic operating framework of persistent instructions for AI Agents. Evolved from Andrej Karpathy's heuristic engineering practices and refined against frontier LLMs (Codex, Claude 5th Generation, and modern multi-agent systems), providing **tailored engineering and cognitive collaboration guidelines across distinct runtime environments**.

English | [简体中文](./README.zh-CN.md)

---

## Table of Contents
- [Design Philosophy & Evolution](#design-philosophy--evolution)
- [The Three Adapted Editions](#the-three-adapted-editions)
- [The Five Core Pillars](#the-five-core-pillars)
- [Repository Structure](#repository-structure)
- [Quick Start & Setup Guide](#quick-start--setup-guide)
- [Deep Dive: Why Step-by-Step Micromanagement Prompts Fail](#deep-dive-why-step-by-step-micromanagement-prompts-fail)
- [Attribution & Acknowledgments](#attribution--acknowledgments)

---

## Design Philosophy & Evolution

Traditional agent prompts are frequently congested with procedural micromanagement: *"Step 1: do this; Step 2: verify that; think deeply for every turn; run comprehensive unit tests before returning..."*

As frontier models evolved in native reasoning and agentic harness integration, this kind of **defensive over-engineering** caused severe regressions:
1. **Over-exploration & Overthinking**: Simple requests get bogged down in exhaustive 10,000-token analyses, wasting context windows and compute budgets.
2. **Defensive Complexity**: Agents construct bloated abstractions, excessive try-catches, and speculative fallbacks for unlikely edge cases.
3. **Mechanical Test & Subagent Churn**: Single-line edits trigger sprawling test runs, or spawn unnecessary swarms of subagents with massive coordination overhead.

> 💡 **The Paradigm Shift**: Anthropic officially revealed during the Claude 5 generation era that pruning **over 80% of system prompts** from Claude Code produced **zero measurable loss in coding benchmark evaluation**.
>
> This demonstrates an enduring principle: **Capable agents need clear value criteria, autonomy boundaries, and craft standards—not step-by-step behavioral choreography.**

Through rigorous production iterations, this framework crystallizes core agent discipline into three tailored editions, balancing autonomous delivery with surgical precision.

---

## The Three Adapted Editions

Different runtimes serve different purposes. This repository provides three targeted editions:

| Dimension | 1. OpenAI Codex Edition (`/codex`) | 2. Claude Account Edition (`/claude`) | 3. Universal Edition (`/universal`) |
| :--- | :--- | :--- | :--- |
| **Primary Focus** | **Software Engineering Discipline** | **Cross-Modal Personal Collaboration** | **Canonical Foundation Standard** |
| **Target Runtime** | OpenAI Codex, Codex CLI, Terminal Coding Harness | Claude Web Settings (`Instructions for Claude`) | WorkBuddy, DSH, Cursor, Windsurf, Custom Frameworks |
| **Scope of Work** | Code generation, root-cause bug fixing, refactoring | Q&A, research, writing, architecture, Cowork, code | Universal agentic tasks, especially without native harness guards |
| **Distinctive Highlight** | **Surgical Changes**<br>Strictly follows repo conventions; no drive-by refactoring | **Adaptive Effort**<br>Scales depth dynamically; prevents defensive bloating | **Semantic Completeness**<br>Full permission hierarchy, anti-prompt injection, write isolation |
| **Verification** | Smallest relevant check; test only when required or essential | Proportionate verification; human acceptance for UX | Strict blast-radius control; no blind test execution |
| **Collaboration** | Clear write boundaries, single integration owner | Clear responsibilities; durable checkpoints | Full collision-prevention protocols & handoff recovery |
| **Knowledge Vault** | On-demand local Router check for engineering specs | Conditional on local access; graceful cloud fallback | Standardized Obsidian Vault (`ROUTER.md`) + `sink`/`capture` |

---

## The Five Core Pillars

All editions share five foundational pillars:

### 1. Independent Judgment
- **Collaborator, Not a "Yes-Man"**: Reason from first principles, goals, and evidence. Actively challenge flawed assumptions and sub-optimal proposals.
- **Evidence Hierarchy**: Rigorously separate established facts, plausible inferences, and assumptions. Verify critical or time-sensitive claims against primary sources. Never fabricate facts, sources, or results.
- **Fair Dialectical Comparison**: Objectively evaluate viable options, surfacing hidden tradeoffs, blind spots, and latent biases.

### 2. Simplicity First & Craft
- **Minimum Necessary Complexity**: Favor clean, reliable, maintainable solutions over speculative abstractions, unnecessary dependencies, and premature optimization.
- **Dual-Track Design Principle**:
  - For **existing projects**: Respect conventions and execute surgical, minimal-diff interventions.
  - For **greenfield systems**: Reason directly from requirements without inheriting obsolete legacy baggage, while respecting explicit compatibility constraints.

### 3. Surgical Changes
- **Root-Cause Resolution**: Trace failures to their true origin and fix issues where the behavior belongs. Never mask symptoms with superficial patches.
- **Scoped Blast Radius**: Preserve others' code and unrelated behaviors. Avoid speculative extensions, drive-by formatting, and unrelated cleanup.
- **Integrity**: Never conceal errors, bypass checks, fabricate outputs, or weaken requirements to claim success.

### 4. Outcome-Driven Execution (Initiative & Delivery)
- **Initiative Over Advice**: Never stop at giving suggestions or writing outlines. Autonomously pursue usable, concrete outcomes within available permissions.
- **Adaptive Effort**: Match analytical effort to task uncertainty and failure severity. Answer straightforward questions directly; investigate complex challenges thoroughly.
- **Proportionate Verification**: Use the smallest meaningful checks. Reserve subjective aesthetic and UX judgments for human acceptance.
- **Durable Checkpoints**: Before context compaction or cross-session handoffs, serialize goals, tested environments, rejected approaches, and next blockers to ensure zero-loss resumption.

### 5. Knowledge Retention
- **Routed Retrieval**: Integrates with local Obsidian Knowledge Vaults (default: `D:/zuomian/Obisidian/Knowledge`) via `<vault>/ROUTER.md`, eliminating blind exhaustive queries.
- **Continuous Learning**: Proactively record reusable non-obvious patterns via `sink`, ingest valuable resources via `capture`, and propose milestone retrospectives.

---

## Repository Structure

```text
agent-working-guidelines/
├── README.md                 # English Project Guide (this file)
├── README.zh-CN.md           # Simplified Chinese Project Guide
├── AGENTS.md                 # Universal Canonical Edition (Ready-to-use · 简体中文)
├── AGENTS.en.md              # Universal Canonical Edition (Ready-to-use · English)
│
├── codex/                    # Tailored for OpenAI Codex & Terminal Harnesses
│   ├── AGENTS.md             # Codex Edition (简体中文)
│   └── AGENTS.en.md          # Codex Edition (English)
│
├── claude/                   # Tailored for Claude Account Settings & Claude Code
│   ├── INSTRUCTIONS.md       # Instructions for Claude (简体中文)
│   └── INSTRUCTIONS.en.md    # Instructions for Claude (English)
│
└── universal/                # Model-agnostic & Platform-agnostic Standard
    ├── AGENTS.md             # Universal Standard (简体中文)
    └── AGENTS.en.md          # Universal Standard (English)
```

---

## Quick Start & Setup Guide

### 1. Claude Web / Mobile App (Recommended)
1. Open Claude, navigate to **Settings** → **Instructions for Claude** (Account-level preferences).
2. Open [`claude/INSTRUCTIONS.en.md`](./claude/INSTRUCTIONS.en.md) (recommended for optimal model adherence and token efficiency) or [`claude/INSTRUCTIONS.md`](./claude/INSTRUCTIONS.md).
3. Copy the full text and paste into the instructions box.
4. **Result**: All chats (research, copywriting, daily Q&A, system design, coding) automatically inherit adaptive effort, independent judgment, and proactive delivery.

### 2. OpenAI Codex / Codex CLI
- **Global Configuration**: Append or paste the content of [`codex/AGENTS.en.md`](./codex/AGENTS.en.md) (or [`codex/AGENTS.md`](./codex/AGENTS.md)) into `~/.codex/AGENTS.md`.
- **Project-Level**: Place `AGENTS.md` in the root of your project repository.
- **Result**: Codex enforces surgical edits, executes proportionate verification, and maintains durable cross-session checkpoints.

### 3. Cursor / Windsurf / Claude Code
- Reference or paste [`universal/AGENTS.en.md`](./universal/AGENTS.en.md) into `.cursorrules`, `.windsurfrules`, or project-level `CLAUDE.md`.
- For Claude Code users, maintain project-specific build commands and architecture notes in project `CLAUDE.md`, while letting this framework handle overarching engineering discipline.

### 4. Custom Agent Frameworks (WorkBuddy, DSH, LangChain, CrewAI)
- Inject [`universal/AGENTS.en.md`](./universal/AGENTS.en.md) into your agent's system prompt.
- The Universal edition provides explicit prompt-injection defenses and task-boundary protocols, compensating for frameworks that lack built-in harness guardrails.

---

## Deep Dive: Why Step-by-Step Micromanagement Prompts Fail

Legacy prompt engineering often treated LLMs like deterministic state machines:
*"You MUST write 5 thoughts before editing; you MUST run git status after each file; you MUST write full unit tests and review 3 times..."*

With modern frontier models, this rigid style backfires:
1. **Context & Attention Dilution**: Massive mechanical instructions consume critical tokens, diluting the attention budget needed for real business logic.
2. **Manufactured "Testing for Testing's Sake"**: When forced to run tests in environments without configured test runners, models hallucinate test scripts or tamper with test assertions to fake green builds.
3. **Suppressed Craft**: Fear of violating procedural rules drives models to over-engineer trivial problems with redundant boilerplate, factory layers, and defensive try-catch wrappers.

**Our Core Philosophy:**
> **Trust the model's reasoning intellect; constrain its engineering boundaries; guide its value trade-offs.**
> Grant substantial delivery autonomy, but establish unbreakable guardrails around blast radius, truthfulness, and complexity creep.

---

## Attribution & Acknowledgments

- Inspired by **Andrej Karpathy**'s public observations on coding agent workflows and pragmatic engineering simplicity.
- Structural inspiration drawn from [multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills).
- Informed by **Anthropic**'s frontier insights regarding Claude 5th Generation context engineering and prompt pruning (80%+ system prompt removal).

---

## License

Open-sourced under the [MIT License](./LICENSE). Feel free to adapt, fork, and share!
