package workflow

import (
	"encoding/json"
	"testing"

	"github.com/google/uuid"
)

func TestValidateDefinition(t *testing.T) {
	t.Parallel()

	valid := Definition{
		Trigger: Trigger{Event: "user.signup"},
		Nodes: []Node{
			{
				ID:     "delay_1",
				Type:   WorkflowStepTypeDelay,
				Config: json.RawMessage(`{"duration":"5m"}`),
			},
			{
				ID:     "email_1",
				Type:   WorkflowStepTypeNotification,
				Config: json.RawMessage(`{"template_id":"` + uuid.Nil.String() + `","channels":["email"]}`),
			},
		},
		Edges: []Edge{{Source: "delay_1", Target: "email_1"}},
	}

	tests := []struct {
		name       string
		definition Definition
		wantErr    bool
	}{
		{name: "valid definition", definition: valid},
		{name: "missing trigger event", definition: Definition{Nodes: valid.Nodes}, wantErr: true},
		{name: "invalid delay", definition: Definition{Trigger: valid.Trigger, Nodes: []Node{{ID: "delay_1", Type: WorkflowStepTypeDelay, Config: json.RawMessage(`{"duration":"later"}`)}}}, wantErr: true},
		{name: "unknown channel", definition: Definition{Trigger: valid.Trigger, Nodes: []Node{{ID: "email_1", Type: WorkflowStepTypeNotification, Config: json.RawMessage(`{"channels":["fax"]}`)}}}, wantErr: true},
		{name: "invalid template id", definition: Definition{Trigger: valid.Trigger, Nodes: []Node{{ID: "email_1", Type: WorkflowStepTypeNotification, Config: json.RawMessage(`{"template_id":"welcome_email","channels":["email"]}`)}}}, wantErr: true},
		{name: "multiple channels unsupported", definition: Definition{Trigger: valid.Trigger, Nodes: []Node{{ID: "email_1", Type: WorkflowStepTypeNotification, Config: json.RawMessage(`{"template_id":"` + uuid.Nil.String() + `","channels":["email","sms"]}`)}}}, wantErr: true},
		{name: "cycle", definition: Definition{Trigger: valid.Trigger, Nodes: []Node{{ID: "a", Type: WorkflowStepTypeDelay, Config: json.RawMessage(`{"duration":"1m"}`)}, {ID: "b", Type: WorkflowStepTypeDelay, Config: json.RawMessage(`{"duration":"1m"}`)}}, Edges: []Edge{{Source: "a", Target: "b"}, {Source: "b", Target: "a"}}}, wantErr: true},
	}

	for _, tt := range tests {
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			err := ValidateDefinition(tt.definition)
			if (err != nil) != tt.wantErr {
				t.Fatalf("ValidateDefinition() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
