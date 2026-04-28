# AgentMFA MCP Examples

These examples show how Claude should use the AgentMFA MCP tools.
No HTTP calls, no environment variables — just tool calls.

---

## Basic approval before a destructive action

```
// Step 1 — request approval
request_approval(
  action: "delete_s3_bucket",
  description: "Delete S3 bucket prod-data (2.3GB of production backups from 2024)"
)
// → { request_id: "abc-123", message: "Approval request sent — waiting for human approval on the mobile app." }

// ⚠️  Tell the user: "Request sent — waiting for your approval on the phone..."

// Step 2 — wait for human decision
wait_for_approval(request_id: "abc-123")
// → approved:
//   {
//     approved: true, totp_verified: true, token: "...",
//     agent_totp: "483920", approved_by: "user@example.com",
//     approved_from: "Samsung SM-A515F",
//     message: "Request approved by user@example.com from Samsung SM-A515F via biometrics at 14:32:01 UTC with TOTP 483 920"
//   }
// → rejected: { approved: false, reason: "rejected by user" }

// Step 3 — act on result and relay message
if approved == true   → relay message to user, then proceed
if approved == false  → abort, tell user the action was rejected
```

---

## With custom timeout

```
wait_for_approval(
  request_id: "abc-123",
  timeout_seconds: 120   // give operator 2 minutes instead of default 5
)
```

---

## Non-blocking (manual polling)

```
// Request
request_approval(action: "Send invoice emails", context: "247 recipients")
// → id: "xyz-456"

// Do other preparation work here...

// Check when ready
check_approval_status(request_id: "xyz-456")
// → { "status": "pending" }   ← still waiting
// → { "status": "approved", "code": "..." }  ← done
```

---

## Risk levels

| risk_level | When to use |
|---|---|
| `low` | Reversible actions, small blast radius |
| `medium` | Default — partially reversible or moderate impact |
| `high` | Irreversible, large blast radius, or financial impact |
