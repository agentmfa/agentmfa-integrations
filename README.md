# AgentMFA

<img src="images/agentmfa-logo.png" alt="AgentMFA logo" width="160" align="right">

**Stop AI agents from taking actions you didn't approve.**

AgentMFA adds a human approval step to your AI agent. Before it deletes files, deploys code, sends emails, or does anything sensitive — it pauses and asks you first. You approve or reject from your phone with FaceID or fingerprint.

---

## Get started

### Step 1 — Create an account

Sign up at [agentmfa.ai](https://agentmfa.ai) and grab your API key from the dashboard.

### Step 2 — Install the plugin

Open your terminal and run:

```sh
claude plugin marketplace add https://github.com/agentmfa/agentmfa-integrations
claude plugin install agentmfa@agentmfa
```

### Step 3 — Add your API key

Add this line to your shell profile (`~/.zshrc` or `~/.bashrc`):

```sh
export AGENTMFA_API_KEY=your_api_key_here
```

Then run `source ~/.zshrc` (or open a new terminal window).

### Step 4 — Install the mobile app

Download the AgentMFA app on your phone and sign in with the same account. This is where you'll receive approval requests.

That's it — your agent will now ask for your approval before taking any sensitive action.

---

## What it looks like

1. You ask Claude to do something that could have consequences (deploy to production, delete data, send an email, etc.)
2. Claude pauses and sends a notification to your phone
3. You see what it's about to do and tap Approve or Reject
4. Claude proceeds — or stops — based on your decision

---

## Using with other AI tools

AgentMFA works with any MCP-compatible agent (Cursor, Windsurf, etc.). Add this to your MCP config file:

```json
{
  "mcpServers": {
    "agentmfa": {
      "command": "npx",
      "args": ["-y", "@agentmfa/mcp"],
      "env": {
        "AGENTMFA_API_KEY": "your_api_key_here"
      }
    }
  }
}
```
