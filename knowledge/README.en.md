# Knowledge base

[Agent Suite](https://github.com/Choysang/agent-suite) · [中文](README.md) · [Download this module](https://github.com/Choysang/agent-suite/releases/latest/download/knowledge.zip)

Save sources and reusable experience as Markdown cards, then let an agent consult them before starting similar work. Obsidian is optional.

All five Skills belong to this knowledge module:

| Skill | Purpose |
|---|---|
| [capture](.agents/skills/capture/SKILL.md) | Collect links, articles, GitHub projects, clippings, and pasted text |
| [sink](.agents/skills/sink/SKILL.md) | Record reusable lessons and project retrospectives |
| [kb](.agents/skills/kb/SKILL.md) | Search, scaffold, validate cards, and generate routing pages |
| [daily](.agents/skills/daily/SKILL.md) | Manage tasks and daily work logs |
| [tidy](.agents/skills/tidy/SKILL.md) | Process inboxes, merge overlapping cards, and review stale records |

Use Python 3.11+ and an agent that can read and write local files. Download this module and prepare a separate empty folder for your personal knowledge base. Tell the agent the absolute paths of both folders and ask it to follow [BOOTSTRAP.md](BOOTSTRAP.md). It will install PyYAML, copy rules/templates/Skills, and generate `ROUTER.md`.

Codex discovers `.agents/skills/` in the vault. For Claude Code, configure `.claude/skills/` as described in the bootstrap. Other agents can read the Skill files directly.

Start at `ROUTER.md`, open matching routing pages, then read selected cards and sources. Run `kb build` after editing cards. See [AGENTS.md](AGENTS.md) for the card contract and [GUIDE.md](GUIDE.md) for the detailed method. Keep personal content in your own vault.

Migrated from `Choysang/Obsidian-Wiki-llm`. Maintained only in Agent Suite; original Git history and [MIT license](LICENSE) are preserved. Method references: [Karpathy LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f), [LLM Wiki v2](https://gist.github.com/rohitg00/2067ab416f7bbe447c1977edaaa681e2).
