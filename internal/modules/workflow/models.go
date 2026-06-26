package workflow

import (
	"encoding/json"
	"strings"

	"github.com/deveasyclick/iwifunni/internal/db/gen"
)

type WorkflowStatus string

const (
	WorkflowStatusDraft    WorkflowStatus = "draft"
	WorkflowStatusActive   WorkflowStatus = "active"
	WorkflowStatusPaused   WorkflowStatus = "paused"
	WorkflowStatusArchived WorkflowStatus = "archived"
)

type WorkflowStepType string

const (
	WorkflowStepTypeTrigger      WorkflowStepType = "trigger"
	WorkflowStepTypeNotification WorkflowStepType = "notification"
	WorkflowStepTypeDelay        WorkflowStepType = "delay"
	WorkflowStepTypeCondition    WorkflowStepType = "condition"
)

type Definition struct {
	Trigger     Trigger          `json:"trigger"`
	Nodes       []Node           `json:"nodes"`
	Edges       []Edge           `json:"edges"`
	Payload     json.RawMessage  `json:"payload,omitempty"`
}

type Trigger struct {
	Event string `json:"event"`
}

type Node struct {
	ID     string           `json:"id"`
	Type   WorkflowStepType `json:"type"`
	Config json.RawMessage  `json:"config,omitempty"`
}

type Edge struct {
	Source string `json:"source"`
	Target string `json:"target"`
	Branch string `json:"branch,omitempty"`
}

type NotificationConfig struct {
	TemplateID string   `json:"template_id,omitempty"`
	Channels   []string `json:"channels"`
}

type DelayConfig struct {
	Duration string `json:"duration"`
}

type ConditionConfig struct {
	Field    string `json:"field"`
	Operator string `json:"operator"`
	Value    any    `json:"value,omitempty"`
}

type ExecutionDetail struct {
	Execution db.WorkflowExecution
	Steps     []db.WorkflowStepExecution
}

func parseDefinition(raw []byte) (*Definition, error) {
	trimmed := strings.TrimSpace(string(raw))
	if trimmed == "" || trimmed == "{}" || trimmed == "null" {
		return nil, nil
	}

	var definition Definition
	if err := json.Unmarshal(raw, &definition); err != nil {
		return nil, err
	}
	return &definition, nil
}

func marshalDefinition(definition Definition) ([]byte, error) {
	return json.Marshal(definition)
}
