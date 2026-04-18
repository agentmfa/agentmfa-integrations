# AgentMFA Error Handling

## HTTP Errors

| Status | Meaning | Action |
|--------|---------|--------|
| `401 Unauthorized` | API key is invalid or missing | Check `AGENTMFA_API_KEY` |
| `400 Bad Request` | Missing `action_type` | Ensure the field is set |
| `404 Not Found` | Approval ID doesn't exist | Do not retry; abort |
| `500 Internal Server Error` | Backend error | Retry once after 5s; if it persists, abort |

## Status Outcomes

| Status | Meaning | Action |
|--------|---------|--------|
| `pending` | Human hasn't decided yet | Keep polling every 3s |
| `approved` | Human approved with biometrics | Proceed; use `code` as proof |
| `rejected` | Human rejected | Abort the action; inform the user |

## Expiry

If the current time exceeds `expires_at` from the initial response and status is still `pending`, treat it as rejected and abort. Do not continue polling after expiry.

## Never Do

- Do not proceed with a sensitive action without receiving `"status": "approved"`
- Do not retry a rejected request automatically — only the human can re-initiate
- Do not cache or reuse a TOTP `code` — each approval generates a unique code valid for one 30-second TOTP window
