package integration

import (
	"encoding/json"
	"fmt"
	"net/http"
	"testing"
)

func TestIntegrations(t *testing.T) {
	t.Run("create and list a provider integration", func(t *testing.T) {
		email := fmt.Sprintf("integ-%s@test.com", randomHex(4))
		tokens := signupAndLogin(t, email, "SecurePass123!")

		createPayload := map[string]interface{}{
			"name":    "demo-sms",
			"channel": "sms",
			"credentials": map[string]interface{}{
				"api_key": "test-key-123",
			},
		}
		body := marshalJSON(t, createPayload)
		req, _ := http.NewRequest("POST", testApp.BaseURL+"/integrations", body)
		req.Header.Set("Authorization", "Bearer "+tokens.AccessToken)
		req.Header.Set("Content-Type", "application/json")

		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatalf("POST /integrations: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusCreated {
			var errResp errorResponse
			json.NewDecoder(resp.Body).Decode(&errResp)
			t.Fatalf("expected 201, got %d: %s", resp.StatusCode, errResp.Error)
		}

		var created struct {
			ID        string `json:"id"`
			Name      string `json:"name"`
			Channel   string `json:"channel"`
			IsActive  bool   `json:"is_active"`
			IsPrimary bool   `json:"is_primary"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&created); err != nil {
			t.Fatalf("decode response: %v", err)
		}

		if created.Name != "demo-sms" {
			t.Errorf("expected name demo-sms, got %s", created.Name)
		}
		if created.Channel != "sms" {
			t.Errorf("expected channel sms, got %s", created.Channel)
		}
		if !created.IsActive {
			t.Error("expected provider to be active by default")
		}

		// List integrations
		listReq, _ := http.NewRequest("GET", testApp.BaseURL+"/integrations", nil)
		listReq.Header.Set("Authorization", "Bearer "+tokens.AccessToken)
		listResp, err := http.DefaultClient.Do(listReq)
		if err != nil {
			t.Fatalf("GET /integrations: %v", err)
		}
		defer listResp.Body.Close()

		if listResp.StatusCode != http.StatusOK {
			t.Fatalf("expected 200, got %d", listResp.StatusCode)
		}

		var integrations []map[string]interface{}
		if err := json.NewDecoder(listResp.Body).Decode(&integrations); err != nil {
			t.Fatalf("decode integrations: %v", err)
		}

		if len(integrations) == 0 {
			t.Fatal("expected at least one integration")
		}
	})

	t.Run("update and delete a provider integration", func(t *testing.T) {
		email := fmt.Sprintf("integ2-%s@test.com", randomHex(4))
		tokens := signupAndLogin(t, email, "SecurePass123!")

		// Create
		createPayload := map[string]interface{}{
			"name":    "demo-sms",
			"channel": "sms",
			"credentials": map[string]interface{}{
				"api_key": "test-key-123",
			},
		}
		body := marshalJSON(t, createPayload)
		req, _ := http.NewRequest("POST", testApp.BaseURL+"/integrations", body)
		req.Header.Set("Authorization", "Bearer "+tokens.AccessToken)
		req.Header.Set("Content-Type", "application/json")

		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatalf("POST /integrations: %v", err)
		}
		defer resp.Body.Close()

		var created struct {
			ID string `json:"id"`
		}
		json.NewDecoder(resp.Body).Decode(&created)

		// Update (same provider name, updated credentials)
		updatePayload := map[string]interface{}{
			"name":    "demo-sms",
			"channel": "sms",
			"credentials": map[string]interface{}{
				"api_key": "new-key-456",
			},
		}
		body = marshalJSON(t, updatePayload)
		req, _ = http.NewRequest("PUT", testApp.BaseURL+"/integrations/"+created.ID, body)
		req.Header.Set("Authorization", "Bearer "+tokens.AccessToken)
		req.Header.Set("Content-Type", "application/json")

		resp, err = http.DefaultClient.Do(req)
		if err != nil {
			t.Fatalf("PUT /integrations/%s: %v", created.ID, err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			var errResp errorResponse
			json.NewDecoder(resp.Body).Decode(&errResp)
			t.Fatalf("expected 200, got %d: %s", resp.StatusCode, errResp.Error)
		}

		var updated struct {
			Name string `json:"name"`
		}
		json.NewDecoder(resp.Body).Decode(&updated)
		if updated.Name != "demo-sms" {
			t.Errorf("expected name 'demo-sms', got %s", updated.Name)
		}

		// Delete
		delReq, _ := http.NewRequest("DELETE", testApp.BaseURL+"/integrations/"+created.ID, nil)
		delReq.Header.Set("Authorization", "Bearer "+tokens.AccessToken)
		delResp, err := http.DefaultClient.Do(delReq)
		if err != nil {
			t.Fatalf("DELETE /integrations/%s: %v", created.ID, err)
		}
		defer delResp.Body.Close()

		if delResp.StatusCode != http.StatusNoContent {
			t.Fatalf("expected 204, got %d", delResp.StatusCode)
		}
	})
}
