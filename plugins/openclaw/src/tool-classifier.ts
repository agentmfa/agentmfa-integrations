export interface ToolPolicy {
  action: "allow" | "deny" | "ask";
  riskLevel?: "low" | "medium" | "high";
  reason?: string;
}

export interface PolicyConfig {
  defaultAction?: "allow" | "deny" | "ask";
  overrides?: Record<string, ToolPolicy>;
  sensitivePatterns?: string[];
}

const DEFAULT_SENSITIVE_PATTERNS = [
  "rm -rf",
  "rm -r /",
  "dd if=/dev/zero",
  "mkfs",
  "format",
  "DROP TABLE",
  "DELETE FROM",
  "TRUNCATE",
];

const HIGH_RISK_TOOLS = [
  "exec",
  "gateway",
];

const MEDIUM_RISK_TOOLS = [
  "write",
  "edit",
  "browser",
  "message",
  "cron",
];

export class ToolClassifier {
  private config: PolicyConfig;

  constructor(config: PolicyConfig = {}) {
    this.config = {
      defaultAction: "ask",
      overrides: {},
      sensitivePatterns: DEFAULT_SENSITIVE_PATTERNS,
      ...config,
    };
  }

  getPolicy(toolName: string, params: Record<string, unknown>): ToolPolicy {
    // Check for explicit override
    if (this.config.overrides?.[toolName]) {
      return this.config.overrides[toolName];
    }

    // Check for dangerous patterns in params
    const paramString = JSON.stringify(params).toLowerCase();
    
    for (const pattern of this.config.sensitivePatterns || []) {
      if (paramString.includes(pattern.toLowerCase())) {
        return {
          action: "ask",
          riskLevel: "high",
          reason: `Detected sensitive pattern: ${pattern}`,
        };
      }
    }

    // Classify by tool type
    if (HIGH_RISK_TOOLS.includes(toolName)) {
      return {
        action: "ask",
        riskLevel: "high",
      };
    }

    if (MEDIUM_RISK_TOOLS.includes(toolName)) {
      return {
        action: "ask",
        riskLevel: "medium",
      };
    }

    // Default policy
    return {
      action: this.config.defaultAction || "allow",
      riskLevel: "low",
    };
  }
}
