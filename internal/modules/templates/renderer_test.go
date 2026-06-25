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

func TestRenderDotNotation(t *testing.T) {
	vars := map[string]any{
		"subscriber": map[string]any{
			"firstName": "Alice",
			"lastName":  "Smith",
			"email":     "alice@example.com",
		},
		"workflow": map[string]any{
			"orderId": "ORD-12345",
		},
	}

	tests := []struct {
		name     string
		body     string
		expected string
	}{
		{
			name:     "subscriber dot notation",
			body:     "Hello {{subscriber.firstName}} {{subscriber.lastName}}",
			expected: "Hello Alice Smith",
		},
		{
			name:     "workflow dot notation",
			body:     "Your order {{workflow.orderId}} has shipped",
			expected: "Your order ORD-12345 has shipped",
		},
		{
			name:     "mixed old and new syntax",
			body:     "{{subscriber.firstName}}, your order {{workflow.orderId}} is ready",
			expected: "Alice, your order ORD-12345 is ready",
		},
		{
			name:     "old style still works",
			body:     "Email: {{.subscriber.email}}",
			expected: "Email: alice@example.com",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := Render("", tt.body, vars)
			if err != nil {
				t.Fatalf("Render() failed: %v", err)
			}
			if result.Body != tt.expected {
				t.Errorf("Render() body = %q, want %q", result.Body, tt.expected)
			}
		})
	}
}

func TestRenderDotNotationSubject(t *testing.T) {
	vars := map[string]any{
		"subscriber": map[string]any{
			"firstName": "Bob",
		},
		"workflow": map[string]any{
			"eventName": "Order Confirmation",
		},
	}

	result, err := Render("{{workflow.eventName}} for {{subscriber.firstName}}", "", vars)
	if err != nil {
		t.Fatalf("Render() failed: %v", err)
	}

	if result.Subject != "Order Confirmation for Bob" {
		t.Errorf("Render() subject = %q, want %q", result.Subject, "Order Confirmation for Bob")
	}
}

func TestPreprocessDotNotation(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{
			input:    "Hello {{subscriber.firstName}}",
			expected: "Hello {{.subscriber.firstName}}",
		},
		{
			input:    "{{workflow.orderId}} is ready",
			expected: "{{.workflow.orderId}} is ready",
		},
		{
			input:    "{{  subscriber.firstName  }}", // with spaces
			expected: "{{  .subscriber.firstName  }}",
		},
		{
			input:    "{{.name}}", // already has dot — no change
			expected: "{{.name}}",
		},
		{
			input:    "{{index .x \"y\"}}", // function call — no change
			expected: "{{index .x \"y\"}}",
		},
		{
			input:    "Plain text no variables", // no variables — no change
			expected: "Plain text no variables",
		},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			got := preprocessDotNotation(tt.input)
			if got != tt.expected {
				t.Errorf("preprocessDotNotation(%q) = %q, want %q", tt.input, got, tt.expected)
			}
		})
	}
}
