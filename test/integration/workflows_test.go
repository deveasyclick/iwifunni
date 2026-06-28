package integration

import (
	"encoding/json"
	"fmt"
	"net/http"
	"testing"
)

func TestWorkflows(t *testing.T) {
	t.Run("create a workflow and fetch it by ID", func(t *testing.T) {
		email := fmt.Sprintf("wf-%s@test.com", randomHex(4))
		tokens := signupAndLogin(t, email, "SecurePass123!")

		createPayload := map[string]interface{}{
			"name":        "Test Workflow",
			"key":         fmt.Sprintf("test_wf_%s", randomHex(4)),
			"description": "Integration test workflow",
			"channels":    []string{"email"},
			"templateIds": map[string]string{},
		}
		body := marshalJSON(t, createPayload)
		req, _ := http.NewRequest("POST", testApp.BaseURL+"/workflows", body)
		req.Header.Set("Authorization", "Bearer "+tokens.AccessToken)
		req.Header.Set("Content-Type", "application/json")

		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatalf("POST /workflows: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusCreated {
			var errResp errorResponse
			json.NewDecoder(resp.Body).Decode(&errResp)
			t.Fatalf("expected 201, got %d: %s", resp.StatusCode, errResp.Error)
		}

		var created struct {
			ID   string `json:"id"`
			Name string `json:"name"`
			Key  string `json:"key"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&created); err != nil {
			t.Fatalf("decode response: %v", err)
		}

		if created.Name != "Test Workflow" {
			t.Errorf("expected name 'Test Workflow', got %s", created.Name)
		}

		getReq, _ := http.NewRequest("GET", testApp.BaseURL+"/workflows/"+created.ID, nil)
		getReq.Header.Set("Authorization", "Bearer "+tokens.AccessToken)
		getResp, err := http.DefaultClient.Do(getReq)
		if err != nil {
			t.Fatalf("GET /workflows/%s: %v", created.ID, err)
		}
		defer getResp.Body.Close()

		if getResp.StatusCode != http.StatusOK {
			t.Fatalf("expected 200, got %d", getResp.StatusCode)
		}

		var fetched map[string]interface{}
		if err := json.NewDecoder(getResp.Body).Decode(&fetched); err != nil {
			t.Fatalf("decode workflow: %v", err)
		}

		if fetched["name"] != "Test Workflow" {
			t.Errorf("expected name 'Test Workflow', got %v", fetched["name"])
		}
	})

	t.Run("list all workflows", func(t *testing.T) {
		email := fmt.Sprintf("wflist-%s@test.com", randomHex(4))
		tokens := signupAndLogin(t, email, "SecurePass123!")

		for i := 0; i < 2; i++ {
			createPayload := map[string]interface{}{
				"name":     fmt.Sprintf("Workflow %d", i),
				"key":      fmt.Sprintf("wf_%s_%d", randomHex(3), i),
				"channels": []string{"email"},
			}
			body := marshalJSON(t, createPayload)
			req, _ := http.NewRequest("POST", testApp.BaseURL+"/workflows", body)
			req.Header.Set("Authorization", "Bearer "+tokens.AccessToken)
			req.Header.Set("Content-Type", "application/json")

			resp, err := http.DefaultClient.Do(req)
			if err != nil {
				t.Fatalf("POST /workflows[%d]: %v", i, err)
			}
			resp.Body.Close()
		}

		listReq, _ := http.NewRequest("GET", testApp.BaseURL+"/workflows", nil)
		listReq.Header.Set("Authorization", "Bearer "+tokens.AccessToken)
		listResp, err := http.DefaultClient.Do(listReq)
		if err != nil {
			t.Fatalf("GET /workflows: %v", err)
		}
		defer listResp.Body.Close()

		if listResp.StatusCode != http.StatusOK {
			t.Fatalf("expected 200, got %d", listResp.StatusCode)
		}

		var workflows []map[string]interface{}
		if err := json.NewDecoder(listResp.Body).Decode(&workflows); err != nil {
			t.Fatalf("decode workflows: %v", err)
		}

		if len(workflows) < 2 {
			t.Errorf("expected at least 2 workflows, got %d", len(workflows))
		}
	})

	t.Run("publish a workflow with a valid definition", func(t *testing.T) {
		email := fmt.Sprintf("wfpub-%s@test.com", randomHex(4))
		tokens := signupAndLogin(t, email, "SecurePass123!")

		createPayload := map[string]interface{}{
			"name":        "Publish Test",
			"key":         fmt.Sprintf("publish_test_%s", randomHex(4)),
			"description": "Will be published",
			"channels":    []string{"email"},
			"templateIds": map[string]string{},
			"definition": map[string]interface{}{
				"trigger": map[string]interface{}{
					"event": "test.event",
				},
				"nodes": []interface{}{
					map[string]interface{}{
						"id":   "node-1",
						"type": "delay",
						"config": map[string]interface{}{
							"duration": "5m",
						},
					},
				},
				"edges": []interface{}{},
			},
		}
		body := marshalJSON(t, createPayload)
		req, _ := http.NewRequest("POST", testApp.BaseURL+"/workflows", body)
		req.Header.Set("Authorization", "Bearer "+tokens.AccessToken)
		req.Header.Set("Content-Type", "application/json")

		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatalf("POST /workflows: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusCreated {
			bodyBytes := make([]byte, 512)
			n, _ := resp.Body.Read(bodyBytes)
			t.Fatalf("expected 201, got %d: %s", resp.StatusCode, string(bodyBytes[:n]))
		}

		var created struct {
			ID string `json:"id"`
		}
		json.NewDecoder(resp.Body).Decode(&created)

		pubReq, _ := http.NewRequest("POST", testApp.BaseURL+"/workflows/"+created.ID+"/publish", nil)
		pubReq.Header.Set("Authorization", "Bearer "+tokens.AccessToken)
		pubResp, err := http.DefaultClient.Do(pubReq)
		if err != nil {
			t.Fatalf("POST /workflows/%s/publish: %v", created.ID, err)
		}
		defer pubResp.Body.Close()

		if pubResp.StatusCode != http.StatusOK {
			var errResp errorResponse
			json.NewDecoder(pubResp.Body).Decode(&errResp)
			t.Fatalf("expected 200, got %d: %s", pubResp.StatusCode, errResp.Error)
		}

		var published map[string]interface{}
		if err := json.NewDecoder(pubResp.Body).Decode(&published); err != nil {
			t.Fatalf("decode published workflow: %v", err)
		}

		if published["status"] != "active" {
			t.Errorf("expected status 'active', got %v", published["status"])
		}
	})

	t.Run("soft-delete a workflow", func(t *testing.T) {
		email := fmt.Sprintf("wfdel-%s@test.com", randomHex(4))
		tokens := signupAndLogin(t, email, "SecurePass123!")

		createPayload := map[string]interface{}{
			"name":     "Delete Me",
			"key":      fmt.Sprintf("delete_me_%s", randomHex(4)),
			"channels": []string{"email"},
		}
		body := marshalJSON(t, createPayload)
		req, _ := http.NewRequest("POST", testApp.BaseURL+"/workflows", body)
		req.Header.Set("Authorization", "Bearer "+tokens.AccessToken)
		req.Header.Set("Content-Type", "application/json")

		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatalf("POST /workflows: %v", err)
		}
		defer resp.Body.Close()

		var created struct {
			ID string `json:"id"`
		}
		json.NewDecoder(resp.Body).Decode(&created)

		delReq, _ := http.NewRequest("DELETE", testApp.BaseURL+"/workflows/"+created.ID, nil)
		delReq.Header.Set("Authorization", "Bearer "+tokens.AccessToken)
		delResp, err := http.DefaultClient.Do(delReq)
		if err != nil {
			t.Fatalf("DELETE /workflows/%s: %v", created.ID, err)
		}
		defer delResp.Body.Close()

		if delResp.StatusCode != http.StatusNoContent {
			t.Fatalf("expected 204, got %d", delResp.StatusCode)
		}

		getReq, _ := http.NewRequest("GET", testApp.BaseURL+"/workflows/"+created.ID, nil)
		getReq.Header.Set("Authorization", "Bearer "+tokens.AccessToken)
		getResp, err := http.DefaultClient.Do(getReq)
		if err != nil {
			t.Fatalf("GET /workflows/%s: %v", created.ID, err)
		}
		defer getResp.Body.Close()

		if getResp.StatusCode != http.StatusOK {
			t.Fatalf("expected 200 (soft-deleted), got %d", getResp.StatusCode)
		}

		var fetched map[string]interface{}
		json.NewDecoder(getResp.Body).Decode(&fetched)
		if isActive, ok := fetched["isActive"].(bool); ok && isActive {
			t.Error("expected isActive=false after delete")
		}
		if status, ok := fetched["status"].(string); !ok || status != "archived" {
			t.Logf("expected status 'archived', got: %v", fetched["status"])
		}
	})
}
