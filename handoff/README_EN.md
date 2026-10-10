# Session handoff

[Agent Suite](https://github.com/Choysang/agent-suite) · [中文](README.md) · [Download this module](https://github.com/Choysang/agent-suite/releases/latest/download/handoff.zip)

Seal a task's goal, constraints, progress, decisions, and next step into a numbered handoff. A new session or agent can read it and continue, checking the current workspace first.

Bundles stay in the task's Git repository. Available original user messages, Git records, and workspace snapshots are retained; recalled messages are marked when source transcripts are unavailable.

## Install

Requires Node.js 24+ and Git. Download and extract this module to a permanent location, then run inside the `handoff` directory:

```bash
npm link
handoff install
```

The installer links the Skill and registers a `SessionStart` hook for detected Claude Code, Codex, WorkBuddy, and CodeBuddy configuration directories. Automatic startup hints depend on hook support in the host. It modifies personal agent configuration. Keep the extracted directory: the command and Skill link to it. Re-run these commands here to replace an older installation.

Other local agents can read [skill/SKILL.md](skill/SKILL.md) directly.

## Use

Inside your project's Git repository:

| Agent | Seal the current session | Resume in a new session |
|---|---|---|
| Claude Code | `/handoff` | `/handoff 7` |
| Codex | `$handoff` | `$handoff 7` |

Use the actual returned number. Inspect bundles with `handoff ls`, `handoff show 7 brief`, or `handoff show 7 state`.

Normal `git push` does not send handoff refs. Explicitly run `handoff sync origin` to push and fetch `refs/handoff/*`, including transcript records and snapshots. Use `handoff ui` for the local board. See the [Skill](skill/SKILL.md), [protocol](protocol/SPEC.md), and [architecture](ARCHITECTURE.md) for advanced workflows; agents still handle branch merging and conflicts.

At project completion, use the [knowledge module](https://github.com/Choysang/agent-suite/tree/main/knowledge) to distill reusable lessons. Keep the full handoff bundles in the project.

For development, run `npm ci`, `npm test`, and `npm run check`. Migrated from `Choysang/handoff`; maintained only here. Original Git history is preserved. [MIT License](LICENSE).
