package integration

import (
	"encoding/json"
	"net/http"
	"testing"
)

func TestHealthCheck(t *testing.T) {
	resp, err := http.Get(testApp.BaseURL + "/health")
	if err != nil {
		t.Fatalf("GET /health: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}

	var body map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if status, ok := body["status"].(string); !ok || status != "ok" {
		t.Errorf("expected status 'ok', got %v", body["status"])
	}

	checks, ok := body["checks"].(map[string]interface{})
	if !ok {
		t.Fatal("expected checks object")
	}
	if checks["database"] != "ok" {
		t.Errorf("expected database check 'ok', got %v", checks["database"])
	}
	if checks["redis"] != "ok" {
		t.Errorf("expected redis check 'ok', got %v", checks["redis"])
	}
}
