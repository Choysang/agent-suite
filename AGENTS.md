# AGENTS.md

Rules for any agent working on this repository. Docs are Chinese; code, identifiers and commit messages are English.

- Read `ARCHITECTURE.md` first. The protocol is `protocol/SPEC.md`; changing it means bumping `PROTOCOL` in `src/core/types.ts`.
- Layers: `core` (pure) → `kernel` (use cases, no IO modules) → `ports` ← `adapters`; `faces` present; `src/wire.ts` wires. `test/architecture.test.ts` enforces this.
- The kernel never calls a model. Judgement belongs in `skill/SKILL.md`.
- Node ≥ 24 runs `.ts` directly: erasable syntax only (no enums, namespaces, parameter properties); import with `.ts` extensions.
- Zero runtime dependencies. Dev only: `typescript`, `@types/node`.
- Before finishing: `npm test` and `npm run check` both green.
- Parallel work: one agent per layer file set; never two agents editing the same file.
