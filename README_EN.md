<div align="center">

# handoff ⚡
### Cross-Agent Cognitive Session Relay & Swarm Mesh for Super-Intelligent AI Agents
**Zero-Loss Event-Sourced Context Continuity, Multi-Agent Swarms & Real-Time Mission Control**

[![Protocol](https://img.shields.io/badge/Protocol-v3.0-indigo.svg)](protocol/SPEC.md)
[![Runtime](https://img.shields.io/badge/Runtime-Node%20≥%2024%20Native%20TS-emerald.svg)](https://nodejs.org)
[![Zero-Dependencies](https://img.shields.io/badge/Dependencies-0%20Runtime%20Deps-blue.svg)](package.json)
[![Standard](https://img.shields.io/badge/Standards-A2A%20v1.0%20%7C%20MCP%20v2.0-purple.svg)](protocol/SPEC.md)
[![License](https://img.shields.io/badge/License-MIT-amber.svg)](LICENSE)

[**中文文档 (Chinese)**](README.md) · [**English Documentation**](README_EN.md)

</div>

---

> **"Seal an entire AI agent coding session into an immutable serial number. Switch to any agent or model, open a fresh window, input the number, and resume work with zero context degradation."**

```bash
# 1. Seal inside any host agent (Claude Code / Codex / Cursor / Gemini)
[Claude Code]  > /handoff
  ✔ Sealed #7 · myapp · main · a1b2c3d · Dirty workspace snapshotted
  ✔ Verbatim Voice: 3 human prompts anchored (v7.1, v7.2, v7.3)
  ✔ Next step: Implement refresh-token rotation
  ✔ Acceptance criteria: npm test -- auth all green
  ✔ Resume command: /handoff 7  (or $handoff 7)

# 2. Hand over to next-generation models (GPT-6 / Opus 5.5n / Claude Fable 5.1)
[GPT-6 / Codex]  > $handoff 7
  # Claimed bundle #7 · myapp · relay · origin: claude-code (claude-opus-5-5)
  Field: HEAD matches · Physical workspace verified · Atomic claim acquired
  Step 1: Implement refresh-token rotation … (Proceeding)
```

---

## 🌟 Why handoff? (Solving the 2026 Agent Amnesia Crisis)

As LLMs evolved from simple code-completion assistants into **autonomous long-horizon engineering swarms**, developers face three critical bottlenecks:

1. **Summary Entropic Collapse ("Summaries of Summaries Fail")**  
   When long-running context windows fill up, traditional solutions prompt the LLM to summarize past conversations. After 3–4 handoffs, strict human constraints (e.g., *"Zero third-party runtime dependencies"*, *"Passwords must use Ed25519"*) are diluted, forgotten, or hallucinated away.
2. **Multi-Agent Workspace Collisions**  
   Dozens of parallel agents concurrently writing to the same filesystem cause dirty overwrite races, git index lockstorms, and build cache corruption.
3. **Infrastructure Bloat**  
   Requiring Redis, PostgreSQL, Kafka, and heavy orchestrators just to track session IDs prevents agile adoption in local development and ephemeral container sandboxes.

**`handoff` solves these problems definitively.**

---

## 💎 Core Architectural Pillars (Textbook Grade Design for 2026+)

### 1. Fact-Projection Duality (事实-投影对偶)
- **Immutable Facts**: Only two things are absolute objective truth: **verbatim human prompt tokens (`vN.K`)** extracted directly from raw session journals, and the **Git commit ledger**. These are append-only, immutable, and cryptographically provable.
- **Ephemeral Projections**: The project brief (`brief.md`), state board (`state.md`), and task DAGs are merely **projections** computed by models at a given point in time.
- **Future-Proof Resilience**: As models scale from Claude 3.5 to GPT-6, Claude Fable 5.1, or Opus 5.5n, any stronger model can re-synthesize high-fidelity projections from the exact same pristine voice facts. **Zero legacy debt, infinite cognitive headroom.**

### 2. Git as the Zero-Infrastructure Merkle Database
- Handoff bundles live directly in the repository's native Git reference namespace (`refs/handoff/*`).
- **Lock-Free Atomic CAS**: Employs `git update-ref` atomic commands to allocate monotonically increasing seal numbers and claim locks. Zero database servers, zero file-lock deadlocks.
- **Natural Lineage DAG**: The Git commit graph natively forms the multi-agent history DAG. `git log refs/handoff/seal/*` allows instant historical inspection.

### 3. Spine-Branch Physical Worktree Swarms & 4-Tier Cascade Arbitration
- **Fork into Lanes**: Instantly decompose complex tasks into $N$ parallel execution lanes (`lane/auth`, `lane/ui`, etc.).
- **Physical Sandbox Isolation**: Each worker agent is isolated in a sibling Git Worktree directory (`<repo>@<id>-<name>`), sharing the underlying `.git` object database while isolating filesystem writes, compilers, and test suites.
- **4-Tier Cascade Arbitration**:
  - **Tier 0**: Path Orthogonality → `<5ms` deterministic fast-forward merge.
  - **Tier 1**: AST Semantic Slicing → Automatic non-colliding AST node weaving across classes/functions.
  - **Tier 1.5**: STALE Defense → Automated cross-module integration tests to prevent *"Passes Alone, Fails Together"* regressions.
  - **Tier 2**: Autonomous Arbiter Agent → Resolves semantic overlaps using pristine human voice citations.
  - **Tier 3**: Human Mission Control → One-click resolution via visual time machine.

### 4. Fully Decoupled Cognitive Mission Control Web Dashboard
Launch the futuristic web cockpit anytime via `handoff ui`:
- **Neuro-DAG Topology Canvas**: Real-time interactive graph of Relay, Fork, and Join nodes.
- **Swarm Swimlane Monitor**: Live tracking of parallel agent claims, AST ownership boundaries (`owns`), and build health.
- **Voice Time Machine**: Click any architectural decision or code symbol to instantly highlight the exact user quote that justified it.
- **Native Real-Time SSE Stream**: Built-in Server-Sent Events broadcasting live swarm telemetry.

---

## ⚡ Quickstart

### Prerequisites
- **Node.js ≥ 24** (Runs native TypeScript directly with `--experimental-strip-types`, zero compilation, zero bundler latency)
- **Git**

```bash
# Install and link locally
npm install
npm link

# Automatically register across all local agents (Claude Code / Codex / Cursor / WorkBuddy)
handoff install
```

`handoff install` discovers all installed host agents, symlinks `skill/` into their respective skill directories, and registers a `SessionStart` routing hook (injecting an unobtrusive ≤5-line relay card if active handoffs exist).

---

## 🛠 Command Line & Host Agent Cheat Sheet

### Inside Host Agents (via Skill)
| Command | Action |
|---|---|
| `/handoff` | Seal the active session into an atomic bundle (e.g., `#7`) |
| `/handoff 7` | Claim bundle #7, verify workspace state, and start execution |
| `/handoff myapp-7` | Cross-directory handoff from another repository |
| `/handoff join 7` | Merge all parallel lanes branched from #7, running cascade arbitration |
| `/handoff take` | Worker mode: Atomically claim the oldest open task |

### Terminal CLI Commands
```bash
# List all sealed bundles and board topology
handoff ls

# Open the Cognitive Mission Control web dashboard (launches default browser)
handoff ui --port 4040

# Run headless mesh daemon (REST, SSE, and A2A protocol gateway)
handoff serve --port 4040

# Inspect specific parts of a bundle (brief | state | lane | voice | ledger | history | manifest)
handoff show 7 brief
handoff show 7 state

# Retrieve the verbatim text of any user voice token in full
handoff show v7.3

# Push and fetch handoff refs across Git remotes
handoff sync origin
```

---

## 📐 Hexagonal Architecture (Ports & Adapters)

To guarantee uncompromising engineering cleanliness, all code conforms to strict hexagonal boundaries, continuously enforced by `test/architecture.test.ts`:

```
 faces     cli.ts · render.ts · server.ts · install.ts · skill/SKILL.md
   │       (Presentation: CLI terminal, HTTP/SSE daemon, Web Studio, Host Agent Skill)
 kernel    prepare · join · seal · load · take · show · capture
   │       (Pure Use Cases: Coordinates domain logic and ports; zero direct Node IO)
 ports     Store · Workspace · TranscriptSource · Desk · Registry
   │       (Abstract Interface Contracts)
 core      types · dag · voice · draft · lamport · provenance (Pure Domain Math, Zero IO)
 
 adapters  git (Store + Workspace) · claude · codex · codebuddy · desk · registry
 wire.ts   (Composition Root: The sole location binding adapters to ports)
```

- **Zero Runtime Dependencies**: Powered entirely by the Node 24 native standard library (`node:http`, `node:child_process`, `node:fs`, `node:crypto`).
- **Erasable Syntax**: Native TypeScript 7 with zero transpilation overhead. Cold start time `<20ms`.

---

## 🤝 Open Interoperability Standards

1. **A2A v1.0 (Agent-to-Agent Protocol)**: Exposes standard Agent Cards at `http://localhost:4040/.well-known/agent.json` for decentralized discovery.
2. **MCP v2.0 (Model Context Protocol)**: Seamlessly compatible with tools in Claude Code, Cursor, Codex, and enterprise agent meshes.
3. **Protocol v3 Specification**: Read the complete protocol specification in [protocol/SPEC.md](protocol/SPEC.md) and architectural details in [ARCHITECTURE.md](ARCHITECTURE.md).

---

## 🧪 Verification & Tests

```bash
# Run 24+ end-to-end integration tests in real temporary Git repositories
npm test

# Run TypeScript 7 strict type check
npm run check
```

---

<div align="center">

**handoff — Building the bedrock for super-intelligent AI collaboration.**  
Architected for 2026+ Super-Intelligence Swarms (GPT-6, Claude Fable 5.1, Opus 5.5n & Beyond).

</div>
