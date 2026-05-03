# AgentMFA Plugin for OpenClaw

Requires biometric approval on your phone before OpenClaw can run sensitive commands like deleting files, deploying code, or sending messages.

## How It Works

1. OpenClaw calls a sensitive tool (e.g., `exec` with `rm -rf`)
2. Plugin intercepts via `before_tool_call` hook
3. Plugin spawns `agentmfa serve` (MCP server)
4. MCP server calls AgentMFA API using your stored credentials
5. Push notification sent to your mobile device
6. You approve with FaceID/TouchID
7. Plugin waits for decision via MCP
8. Tool executes or is blocked based on your decision

## Features

- 🔐 **Biometric Approval**: FaceID/TouchID via AgentMFA mobile app
- 🛡️ **Token Security**: No API tokens in config files — managed by CLI
- ⏱️ **Real-time Polling**: Efficient 3-second polling for decisions
- 📝 **Audit Trail**: All approvals logged to AgentMFA
- ⚡ **Fail Secure**: Blocks on errors or timeouts

## Prerequisites

```bash
# Install AgentMFA CLI
brew install agentmfa/cli/agentmfa

# Login (stores token securely in keychain)
agentmfa auth login

# Register this device
agentmfa agent register
```

## Installation

### From ClawHub (Recommended)

```bash
openclaw plugins install clawhub:agentmfa-plugin
```

### From NPM

```bash
openclaw plugins install npm:@agentmfa/agentmfa-plugin
```

### From Source

```bash
cd ~/workspaces/agentmfa/agentmfa-integrations/plugins/openclaw
npm install
npm run build
openclaw plugin install .
```

## Configuration

No API token needed! The plugin uses `agentmfa serve` which reads from your keychain.

```json
{
  "plugins": {
    "agentmfa-plugin": {
      "timeoutMs": 300000,
      "pollIntervalMs": 3000,
      "policy": {
        "defaultAction": "ask",
        "overrides": {
          "read": { "action": "allow" },
          "browser": { "action": "ask", "riskLevel": "medium" }
        },
        "sensitivePatterns": [
          "rm -rf",
          "DROP TABLE"
        ]
      }
    }
  }
}
```

## Tool Risk Levels

| Tool | Default Risk | Action |
|------|--------------|--------|
| `exec` | High | Ask |
| `write` | Medium | Ask |
| `edit` | Medium | Ask |
| `browser` | Medium | Ask |
| `message` | Medium | Ask |
| `gateway` | High | Ask |
| `cron` | Medium | Ask |
| `read` | Low | Allow |

## Architecture

```
OpenClaw Plugin
      │
      ├─ spawns ─► agentmfa serve (MCP server)
      │                │
      │                ├─ reads token from keychain
      │                ├─ calls AgentMFA API
      │                └─ returns JSON-RPC
      │
      └─ sends push ─► Mobile App
                         │
                         └─ FaceID/TouchID approval
```

## Development

```bash
npm install
npm run watch
```

## Publishing

```bash
# Build
npm run build

# Publish to ClawHub
clawhub package publish . --dry-run
clawhub package publish .
```

## License

Private - All rights reserved
