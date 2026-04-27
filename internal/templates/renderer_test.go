package templates

import (
	"testing"
)

func TestRender(t *testing.T) {
	tests := []struct {
		name        string
		subject     string
		body        string
		vars        map[string]any
		wantErr     bool
		wantSubject string
		wantBody    string
	}{
		{
			name:    "simple substitution",
			subject: "Hello {{.name}}",
			body:    "Welcome {{.name}}, your code is {{.code}}",
			vars: map[string]any{
				"name": "Alice",
				"code": "ABC123",
			},
			wantErr:     false,
			wantSubject: "Hello Alice",
			wantBody:    "Welcome Alice, your code is ABC123",
		},
		{
			name:    "empty subject",
			subject: "",
			body:    "Body: {{.text}}",
			vars: map[string]any{
				"text": "test",
			},
			wantErr:     false,
			wantSubject: "",
			wantBody:    "Body: test",
		},
		{
			name:    "missing variable error",
			subject: "",
			body:    "Body: {{.missing}}",
			vars: map[string]any{
				"text": "test",
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := Render(tt.subject, tt.body, tt.vars)
			if (err != nil) != tt.wantErr {
				t.Errorf("Render() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr {
				if result.Subject != tt.wantSubject {
					t.Errorf("Render() subject = %q, want %q", result.Subject, tt.wantSubject)
				}
				if result.Body != tt.wantBody {
					t.Errorf("Render() body = %q, want %q", result.Body, tt.wantBody)
				}
			}
		})
	}
}

func TestRenderWithComplexData(t *testing.T) {
	vars := map[string]any{
		"user": map[string]string{
			"name":  "Bob",
			"email": "bob@example.com",
		},
		"amount": "50",
	}

	result, err := Render("", "Hi {{index .user \"name\"}}, your balance is {{.amount}}", vars)
	if err != nil {
		t.Fatalf("Render() failed: %v", err)
	}

	expected := "Hi Bob, your balance is 50"
	if result.Body != expected {
		t.Errorf("Render() body = %q, want %q", result.Body, expected)
	}
}
