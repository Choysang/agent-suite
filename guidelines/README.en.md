# Working Guidelines

[Agent Suite](../README.md) · [中文](README.md)

Stable behavior contracts for agents: distinguish goals from proposed methods, verify consequential assumptions, correct with evidence, coordinate clear ownership, and complete necessary checks. Detailed retrieval, handoff, and improvement workflows remain in their skills and protocols.

| Use | Chinese | English | Entry point |
|---|---|---|---|
| Codex | [Full](codex/AGENTS.md) | [Full](codex/AGENTS.en.md) | Project `AGENTS.md` or `~/.codex/AGENTS.md` |
| Claude Code / generic agent | [Full](universal/AGENTS.md) | [Full](universal/AGENTS.en.md) | `CLAUDE.md` for Claude Code; the documented rule entry for other hosts |
| Short instructions | [Compact](universal/AGENTS.compact.md) | [Compact](universal/AGENTS.compact.en.md) | Choose one edition; do not stack full and compact |
| Claude web / desktop chat | [Chat](claude/INSTRUCTIONS.md) | [Chat](claude/INSTRUCTIONS.en.md) | Personal chat instructions, separate from Claude Code files |

Replace `<vault>` with your own vault path when installing manually; omit knowledge sections when no vault is configured.

With the complete suite installed:

```bash
agent-suite install --vault "<vault>" --agents codex,claude --guidelines
```

The installer renders the English full edition for Codex and Claude Code inside `agent-suite:start` / `agent-suite:end` markers, preserving surrounding content. Repeated installation updates that block. WorkBuddy and CodeBuddy currently receive skills only. Unverified host hooks are not registered. Public templates contain placeholders; machine paths belong in local configuration and rendered files.

Check for duplicate legacy rules outside the managed block; the installer does not delete custom instructions. Evaluate changes with wrong advice, correct advice, valid preferences, and new evidence correcting the assistant. Static checks do not establish task-level improvement.

Migrated from `Choysang/agent-working-guidelines` with history retained. Structure originally referenced [andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills). [MIT License](LICENSE).
