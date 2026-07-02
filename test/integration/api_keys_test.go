package integration

import (
	"encoding/json"
	"fmt"
	"net/http"
	"testing"
)

func TestAPIKeys(t *testing.T) {
	t.Run("create and list API keys", func(t *testing.T) {
		email := fmt.Sprintf("apikey-%s@test.com", randomHex(4))
		tokens := signupAndLogin(t, email, "SecurePass123!")

		// Create an API key
		createPayload := map[string]interface{}{
			"name":   "test-api-key",
			"scopes": []string{"notifications:write"},
		}
		body := marshalJSON(t, createPayload)
		req, _ := http.NewRequest("POST", testApp.BaseURL+"/apikeys", body)
		req.Header.Set("Authorization", "Bearer "+tokens.AccessToken)
		req.Header.Set("Content-Type", "application/json")

		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatalf("POST /apikeys: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusOK {
			var errResp errorResponse
			json.NewDecoder(resp.Body).Decode(&errResp)
			t.Fatalf("expected 200/201, got %d: %s", resp.StatusCode, errResp.Error)
		}

		var created struct {
			ID   string `json:"id"`
			Name string `json:"name"`
			Key  string `json:"key"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&created); err != nil {
			t.Fatalf("decode response: %v", err)
		}

		if created.Key == "" {
			t.Error("expected a key value in create response")
		}

		// List API keys
		listReq, _ := http.NewRequest("GET", testApp.BaseURL+"/apikeys", nil)
		listReq.Header.Set("Authorization", "Bearer "+tokens.AccessToken)
		listResp, err := http.DefaultClient.Do(listReq)
		if err != nil {
			t.Fatalf("GET /apikeys: %v", err)
		}
		defer listResp.Body.Close()

		if listResp.StatusCode != http.StatusOK {
			t.Fatalf("expected 200 listing keys, got %d", listResp.StatusCode)
		}

		var keys []map[string]interface{}
		if err := json.NewDecoder(listResp.Body).Decode(&keys); err != nil {
			t.Fatalf("decode keys list: %v", err)
		}

		found := false
		for _, k := range keys {
			if k["name"] == "test-api-key" {
				found = true
				break
			}
		}
		if !found {
			t.Error("created key not found in list")
		}
	})

	t.Run("delete API key returns 204", func(t *testing.T) {
		email := fmt.Sprintf("deletekey-%s@test.com", randomHex(4))
		tokens := signupAndLogin(t, email, "SecurePass123!")

		createPayload := map[string]interface{}{
			"name":   "delete-me",
			"scopes": []string{"notifications:write"},
		}
		body := marshalJSON(t, createPayload)
		req, _ := http.NewRequest("POST", testApp.BaseURL+"/apikeys", body)
		req.Header.Set("Authorization", "Bearer "+tokens.AccessToken)
		req.Header.Set("Content-Type", "application/json")

		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatalf("POST /apikeys: %v", err)
		}
		defer resp.Body.Close()

		var created struct {
			ID string `json:"id"`
		}
		json.NewDecoder(resp.Body).Decode(&created)

		delReq, _ := http.NewRequest("DELETE", testApp.BaseURL+"/apikeys/"+created.ID, nil)
		delReq.Header.Set("Authorization", "Bearer "+tokens.AccessToken)
		delResp, err := http.DefaultClient.Do(delReq)
		if err != nil {
			t.Fatalf("DELETE /apikeys/%s: %v", created.ID, err)
		}
		defer delResp.Body.Close()

		if delResp.StatusCode != http.StatusNoContent {
			t.Fatalf("expected 204, got %d", delResp.StatusCode)
		}
	})
}
