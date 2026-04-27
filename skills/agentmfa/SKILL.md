---
name: agentmfa
description: AgentMFA skill — request human approval before sensitive actions, or manage agent registration. Subcommands: "register" (register this Claude instance), "list" (list registered agents), "status" (check login status). Without a subcommand, use the MCP tools to request approval.
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
| `/agentmfa register` | Run `agentmfa agent register` via Bash. Claude Code will be the parent process, so the agent is registered as `claude`. Wait for the user to approve on their phone. |
| `/agentmfa register --update` | Run `agentmfa agent register --update` to re-register after a binary change. |
| `/agentmfa list` | Run `agentmfa agent list` and display the results. |
| `/agentmfa status` | Run `agentmfa auth status` to show login state. |

Example — when user types `/agentmfa register`, execute:
```bash
agentmfa agent register
```

---

## About AgentMFA

- **Operator:** AgentMFA (https://agentmfa.ai)
- **MCP server:** `agentmfa serve` — part of the AgentMFA CLI; runs on your machine and communicates with `api.agentmfa.ai`
- **Auth:** OAuth login via `agentmfa auth login` (credentials stored in system keychain — no env vars needed)
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

After registration, `agentmfa serve` starts automatically when Claude invokes it via MCP. No environment variables needed.

## When to Use

- Deleting or modifying production data
- Deploying code to production
- Sending emails or messages on behalf of the user
- Actions that could result in financial charges or transactions
- Modifying infrastructure (cloud resources, DNS, etc.)
- Any action explicitly marked as requiring human approval

## How to Use

This skill uses the AgentMFA MCP server tools (`agentmfa serve`). Your agent makes only tool calls — no direct HTTP calls.

### Standard flow (blocking)

```
1. Call request_approval(action, description, context?)
   → returns { request_id: "..." }

2. Call wait_for_approval(request_id: <id from step 1>)
   → blocks until human decides (polls every 3s, default 300s timeout)
   → returns { approved: true,  totp_verified: true,  token: "..." }
          or { approved: false, reason: "rejected by user" }
          or { approved: false, reason: "approval request expired" }
          or { approved: false, reason: "timed out waiting for approval" }

3a. approved == true   → proceed; the token is a short-lived one-time proof of approval
3b. approved == false  → abort and inform the user
```

### Non-blocking check

Use `check_approval_status(request_id)` to poll once without blocking.

### Requesting service credentials

If the action requires a TOTP-protected service (e.g. AWS, GitHub), pass the `services` array:

```
request_approval(
  action: "deploy_to_prod",
  description: "Deploy v1.2.3 to production on AWS",
  services: ["aws:prod:123456789012"]
)
```

The approval response will include TOTP codes for each requested service.

## Rules

- **Always wait** for approval before proceeding — never skip or assume approval
- **Abort on rejection** — do not retry the same action without user re-initiation
- **Abort on expiry** — a timed-out request is treated as rejected
- **Be specific** — `action` and `description` should give the human enough detail to decide
- **Handle the token carefully** — the one-time token returned on approval is a proof of authorization; do not log it

## MCP Tools

| Tool | Purpose |
|---|---|
| `request_approval(action, description, context?, services?)` | Submit approval request, returns `request_id` |
| `wait_for_approval(request_id, timeout?)` | Block until decided, returns `approved` + `token` |
| `check_approval_status(request_id)` | Single non-blocking poll, returns `status` |
