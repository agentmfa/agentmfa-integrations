---
name: agentmfa
description: Request human approval via biometric auth before performing sensitive actions. Use this skill whenever an action is irreversible, destructive, or requires human sign-off (e.g. deleting data, deploying to production, sending emails, making payments).
license: MIT
metadata:
  author: agentmfa
  version: "2.0.0"
  abstract: AgentMFA pauses an agent before a sensitive action and requires the human operator to approve it on their phone using biometrics. Uses the AgentMFA MCP server — call request_approval, then wait_for_approval.
---

# AgentMFA Skill

Use this skill before performing any sensitive or irreversible action. The human operator will receive a push notification, review the action, and approve or reject it with biometrics.

## When to Use

- Deleting or modifying production data
- Deploying code to production
- Sending emails or messages on behalf of the user
- Making payments or financial transactions
- Modifying infrastructure (cloud resources, DNS, etc.)
- Any action explicitly marked as requiring human approval

## How to Use

This skill uses the AgentMFA MCP server tools. No HTTP calls or environment variables needed.

### Standard flow (blocking)

```
1. Call request_approval(action, context, risk_level)
   → returns { id, status: "pending", expires_at, ... }

2. Call wait_for_approval(request_id: <id from step 1>)
   → blocks until human decides (polls every 3s)
   → returns { status: "approved", code: "..." }
          or { status: "rejected" }
          or { status: "expired" }

3a. status == "approved"  → proceed; log the code as proof
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
- **Log the code** — the TOTP code returned on approval is proof; pass it to downstream systems if required

## MCP Tools

| Tool | Purpose |
|---|---|
| `request_approval(action, context?, risk_level?)` | Submit approval request, returns request ID |
| `wait_for_approval(request_id, timeout_seconds?)` | Block until decided, returns status + code |
| `check_approval_status(request_id)` | Single non-blocking poll |
