---
name: agentmfa
description: AgentMFA skill — request human approval before sensitive actions, or manage agent registration. Subcommands: "register" (register this agent), "list" (list registered agents), "status" (check login status). Without a subcommand, use the MCP tools to request approval. Works in Cursor, Claude Code, and any client that spawns the AgentMFA MCP server (`agentmfa serve`).
homepage: https://agentmfa.ai
license: MIT
metadata:
  openclaw:
    emoji: "🔐"
    requires:
      bins:
        - agentmfa
    install:
      - id: brew
        kind: shell
        command: "brew install agentmfa/tap/agentmfa && agentmfa auth login && agentmfa agent register"
        label: "Install AgentMFA CLI and register this agent"
---

# AgentMFA Skill

**AgentMFA does not execute actions.** It pauses your agent and requests biometric approval from the human operator's mobile app. The agent only proceeds — or aborts — based on the human's decision.

Use this skill before performing any sensitive or irreversible action. The human operator will receive a push notification, review the action, and approve or reject it with biometrics.

## Subcommands

When invoked with a subcommand, handle it immediately using Bash — do not use MCP tools:

| Invocation | Action |
|---|---|
| `/agentmfa register` | Run `agentmfa agent register` via Bash. The parent app names the agent (e.g. `claude` in **Claude Code**, `cursor` in **Cursor**). Wait for the user to approve on their phone. |
| `/agentmfa register --update` | Run `agentmfa agent register --update` to re-register after a binary change. |
| `/agentmfa list` | Run `agentmfa agent list` and display the results. |
| `/agentmfa status` | Run `agentmfa auth status` to show login state. |

Example — when the user types `/agentmfa register`, execute:
```bash
agentmfa agent register
```

---

## About AgentMFA

- **Operator:** AgentMFA (https://agentmfa.ai)
- **MCP server:** `agentmfa serve` — part of the AgentMFA CLI; stdio MCP on your machine, talking to `api.agentmfa.ai`
- **Auth:** OAuth via `agentmfa auth login` (session in the system keychain) or, if you use key-based devices, `AGENTMFA_API_KEY` as documented for your setup
- **Privacy & security policy:** https://agentmfa.ai/privacy
- **Source code:** https://github.com/agentmfa/agentmfa (fully open source)

The `agentmfa` CLI must be installed and the agent registered before this skill can be used. See setup below.

## Setup

```sh
# 1. Install the CLI
brew install agentmfa/tap/agentmfa

# 2. Log in (opens browser for OAuth)
agentmfa auth login

# 3. Register this agent (requires approval on your phone)
agentmfa agent register
```

### Claude Code

Use the AgentMFA plugin from this marketplace (or your usual install path). The plugin declares MCP with command `agentmfa`, args `serve` — so **`agentmfa serve` starts when the client connects**. No extra env vars for typical OAuth login.

### Cursor

Install/enable the AgentMFA **Cursor plugin** for this repo (or add MCP manually with the same command: `agentmfa` + arg `serve`). In **Cursor Settings → MCP**, confirm the AgentMFA server is listed and not erroring — that process **is** `agentmfa serve`. If `agent register` works in the terminal but MCP tools are missing, the CLI is fine; fix MCP/plugin startup in Cursor.

After MCP is connected, `agentmfa serve` runs only while the client has a session — same as Claude Code.

## When to Use

- Deleting or modifying production data
- Deploying code to production
- Sending emails or messages on behalf of the user
- Actions that could result in financial charges or transactions
- Modifying infrastructure (cloud resources, DNS, etc.)
- Any action explicitly marked as requiring human approval

## How to Use

This skill uses the AgentMFA MCP tools exposed by **`agentmfa serve`**. Your agent uses **only MCP tool calls** — no direct HTTP.

Tool parameter names must match the MCP schema your client shows (see table below). Put the **short label** in `action` and **full detail** in `context` so the operator sees enough to decide.

### Standard flow (blocking)

```
1. Call request_approval(action, context?, risk_level?)
   → returns JSON including a request id (often `id`) — use that value as request_id in step 2.

   ⚠️  Relay any user-facing message from the tool result so they know to check their phone.

2. Call wait_for_approval(request_id: <id from step 1>, timeout_seconds?)
   → blocks until decided (polls about every 3s; default timeout 300s)
   → returns JSON when no longer pending (shape depends on API; treat non-success / timeout as rejected)

   ⚠️  On approval, relay human-readable message fields to the user when present.

3a. Approved / success path   → proceed; any one-time token or code is a proof of approval — do not log unnecessarily
3b. Rejected / expired / timeout  → abort and inform the user
```

### Non-blocking check

Use `check_approval_status(request_id)` to poll once without blocking.

## Rules

- **Always wait** for approval before proceeding — never skip or assume approval
- **Abort on rejection** — do not retry the same action without user re-initiation
- **Abort on expiry** — a timed-out request is treated as rejected
- **Be specific** — `action` and `context` should give the human enough detail to decide
- **Handle tokens carefully** — one-time proofs of approval should not be logged or pasted into chat

## MCP Tools

Your client may show slightly different optional fields — prefer the **tool schema** Cursor or Claude Code displays. Pass extra parameters only when listed there (e.g. some builds add service-scoped TOTP). Minimal shape for `agentmfa serve`:

| Tool | Parameters | Purpose |
|---|---|---|
| `request_approval` | `action` (required), `context` (optional), `risk_level` (optional: `low` / `medium` / `high`) | Submit request; returns id for polling/wait |
| `wait_for_approval` | `request_id` (required), `timeout_seconds` (optional, default 300) | Block until decided (~3s poll interval) |
| `check_approval_status` | `request_id` (required) | Single non-blocking status poll |
