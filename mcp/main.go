package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
)

func main() {
	apiKey := os.Getenv("AGENTMFA_API_KEY")
	if apiKey == "" {
		fmt.Fprintln(os.Stderr, "warning: AGENTMFA_API_KEY not set — all tool calls will fail with 401")
	}

	apiURL := os.Getenv("AGENTMFA_API_URL")
	if apiURL == "" {
		apiURL = "https://api.agentmfa.ai"
	}

	client := NewClient(apiURL, apiKey)
	s := server.NewMCPServer("agentmfa-mcp", "1.0.0")

	// ── request_approval ─────────────────────────────────────────────────────
	s.AddTool(
		mcp.NewTool("request_approval",
			mcp.WithDescription(
				"Submit a human approval request to AgentMFA. "+
					"The human operator receives a push notification and must approve or reject with biometrics. "+
					"Returns a request_id — pass it to wait_for_approval to block until decided.",
			),
			mcp.WithString("action",
				mcp.Required(),
				mcp.Description("Short label shown on the phone, e.g. 'Delete S3 bucket prod-data'"),
			),
			mcp.WithString("context",
				mcp.Description("Extra detail to help the human make an informed decision"),
			),
			mcp.WithString("risk_level",
				mcp.Description("Risk level: low, medium, or high (default: medium)"),
				mcp.Enum("low", "medium", "high"),
			),
		),
		func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			args := req.Params.Arguments

			action, _ := args["action"].(string)
			if action == "" {
				return mcp.NewToolResultError("action is required"), nil
			}

			riskLevel, _ := args["risk_level"].(string)
			if riskLevel == "" {
				riskLevel = "medium"
			}

			details := map[string]string{"risk_level": riskLevel}
			if ctx, ok := args["context"].(string); ok && ctx != "" {
				details["context"] = ctx
			}

			result, err := client.RequestApproval(ctx, action, details)
			if err != nil {
				return mcp.NewToolResultError(fmt.Sprintf("request_approval failed: %v", err)), nil
			}

			out, _ := json.MarshalIndent(result, "", "  ")
			return mcp.NewToolResultText(string(out)), nil
		},
	)

	// ── wait_for_approval ─────────────────────────────────────────────────────
	s.AddTool(
		mcp.NewTool("wait_for_approval",
			mcp.WithDescription(
				"Block until the human approves or rejects a pending request. "+
					"Polls every 3 seconds. Returns status and a one-time TOTP code when approved.",
			),
			mcp.WithString("request_id",
				mcp.Required(),
				mcp.Description("The request ID returned by request_approval"),
			),
			mcp.WithNumber("timeout_seconds",
				mcp.Description("Maximum seconds to wait before treating as expired (default: 300)"),
			),
		),
		func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			args := req.Params.Arguments

			requestID, _ := args["request_id"].(string)
			if requestID == "" {
				return mcp.NewToolResultError("request_id is required"), nil
			}

			timeoutSecs := 300
			if v, ok := args["timeout_seconds"].(float64); ok && v > 0 {
				timeoutSecs = int(v)
			}

			deadline := time.Now().Add(time.Duration(timeoutSecs) * time.Second)

			for {
				if time.Now().After(deadline) {
					return mcp.NewToolResultText(
						`{"status":"expired","message":"Approval request timed out — treat as rejected"}`,
					), nil
				}

				status, err := client.CheckStatus(ctx, requestID)
				if err != nil {
					return mcp.NewToolResultError(fmt.Sprintf("poll failed: %v", err)), nil
				}

				if status.Status != "pending" {
					out, _ := json.MarshalIndent(status, "", "  ")
					return mcp.NewToolResultText(string(out)), nil
				}

				select {
				case <-ctx.Done():
					return mcp.NewToolResultError("context cancelled"), nil
				case <-time.After(3 * time.Second):
				}
			}
		},
	)

	// ── check_approval_status ─────────────────────────────────────────────────
	s.AddTool(
		mcp.NewTool("check_approval_status",
			mcp.WithDescription(
				"Non-blocking single poll for an approval request status. "+
					"Use wait_for_approval when you want to block until decided.",
			),
			mcp.WithString("request_id",
				mcp.Required(),
				mcp.Description("The request ID returned by request_approval"),
			),
		),
		func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			args := req.Params.Arguments

			requestID, _ := args["request_id"].(string)
			if requestID == "" {
				return mcp.NewToolResultError("request_id is required"), nil
			}

			status, err := client.CheckStatus(ctx, requestID)
			if err != nil {
				return mcp.NewToolResultError(fmt.Sprintf("check_status failed: %v", err)), nil
			}

			out, _ := json.MarshalIndent(status, "", "  ")
			return mcp.NewToolResultText(string(out)), nil
		},
	)

	if err := server.ServeStdio(s); err != nil {
		fmt.Fprintf(os.Stderr, "fatal: %v\n", err)
		os.Exit(1)
	}
}
