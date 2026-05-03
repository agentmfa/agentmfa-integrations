import { definePluginEntry } from "@openclaw/plugin-sdk/plugin-entry";
import { AgentMFAClient } from "./agentmfa-client.js";
import { ToolClassifier } from "./tool-classifier.js";
import { ApprovalPoller } from "./approval-poller.js";

export default definePluginEntry({
  id: "agentmfa-plugin",
  name: "AgentMFA Plugin",
  description: "Biometric approval for sensitive OpenClaw operations",

  register(api: any) {
    const config = api.pluginConfig || {};
    const timeoutMs = config.timeoutMs || 300_000; // 5 minutes default

    const client = new AgentMFAClient({
      timeoutMs,
    });

    // Lazy init: start MCP server on first tool call, not during register/install
    let registered = false;
    let initialized = false;
    let initializing: Promise<void> | null = null;

    async function ensureInitialized() {
      if (initialized) return;
      if (initializing) { await initializing; return; }
      initializing = (async () => {
        const isRegistered = await checkRegistration(api);
        registered = isRegistered;
        if (isRegistered) {
          await client.start();
        }
        initialized = true;
      })();
      await initializing;
    }

    const classifier = new ToolClassifier(config.policy || {});
    const poller = new ApprovalPoller(client, {
      pollIntervalMs: config.pollIntervalMs || 3_000, // 3 seconds
      maxWaitMs: timeoutMs,
    });

    api.on(
      "before_tool_call",
      async (event: any) => {
        await ensureInitialized();
        if (!registered) return; // Not registered, don't block anything

        const { toolName, params, context } = event;

        // Check if this tool requires AgentMFA approval
        const policy = classifier.getPolicy(toolName, params);

        if (policy.action === "allow") {
          return; // Proceed without approval
        }

        if (policy.action === "deny") {
          return {
            block: true,
            blockReason: `Tool '${toolName}' is blocked by AgentMFA policy`,
          };
        }

        // action === "ask" - Request AgentMFA approval via MCP
        try {
          const approval = await client.requestApproval({
            action: toolName,
            context: formatContext(toolName, params),
            riskLevel: policy.riskLevel || "medium",
            metadata: {
              sessionKey: context?.sessionKey,
              agentId: context?.agentId,
              runId: context?.runId,
            },
          });

          api.logger.info(`AgentMFA: Approval requested (${approval.id}) for ${toolName}`);

          // Wait for human decision via polling
          const result = await poller.waitForDecision(approval.id);

          if (result.status === "approved") {
            api.logger.info(`AgentMFA: Approval granted (${approval.id})`);
            return {}; // Proceed with tool execution
          } else if (result.status === "rejected") {
            api.logger.info(`AgentMFA: Approval denied (${approval.id})`);
            return {
              block: true,
              blockReason: `AgentMFA approval denied: ${result.reason || "User rejected"}`,
            };
          } else if (result.status === "timeout") {
            api.logger.warn(`AgentMFA: Approval timed out (${approval.id})`);
            return {
              block: true,
              blockReason: "AgentMFA approval timed out",
            };
          }
        } catch (error) {
          api.logger.error("AgentMFA: Error during approval flow", error);

          // Fail secure: block on error
          return {
            block: true,
            blockReason: `AgentMFA approval failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
      { priority: 100 } // High priority to catch before other plugins
    );

    // Cleanup MCP server on plugin unload
    api.on("gateway_stop", () => {
      client.stop();
    });

    api.logger.info("AgentMFA Plugin registered");
  },
});

async function checkRegistration(api: any): Promise<boolean> {
  const { execFile } = await import("child_process");
  const { promisify } = await import("util");
  const execFileAsync = promisify(execFile);

  try {
    await execFileAsync("agentmfa", ["agent", "list"]);
    api.logger.info("AgentMFA: Agent registered");
    return true;
  } catch {
    api.logger.warn("AgentMFA: Agent not registered. Run: !agentmfa agent register");
    return false;
  }
}

function formatContext(toolName: string, params: Record<string, unknown>): string {
  // Format tool params into human-readable context
  const paramStr = Object.entries(params)
    .map(([key, val]) => `${key}: ${truncate(String(val), 100)}`)
    .join(", ");

  return `Tool: ${toolName}\nParameters: { ${paramStr} }`;
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + "...";
}
