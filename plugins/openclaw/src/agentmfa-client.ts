import { spawn } from "child_process";
import { randomUUID } from "crypto";

export interface AgentMFAConfig {
  timeoutMs: number;
}

export interface ApprovalRequest {
  action: string;
  context: string;
  riskLevel: "low" | "medium" | "high";
  metadata?: Record<string, unknown>;
}

export interface ApprovalResponse {
  id: string;
  status: "pending" | "approved" | "rejected" | "expired";
  createdAt: string;
  expiresAt: string;
}

export interface ApprovalStatus {
  id: string;
  status: "pending" | "approved" | "rejected" | "expired";
  decidedAt?: string;
  reason?: string;
  approvedBy?: string;
}

interface JSONRPCRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params: Record<string, unknown>;
}

interface JSONRPCResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
  };
}

export class AgentMFAClient {
  private timeoutMs: number;
  private mcpProcess: ReturnType<typeof spawn> | null = null;
  private pendingRequests: Map<string, { resolve: (value: unknown) => void; reject: (reason: Error) => void }> = new Map();
  private buffer = "";

  constructor(config: AgentMFAConfig) {
    this.timeoutMs = config.timeoutMs;
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Spawn agentmfa serve MCP server
      this.mcpProcess = spawn("agentmfa", ["serve"], {
        stdio: ["pipe", "pipe", "pipe"],
      });

      this.mcpProcess.stdout?.on("data", (data: Buffer) => {
        this.buffer += data.toString();
        this.processBuffer();
      });

      this.mcpProcess.stderr?.on("data", (data: Buffer) => {
        console.error("agentmfa stderr:", data.toString());
      });

      this.mcpProcess.on("error", (err) => {
        reject(new Error(`Failed to start agentmfa serve: ${err.message}`));
      });

      this.mcpProcess.on("exit", (code) => {
        if (code !== 0 && code !== null) {
          reject(new Error(`agentmfa serve exited with code ${code}`));
        }
      });

      // Wait a moment for MCP server to initialize
      setTimeout(resolve, 500);
    });
  }

  stop(): void {
    if (this.mcpProcess) {
      this.mcpProcess.kill();
      this.mcpProcess = null;
    }
  }

  async requestApproval(req: ApprovalRequest): Promise<ApprovalResponse> {
    await this.ensureStarted();

    const response = await this.callMCPTool("request_approval", {
      action: req.action,
      context: req.context,
      risk_level: req.riskLevel,
    });

    const result = response as { id: string; status: string };
    
    return {
      id: result.id,
      status: result.status as ApprovalResponse["status"],
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + this.timeoutMs).toISOString(),
    };
  }

  async waitForApproval(approvalId: string): Promise<ApprovalStatus> {
    await this.ensureStarted();

    const response = await this.callMCPTool("wait_for_approval", {
      request_id: approvalId,
      timeout_seconds: Math.floor(this.timeoutMs / 1000),
    });

    const result = response as { status: string; decided_at?: string; reason?: string; approved_by?: string };
    
    return {
      id: approvalId,
      status: result.status as ApprovalStatus["status"],
      decidedAt: result.decided_at,
      reason: result.reason,
      approvedBy: result.approved_by,
    };
  }

  async getStatus(approvalId: string): Promise<ApprovalStatus> {
    await this.ensureStarted();

    const response = await this.callMCPTool("check_approval_status", {
      request_id: approvalId,
    });

    const result = response as { status: string; decided_at?: string; reason?: string; approved_by?: string };

    return {
      id: approvalId,
      status: result.status as ApprovalStatus["status"],
      decidedAt: result.decided_at,
      reason: result.reason,
      approvedBy: result.approved_by,
    };
  }

  private async ensureStarted(): Promise<void> {
    if (!this.mcpProcess) {
      await this.start();
    }
  }

  private async callMCPTool(toolName: string, params: Record<string, unknown>): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = randomUUID();
      
      const request: JSONRPCRequest = {
        jsonrpc: "2.0",
        id,
        method: "tools/call",
        params: {
          name: toolName,
          arguments: params,
        },
      };

      this.pendingRequests.set(id, { resolve, reject });

      // Send JSON-RPC request
      this.mcpProcess?.stdin?.write(JSON.stringify(request) + "\n");

      // Timeout handling
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`MCP call timeout for ${toolName}`));
        }
      }, this.timeoutMs);
    });
  }

  private processBuffer(): void {
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() || ""; // Keep incomplete line in buffer

    for (const line of lines) {
      if (line.trim()) {
        try {
          const response: JSONRPCResponse = JSON.parse(line);
          const pending = this.pendingRequests.get(String(response.id));
          
          if (pending) {
            this.pendingRequests.delete(String(response.id));
            
            if (response.error) {
              pending.reject(new Error(response.error.message));
            } else {
              pending.resolve(response.result);
            }
          }
        } catch (err) {
          console.error("Failed to parse JSON-RPC response:", line, err);
        }
      }
    }
  }

  getTimeoutMs(): number {
    return this.timeoutMs;
  }
}
