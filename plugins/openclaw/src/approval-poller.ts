import type { AgentMFAClient } from "./agentmfa-client.js";

export interface PollerConfig {
  pollIntervalMs: number;
  maxWaitMs: number;
}

export interface PollResult {
  status: "approved" | "rejected" | "timeout" | "expired";
  reason?: string;
  approvedBy?: string;
}

export class ApprovalPoller {
  private client: AgentMFAClient;
  private config: PollerConfig;

  constructor(client: AgentMFAClient, config: PollerConfig) {
    this.client = client;
    this.config = config;
  }

  async waitForDecision(approvalId: string): Promise<PollResult> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < this.config.maxWaitMs) {
      const status = await this.client.getStatus(approvalId);
      
      if (status.status === "approved") {
        return {
          status: "approved",
          approvedBy: status.approvedBy,
        };
      }
      
      if (status.status === "rejected") {
        return {
          status: "rejected",
          reason: status.reason,
        };
      }
      
      if (status.status === "expired") {
        return {
          status: "expired",
          reason: "Approval request expired",
        };
      }
      
      // Still pending - wait and poll again
      await sleep(this.config.pollIntervalMs);
    }
    
    // Timeout
    return {
      status: "timeout",
      reason: "Polling timed out",
    };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
