package integration

import (
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"testing"
)

type authResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}

type errorResponse struct {
	Error string `json:"error"`
}

func TestAuth(t *testing.T) {
	t.Run("signup creates a new user", func(t *testing.T) {
		email := fmt.Sprintf("signup-%s@test.com", randomHex(4))
		payload := map[string]interface{}{
			"first_name": "Test",
			"last_name":  "User",
			"email":      email,
			"password":   "SecurePass123!",
		}

		body := marshalJSON(t, payload)
		resp, err := http.Post(testApp.BaseURL+"/auth/signup", "application/json", body)
		if err != nil {
			t.Fatalf("POST /auth/signup: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
			var errResp errorResponse
			json.NewDecoder(resp.Body).Decode(&errResp)
			t.Fatalf("expected 200/201, got %d: %s", resp.StatusCode, errResp.Error)
		}
	})

	t.Run("rejects duplicate email on signup", func(t *testing.T) {
		email := fmt.Sprintf("dup-%s@test.com", randomHex(4))

		payload := map[string]interface{}{
			"first_name": "Test",
			"last_name":  "User",
			"email":      email,
			"password":   "SecurePass123!",
		}
		body := marshalJSON(t, payload)

		// First signup
		resp, err := http.Post(testApp.BaseURL+"/auth/signup", "application/json", body)
		if err != nil {
			t.Fatalf("first POST /auth/signup: %v", err)
		}
		resp.Body.Close()

		// Second signup with same email
		resp, err = http.Post(testApp.BaseURL+"/auth/signup", "application/json", body)
		if err != nil {
			t.Fatalf("second POST /auth/signup: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusConflict && resp.StatusCode != http.StatusBadRequest {
			t.Fatalf("expected 400/409 for duplicate email, got %d", resp.StatusCode)
		}
	})

	t.Run("login with valid credentials returns tokens", func(t *testing.T) {
		email := fmt.Sprintf("login-%s@test.com", randomHex(4))
		signupAndVerify(t, email, "SecurePass123!")

		loginPayload := map[string]interface{}{
			"email":    email,
			"password": "SecurePass123!",
		}
		body := marshalJSON(t, loginPayload)
		resp, err := http.Post(testApp.BaseURL+"/auth/signin", "application/json", body)
		if err != nil {
			t.Fatalf("POST /auth/signin: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			var errResp errorResponse
			json.NewDecoder(resp.Body).Decode(&errResp)
			t.Fatalf("expected 200, got %d: %s", resp.StatusCode, errResp.Error)
		}

		var authResp authResponse
		if err := json.NewDecoder(resp.Body).Decode(&authResp); err != nil {
			t.Fatalf("decode response: %v", err)
		}

		if authResp.AccessToken == "" {
			t.Error("expected access_token in response")
		}
		if authResp.RefreshToken == "" {
			t.Error("expected refresh_token in response")
		}
	})

	t.Run("login with wrong credentials returns 401", func(t *testing.T) {
		loginPayload := map[string]interface{}{
			"email":    "nonexistent@test.com",
			"password": "wrongpassword",
		}
		body := marshalJSON(t, loginPayload)
		resp, err := http.Post(testApp.BaseURL+"/auth/signin", "application/json", body)
		if err != nil {
			t.Fatalf("POST /auth/signin: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusUnauthorized {
			t.Fatalf("expected 401, got %d", resp.StatusCode)
		}
	})

	t.Run("refresh token returns new access token", func(t *testing.T) {
		email := fmt.Sprintf("refresh-%s@test.com", randomHex(4))
		tokens := signupAndLogin(t, email, "SecurePass123!")

		refreshPayload := map[string]interface{}{
			"refresh_token": tokens.RefreshToken,
		}
		body := marshalJSON(t, refreshPayload)
		resp, err := http.Post(testApp.BaseURL+"/auth/refresh", "application/json", body)
		if err != nil {
			t.Fatalf("POST /auth/refresh: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			var errResp errorResponse
			json.NewDecoder(resp.Body).Decode(&errResp)
			t.Fatalf("expected 200, got %d: %s", resp.StatusCode, errResp.Error)
		}

		var newAuth authResponse
		if err := json.NewDecoder(resp.Body).Decode(&newAuth); err != nil {
			t.Fatalf("decode response: %v", err)
		}

		if newAuth.AccessToken == "" {
			t.Error("expected new access_token after refresh")
		}
	})

	t.Run("authenticated user can access /auth/me", func(t *testing.T) {
		email := fmt.Sprintf("me-%s@test.com", randomHex(4))
		tokens := signupAndLogin(t, email, "SecurePass123!")

		req, err := http.NewRequest("GET", testApp.BaseURL+"/auth/me", nil)
		if err != nil {
			t.Fatalf("create request: %v", err)
		}
		req.Header.Set("Authorization", "Bearer "+tokens.AccessToken)

		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatalf("GET /auth/me: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			var errResp errorResponse
			json.NewDecoder(resp.Body).Decode(&errResp)
			t.Fatalf("expected 200, got %d: %s", resp.StatusCode, errResp.Error)
		}

		var me map[string]interface{}
		if err := json.NewDecoder(resp.Body).Decode(&me); err != nil {
			t.Fatalf("decode response: %v", err)
		}

		if me["email"] != email {
			t.Errorf("expected email %s, got %v", email, me["email"])
		}
	})

	t.Run("unauthenticated request to /auth/me returns 401", func(t *testing.T) {
		resp, err := http.Get(testApp.BaseURL + "/auth/me")
		if err != nil {
			t.Fatalf("GET /auth/me: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusUnauthorized {
			t.Fatalf("expected 401, got %d", resp.StatusCode)
		}

		body := make([]byte, 256)
		n, _ := resp.Body.Read(body)
		msg := strings.ToLower(strings.TrimSpace(string(body[:n])))
		if !strings.Contains(msg, "bearer") {
			t.Errorf("expected error about bearer token, got: %s", msg)
		}
	})
}

// signupAndLogin creates a user and returns auth tokens.
// It bypasses email verification by updating email_verified_at directly.
func signupAndLogin(t *testing.T, email, password string) authResponse {
	t.Helper()

	signupAndVerify(t, email, password)

	loginPayload := map[string]interface{}{
		"email":    email,
		"password": password,
	}
	body := marshalJSON(t, loginPayload)
	resp, err := http.Post(testApp.BaseURL+"/auth/signin", "application/json", body)
	if err != nil {
		t.Fatalf("POST /auth/signin: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		var errResp errorResponse
		json.NewDecoder(resp.Body).Decode(&errResp)
		t.Fatalf("signin failed: %d: %s", resp.StatusCode, errResp.Error)
	}

	var tokens authResponse
	if err := json.NewDecoder(resp.Body).Decode(&tokens); err != nil {
		t.Fatalf("decode tokens: %v", err)
	}
	return tokens
}

// signupAndVerify signs up then directly marks the email as verified in the DB.
func signupAndVerify(t *testing.T, email, password string) {
	t.Helper()

	signupPayload := map[string]interface{}{
		"first_name": "Test",
		"last_name":  "User",
		"email":      email,
		"password":   password,
	}
	body := marshalJSON(t, signupPayload)
	resp, err := http.Post(testApp.BaseURL+"/auth/signup", "application/json", body)
	if err != nil {
		t.Fatalf("POST /auth/signup: %v", err)
	}
	resp.Body.Close()

	_, err = testApp.DB.Exec(
		t.Context(),
		`UPDATE users SET email_verified_at = NOW() WHERE email = $1`,
		email,
	)
	if err != nil {
		t.Fatalf("verify user email: %v", err)
	}
}

func marshalJSON(t *testing.T, v interface{}) *bytes.Reader {
	t.Helper()
	b, err := json.Marshal(v)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	return bytes.NewReader(b)
}

func randomHex(n int) string {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	return hex.EncodeToString(b)
}
