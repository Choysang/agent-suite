# Working on agent-suite

Keep the runtime model-agnostic. The host agent reasons and chooses tools; this
repository stores knowledge, preserves handoffs, and runs deterministic checks.

## Boundaries

- `src/`: installation, configuration, diagnosis and command routing. No domain logic.
- `knowledge/`: Markdown knowledge, retrieval, evidence feedback and offline experiments.
- `handoff/`: Git-backed session relay, ownership and reconstruction of state.
- `guidelines/`: small human-readable behavior contracts, not a second implementation.

When working in parallel, assign exclusive paths and agree on CLI/JSON contracts
before editing. Preserve other contributors' work. Keep private vaults, sessions,
credentials, and machine-specific paths out of this public repository.

## Verification

Node.js 24+, Python 3.11+ and PyYAML are required. Install development dependencies
with `npm ci` and `npm ci --prefix handoff`; install Python checks with
`python -m pip install PyYAML pytest`. Run `npm run verify` for cross-module changes.
Focused tests are appropriate while editing a single module. Use isolated temporary
vaults and repositories for failure injection; do not mutate a user's real notes in tests.

Changes to prompts or harness policies need task-level evaluation before claiming
quality or cost improvements. Passing unit tests establishes implementation behavior,
not learning effectiveness. Record uncertainty and measured limitations in the README.
