# CLAUDE.md — agentmfa-integrations

This repo is the **integration and distribution layer** for AgentMFA. It contains the Claude Code plugin, MCP server, and future SDKs.

---

## What is AgentMFA?

AgentMFA is a human-in-the-loop security and audit layer for AI agents. When an agent wants to perform a sensitive action, it pauses and requests biometric approval from the human operator via a mobile app.

**The core flow:**
1. Agent submits an approval request to the AgentMFA API
2. Human receives a push notification on their phone
3. Human approves/rejects with biometrics (FaceID/fingerprint)
4. Agent receives the decision (+ a one-time TOTP code as proof) and proceeds or aborts

---

## Related Repos

| Repo | Purpose |
|---|---|
| `agentmfa/agentmfa` | Backend (Go/Fly.io), mobile apps (iOS/Android), web dashboard (Next.js/Vercel) |
| `agentmfa/agentmfa-integrations` | **This repo** — Claude Code plugin, MCP server, SDKs |

---

## Target Runtimes

AgentMFA targets two primary agent runtimes:

- **OpenClaw** — local AI agent runtime (think: the thing that runs tool calls on your machine)
- **NemoClaw** — NVIDIA's production-hardened OpenClaw superset (kernel-level sandboxing, policy enforcement)

**Division of responsibility:**
- NemoClaw = where the agent runs (infrastructure security)
- AgentMFA = what the agent can do (human approval + audit)

They are complementary. AgentMFA is the missing human-approval layer that NemoClaw doesn't provide.

---

## Phase 2 Scope (what this repo builds)

Priority order:

1. **MCP server** (`mcp/`) — Go binary exposing AgentMFA as MCP tools; works with Claude Code, Cursor, and any MCP-compatible agent
2. **Claude Code plugin** (repo root) — bundles the skill + MCP config; install with `claude plugin install`
3. **Go SDK** (`sdk/go/`) — thin library wrapping the request→poll flow for Go agents
**Backlog (no concrete users yet):**
- **Webhook support** — push approval results to agents; blocked by the fact that most agents are clients, not servers, and don't have a persistent endpoint to receive webhooks
- **Go SDK** (`sdk/go/`) — direct library integration for Go agents without MCP
- **Python SDK** — LangChain/CrewAI integration

---

## Planned Repo Structure

```
agentmfa-integrations/
├── .claude-plugin/
│   └── plugin.json       ← Claude Code plugin metadata
├── .mcp.json             ← MCP server config (points to binary via npx or path)
├── skills/
│   └── agentmfa/         ← Claude Code skill (moved from main repo)
│       ├── SKILL.md
│       └── references/
│           ├── api.md
│           ├── examples.md
│           └── errors.md
├── mcp/                  ← Go MCP server source
└── sdk/
    └── go/               ← Go SDK (Phase 2, later)
```

---

## Claude Code Plugin System

Claude Code plugins are GitHub repos registered as marketplaces. Two known marketplaces exist:
- `anthropics/claude-plugins-official` — Anthropic's curated directory
- `vercel/vercel-plugin` — Vercel's own marketplace

**Distribution plan:**
1. This repo becomes the `agentmfa` marketplace
2. Users run: `claude plugin add-marketplace agentmfa https://github.com/agentmfa/agentmfa-integrations`
3. Then: `claude plugin install agentmfa-plugin@agentmfa`
4. Later: submit to `anthropics/claude-plugins-official` external_plugins for broader discovery

Plugin structure at repo root: `.claude-plugin/plugin.json` + `.mcp.json` + `skills/`.

---

## MCP Server Design

The MCP server is a **local stdio binary** — no hosting required. It runs on the user's machine, spawned by their MCP client, and makes outbound HTTP calls to the AgentMFA API on Fly.io.

```
Claude Code / Cursor / OpenClaw
        │ spawns via stdio
        ▼
  agentmfa-mcp (local binary)
        │ outbound HTTP
        ▼
  AgentMFA API (https://api.agentmfa.ai on Fly.io)
        │ push notification
        ▼
  Mobile app (biometric approval)
```

**Three MCP tools:**
- `request_approval(action, context, risk_level)` → returns request ID
- `wait_for_approval(request_id, timeout)` → blocks until approved/rejected
- `check_approval_status(request_id)` → non-blocking poll

**Auth:** API key per agent instance, set in MCP config env. Each agent registers as a named device in the AgentMFA dashboard.

**Language:** Go (consistent with backend in `agentmfa/agentmfa`).

**Binary distribution:** npm wrapper (`npx @agentmfa/mcp`) so the `.mcp.json` can reference it without requiring manual binary installation.

---

## AgentMFA API

Backend is live at `https://api.agentmfa.ai` (Fly.io).

Key endpoints used by integrations:
```
POST  /api/v1/approval/request         ← create approval request
GET   /api/v1/approval/:id/status      ← poll for decision
POST  /api/v1/auth/device              ← register a device/agent
```

Auth header: `Authorization: ApiKey <key>`

API key format: `agentmfa_xxx`

Full API reference: see `agentmfa/agentmfa` repo → `.agents/skills/agentmfa/references/api.md`

---

## Existing Skill (reference implementation)

The `agentmfa` skill already exists in the main repo at `.agents/skills/agentmfa/`. It implements the approval flow using raw HTTP calls and serves as the reference implementation for everything built here. Move/copy it to `skills/agentmfa/` in this repo.
