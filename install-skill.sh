#!/bin/sh
set -e

REPO="agentmfa/agentmfa-integrations"
BRANCH="main"
SKILL="agentmfa"
DEST="${1:-$HOME/.openclaw/skills/$SKILL}"

BASE_URL="https://raw.githubusercontent.com/$REPO/$BRANCH/skills/$SKILL"

echo "Installing AgentMFA skill to $DEST..."

mkdir -p "$DEST/references"

curl -fsSL "$BASE_URL/SKILL.md" -o "$DEST/SKILL.md"
curl -fsSL "$BASE_URL/references/examples.md" -o "$DEST/references/examples.md"
curl -fsSL "$BASE_URL/references/errors.md" -o "$DEST/references/errors.md"

echo "Done. Restart OpenClaw to load the skill."
