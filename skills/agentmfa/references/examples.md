# AgentMFA MCP Examples

These examples show how Claude should use the AgentMFA MCP tools.
No HTTP calls, no environment variables — just tool calls.

---

## Basic approval before a destructive action

```
// Step 1 — request approval
request_approval(
  action: "Delete S3 bucket prod-data",
  context: "Bucket contains 2.3GB of production backups from 2024",
  risk_level: "high"
)
// → { "id": "abc-123", "status": "pending", "expires_at": "..." }

// Step 2 — wait for human decision
wait_for_approval(request_id: "abc-123")
// → { "status": "approved", "code": "483920" }
//   or { "status": "rejected" }

// Step 3 — act on result
if status == "approved"  → proceed with deletion, log code "483920" as proof
if status == "rejected"  → abort, tell user the action was rejected
if status == "expired"   → abort, tell user the request timed out
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
