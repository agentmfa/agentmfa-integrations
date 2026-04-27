# AgentMFA

<img src="images/agentmfa-logo.png" alt="AgentMFA logo" width="160" align="right">

**Stop AI agents from taking actions you didn't approve.**

AgentMFA adds a human approval step to your AI agent. Before it deletes files, deploys code, sends emails, or does anything sensitive — it pauses and asks you first. You approve or reject from your phone with FaceID or fingerprint.

---

## Get started with Claude

### Step 1 — Install the CLI

```sh
brew install agentmfa/tap/agentmfa
```

Or download directly from [github.com/agentmfa/agentmfa/releases](https://github.com/agentmfa/agentmfa/releases).

### Step 2 — Log in

```sh
agentmfa auth login
```

This opens a browser window to sign in with Google. Your session is stored securely in the system keychain — no API keys or environment variables needed.

### Step 3 — Install the plugin

```sh
claude plugin marketplace add https://github.com/agentmfa/agentmfa-integrations
claude plugin install agentmfa@agentmfa
```

### Step 4 — Register this agent

```sh
agentmfa agent register
```

Approve the registration on your phone. This links the Claude instance on this machine to your account and generates a cryptographic keypair for signed requests.

### Step 5 — Install the mobile app

Download the AgentMFA app on your phone and sign in with the same account. This is where you'll receive approval requests.

That's it — Claude will now ask for your approval before taking any sensitive action.

---

## Get started with OpenClaw

### Step 1 — Install the CLI and log in

```sh
brew install agentmfa/tap/agentmfa
agentmfa auth login
agentmfa agent register
```

### Step 2 — Add the MCP server

Add this to your `~/.openclaw/openclaw.json`:

```json
{
  "mcp": {
    "servers": {
      "agentmfa": {
        "command": "agentmfa",
        "args": ["serve"]
      }
    }
  }
}
```

### Step 3 — Install the skill

**Via ClawHub** (recommended):

```sh
openclaw skills install agentmfa
```

**Via curl** — global, available to all your OpenClaw agents:

```sh
curl -fsSL https://raw.githubusercontent.com/agentmfa/agentmfa-integrations/main/install-skill.sh | sh
```

**Via curl** — per workspace, available only in a specific project:

```sh
curl -fsSL https://raw.githubusercontent.com/agentmfa/agentmfa-integrations/main/install-skill.sh | sh -s -- /path/to/your/workspace/skills
```

### Step 4 — Install the mobile app

Download the AgentMFA app on your phone and sign in with the same account.

---

## Get started with other AI tools

AgentMFA works with any MCP-compatible agent (Cursor, Windsurf, etc.). Install the CLI, log in, register the agent, then add this to your MCP config:

```json
{
  "mcpServers": {
    "agentmfa": {
      "command": "agentmfa",
      "args": ["serve"]
    }
  }
}
```

---

## What it looks like

1. You ask Claude to do something that could have consequences (deploy to production, delete data, send an email, etc.)
2. Claude pauses and sends a notification to your phone
3. You see what it's about to do and tap Approve or Reject
4. Claude proceeds — or stops — based on your decision
