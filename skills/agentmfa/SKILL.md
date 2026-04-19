---
name: agentmfa
description: Request human approval via biometric auth before performing sensitive actions. Use this skill whenever an action is irreversible, destructive, or requires human sign-off (e.g. deleting data, deploying to production, sending emails, making payments).
homepage: https://agentmfa.ai
license: MIT
metadata:
  openclaw:
    emoji: "🔐"
    requires:
      env:
        - AGENTMFA_API_KEY
      bins:
        - npx
    primaryEnv: AGENTMFA_API_KEY
    install:
      - id: npm
        kind: node
        package: "@agentmfa/mcp"
        bins:
          - agentmfa-mcp
        label: "Install AgentMFA MCP server (npm)"
---

# AgentMFA Skill

**AgentMFA does not execute actions.** It pauses your agent and requests biometric approval from the human operator's mobile app. The agent only proceeds — or aborts — based on the human's decision.

Use this skill before performing any sensitive or irreversible action. The human operator will receive a push notification, review the action, and approve or reject it with biometrics.

## About AgentMFA

- **Operator:** AgentMFA (https://agentmfa.ai)
- **MCP server:** Local binary (`@agentmfa/mcp`) that runs on your machine and makes outbound HTTPS calls to `api.agentmfa.ai`
- **Auth:** Requires `AGENTMFA_API_KEY` set in your shell environment — obtain from the AgentMFA dashboard after signing up
- **Privacy & security policy:** https://agentmfa.ai/privacy
- **Source code:** https://github.com/agentmfa/agentmfa-integrations (fully open source — MCP server source is in `mcp/`)

The MCP server must be configured in your agent runtime before this skill can be used. See the setup instructions at https://github.com/agentmfa/agentmfa-integrations.

For production use, pin the MCP server to a specific version rather than using `latest`:
```
npx @agentmfa/mcp@1.0.0
```
Review the package source at https://github.com/agentmfa/agentmfa-integrations/tree/main/mcp before installing. To verify the binary matches the published source, check the SHA256 hash against `checksums.txt` in the [GitHub release](https://github.com/agentmfa/agentmfa-integrations/releases):
```
sha256sum $(which agentmfa-mcp)
```

## When to Use

- Deleting or modifying production data
- Deploying code to production
- Sending emails or messages on behalf of the user
- Actions that could result in financial charges or transactions
- Modifying infrastructure (cloud resources, DNS, etc.)
- Any action explicitly marked as requiring human approval

## How to Use

This skill uses the AgentMFA MCP server tools. The MCP server handles all API communication — your agent code makes only tool calls, no direct HTTP calls. The MCP server requires `AGENTMFA_API_KEY` to be set in your shell environment.

### Standard flow (blocking)

```
1. Call request_approval(action, context, risk_level)
   → returns { id, status: "pending", expires_at, ... }

2. Call wait_for_approval(request_id: <id from step 1>)
   → blocks until human decides (polls every 3s)
   → returns { status: "approved", code: "..." }
          or { status: "rejected" }
          or { status: "expired" }

3a. status == "approved"  → proceed; treat the code as a sensitive one-time token
3b. status == "rejected"  → abort; inform the user
3c. status == "expired"   → abort; treat as rejected
```

### Non-blocking check

If you need to do other work while waiting, use `check_approval_status(request_id)` to poll manually instead of `wait_for_approval`.

## Rules

- **Always wait** for approval before proceeding — never skip or assume approval
- **Abort on rejection** — do not retry the same action without user re-initiation
- **Abort on expiry** — a timed-out request is treated as rejected
- **Be specific** — `action` and `context` should give the human enough detail to decide
- **Handle the code carefully** — the one-time approval code returned on approval is a sensitive one-time token; do not write it to logs or external systems

## MCP Tools

| Tool | Purpose |
|---|---|
| `request_approval(action, context?, risk_level?)` | Submit approval request, returns request ID |
| `wait_for_approval(request_id, timeout_seconds?)` | Block until decided, returns status + code |
| `check_approval_status(request_id)` | Single non-blocking poll |
