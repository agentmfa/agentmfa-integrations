# AgentMFA

<img src="images/agentmfa-logo.png" alt="AgentMFA logo" width="160" align="right">

**Stop AI agents from taking actions you didn't approve.**

AgentMFA adds a human approval step to your AI agent. Before it deletes files, deploys code, sends emails, or does anything sensitive — it pauses and asks you first. You approve or reject from your phone with FaceID or fingerprint.

---

## Install

Create a free account at [agentmfa.ai](https://agentmfa.ai).

```sh
brew install agentmfa/cli/agentmfa
```


Or download directly from [GitHub releases](https://github.com/agentmfa/agentmfa-integrations/releases).

Then log in:

```sh
agentmfa auth login
```

Finally, install the AgentMFA app on your phone and sign in with the same account. This is where you'll receive approval requests.

---

## Get started with Claude

```sh
claude plugin marketplace add https://github.com/agentmfa/agentmfa-integrations
claude plugin install agentmfa@agentmfa
```

Then in Claude, run `/agentmfa register` to link this agent to your account. Approve the registration on your phone.

That's it — Claude will now ask for your approval before taking any sensitive action.

---

## Get started with OpenClaw

Install the skill (this also configures the MCP server):

```sh
openclaw skills install agentmfa
```

---

## Get started with other AI tools

AgentMFA works with any MCP-compatible agent (Cursor, Windsurf, etc.). Add this to your MCP config:

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
