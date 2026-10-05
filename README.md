# Agent Working Guidelines for Codex

A bilingual, model-neutral set of persistent instructions for Codex. It adapts four practical principles for current agent workflows: independent judgment, simple solutions, root-cause fixes, and proportionate execution.

English | [简体中文](./README.zh-CN.md)

## Files

- [`AGENTS.md`](./AGENTS.md): Simplified Chinese version.
- [`AGENTS.en.md`](./AGENTS.en.md): English version with matching guidance.
- [`README.zh-CN.md`](./README.zh-CN.md): Chinese project overview.

Use one language version at a time.

## Use with Codex

Copy the chosen file's contents into the global `~/.codex/AGENTS.md` or a project's `AGENTS.md`. If that file already has instructions, merge the guidance deliberately and keep the existing requirements. Do not load both language versions or append duplicate copies.

These are user-level or project-level instructions. They follow the host's instruction hierarchy and do not replace system instructions, developer instructions, or runtime permissions. See the [Codex AGENTS.md guide](https://learn.chatgpt.com/docs/agent-configuration/agents-md).

## Design

- Keep the four principles from the Karpathy-inspired guideline structure.
- Use evidence, task scope, and error impact to decide how much analysis and review a task needs.
- Keep model choice, handoffs, and delegation conditional on the remaining work and expected total cost.
- Use skills and runtime configuration for detailed workflows, budgets, concurrency, and tool permissions.

## Attribution

This project is inspired by Andrej Karpathy's public observations about coding agents and the structure of [multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills). It is an independent, bilingual adaptation for Codex persistent instructions. It is not affiliated with or endorsed by Andrej Karpathy or multica-ai.

## Tradeoff

The guidelines favor reliable, scoped work over unnecessary process. Simple tasks stay simple. Analysis, review, and verification grow with uncertainty and the consequences of error.
