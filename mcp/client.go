package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// Client calls the AgentMFA API.
type Client struct {
	baseURL    string
	authHeader string // full value for the Authorization header, e.g. "Bearer <jwt>" or "ApiKey <key>"
	httpClient *http.Client
}

func NewClient(baseURL, authHeader string) *Client {
	return &Client{
		baseURL:    baseURL,
		authHeader: authHeader,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// ApprovalRequest is the response from POST /api/v1/approval/request.
type ApprovalRequest struct {
	ID            string            `json:"id"`
	UserID        string            `json:"user_id"`
	AgentName     string            `json:"agent_name"`
	ActionType    string            `json:"action_type"`
	ActionDetails map[string]string `json:"action_details"`
	Status        string            `json:"status"`
	ExpiresAt     string            `json:"expires_at"`
}

// ApprovalStatus is the response from GET /api/v1/approval/:id/status.
type ApprovalStatus struct {
	ID        string `json:"id,omitempty"`
	Status    string `json:"status"`
	Code      string `json:"code,omitempty"`
	DecidedAt string `json:"decided_at,omitempty"`
}

// RequestApproval submits a new approval request and returns the pending request.
func (c *Client) RequestApproval(ctx context.Context, action string, details map[string]string) (*ApprovalRequest, error) {
	payload := map[string]any{
		"action_type":    action,
		"action_details": details,
	}

	data, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/api/v1/approval/request", bytes.NewReader(data))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", c.authHeader)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("http: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode != http.StatusCreated {
		return nil, fmt.Errorf("API error %d: %s", resp.StatusCode, string(body))
	}

	var result ApprovalRequest
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}
	return &result, nil
}

// CheckStatus polls /api/v1/approval/:id/status once and returns the current status.
func (c *Client) CheckStatus(ctx context.Context, id string) (*ApprovalStatus, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet,
		fmt.Sprintf("%s/api/v1/approval/%s/status", c.baseURL, id), nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Authorization", c.authHeader)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("http: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API error %d: %s", resp.StatusCode, string(body))
	}

	var result ApprovalStatus
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}
	return &result, nil
}
