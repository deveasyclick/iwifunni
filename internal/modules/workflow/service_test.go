package workflow

import (
	"encoding/json"
	"testing"

	db "github.com/deveasyclick/iwifunni/internal/db/gen"
	"github.com/google/uuid"
)

// ─── templateIDsFromDefinition ──────────────────────────────────────────────

func TestTemplateIDsFromDefinition_Nil(t *testing.T) {
	t.Parallel()

	result := templateIDsFromDefinition(nil)
	if result != nil {
		t.Fatalf("expected nil, got %s", result)
	}
}

func TestTemplateIDsFromDefinition_NoNodes(t *testing.T) {
	t.Parallel()

	def := &Definition{
		Trigger: Trigger{Event: "test.event"},
		Nodes:   []Node{},
		Edges:   []Edge{},
	}

	result := templateIDsFromDefinition(def)
	if string(result) != "{}" {
		t.Fatalf("expected {}, got %s", result)
	}
}

func TestTemplateIDsFromDefinition_OnlyNonNotificationNodes(t *testing.T) {
	t.Parallel()

	def := &Definition{
		Trigger: Trigger{Event: "test.event"},
		Nodes: []Node{
			{ID: "delay_1", Type: WorkflowStepTypeDelay, Config: mustRawJSON(t, `{"duration":"5m"}`)},
		},
		Edges: []Edge{},
	}

	result := templateIDsFromDefinition(def)
	if string(result) != "{}" {
		t.Fatalf("expected {}, got %s", result)
	}
}

func TestTemplateIDsFromDefinition_WithTemplateID(t *testing.T) {
	t.Parallel()

	templateID := uuid.New().String()
	def := &Definition{
		Trigger: Trigger{Event: "test.event"},
		Nodes: []Node{
			{
				ID:     "email_1",
				Type:   WorkflowStepTypeNotification,
				Config: mustRawJSON(t, `{"template_id":"`+templateID+`","channels":["email"]}`),
			},
		},
		Edges: []Edge{},
	}

	result := templateIDsFromDefinition(def)
	expected := map[string]string{"email": templateID}
	expectedJSON, _ := json.Marshal(expected)
	if string(result) != string(expectedJSON) {
		t.Fatalf("expected %s, got %s", expectedJSON, result)
	}
}

func TestTemplateIDsFromDefinition_EmptyTemplateID(t *testing.T) {
	t.Parallel()

	def := &Definition{
		Trigger: Trigger{Event: "test.event"},
		Nodes: []Node{
			{
				ID:     "email_1",
				Type:   WorkflowStepTypeNotification,
				Config: mustRawJSON(t, `{"template_id":"","channels":["email"]}`),
			},
		},
		Edges: []Edge{},
	}

	result := templateIDsFromDefinition(def)
	if string(result) != "{}" {
		t.Fatalf("expected {}, got %s", result)
	}
}

func TestTemplateIDsFromDefinition_MissingTemplateIDField(t *testing.T) {
	t.Parallel()

	def := &Definition{
		Trigger: Trigger{Event: "test.event"},
		Nodes: []Node{
			{
				ID:     "email_1",
				Type:   WorkflowStepTypeNotification,
				Config: mustRawJSON(t, `{"channels":["email"]}`),
			},
		},
		Edges: []Edge{},
	}

	result := templateIDsFromDefinition(def)
	if string(result) != "{}" {
		t.Fatalf("expected {}, got %s", result)
	}
}

func TestTemplateIDsFromDefinition_MultipleChannels(t *testing.T) {
	t.Parallel()

	emailTemplateID := uuid.New().String()
	smsTemplateID := uuid.New().String()
	def := &Definition{
		Trigger: Trigger{Event: "test.event"},
		Nodes: []Node{
			{
				ID:     "email_1",
				Type:   WorkflowStepTypeNotification,
				Config: mustRawJSON(t, `{"template_id":"`+emailTemplateID+`","channels":["email"]}`),
			},
			{
				ID:     "sms_1",
				Type:   WorkflowStepTypeNotification,
				Config: mustRawJSON(t, `{"template_id":"`+smsTemplateID+`","channels":["sms"]}`),
			},
		},
		Edges: []Edge{},
	}

	result := templateIDsFromDefinition(def)
	expected := map[string]string{"email": emailTemplateID, "sms": smsTemplateID}
	expectedJSON, _ := json.Marshal(expected)
	if string(result) != string(expectedJSON) {
		t.Fatalf("expected %s, got %s", expectedJSON, result)
	}
}

func TestTemplateIDsFromDefinition_FirstNodeWinsDuplicateChannel(t *testing.T) {
	t.Parallel()

	firstID := uuid.New().String()
	secondID := uuid.New().String()
	def := &Definition{
		Trigger: Trigger{Event: "test.event"},
		Nodes: []Node{
			{
				ID:     "email_1",
				Type:   WorkflowStepTypeNotification,
				Config: mustRawJSON(t, `{"template_id":"`+firstID+`","channels":["email"]}`),
			},
			{
				ID:     "email_2",
				Type:   WorkflowStepTypeNotification,
				Config: mustRawJSON(t, `{"template_id":"`+secondID+`","channels":["email"]}`),
			},
		},
		Edges: []Edge{},
	}

	result := templateIDsFromDefinition(def)
	expected := map[string]string{"email": firstID}
	expectedJSON, _ := json.Marshal(expected)
	if string(result) != string(expectedJSON) {
		t.Fatalf("expected %s (first node wins), got %s", expectedJSON, result)
	}
}

func TestTemplateIDsFromDefinition_IgnoresNonNotification(t *testing.T) {
	t.Parallel()

	templateID := uuid.New().String()
	def := &Definition{
		Trigger: Trigger{Event: "test.event"},
		Nodes: []Node{
			{
				ID:   "delay_1",
				Type: WorkflowStepTypeDelay,
				Config: mustRawJSON(t, `{"duration":"5m"}`),
			},
			{
				ID:     "email_1",
				Type:   WorkflowStepTypeNotification,
				Config: mustRawJSON(t, `{"template_id":"`+templateID+`","channels":["email"]}`),
			},
		},
		Edges: []Edge{{Source: "delay_1", Target: "email_1"}},
	}

	result := templateIDsFromDefinition(def)
	expected := map[string]string{"email": templateID}
	expectedJSON, _ := json.Marshal(expected)
	if string(result) != string(expectedJSON) {
		t.Fatalf("expected %s, got %s", expectedJSON, result)
	}
}

// ─── channelsFromDefinition ─────────────────────────────────────────────────

func TestChannelsFromDefinition_Nil(t *testing.T) {
	t.Parallel()

	result := channelsFromDefinition(nil)
	if result != nil {
		t.Fatalf("expected nil, got %v", result)
	}
}

func TestChannelsFromDefinition_NoNodes(t *testing.T) {
	t.Parallel()

	def := &Definition{
		Trigger: Trigger{Event: "test.event"},
		Nodes:   []Node{},
		Edges:   []Edge{},
	}

	result := channelsFromDefinition(def)
	if result != nil {
		t.Fatalf("expected nil, got %v", result)
	}
}

func TestChannelsFromDefinition_SingleChannel(t *testing.T) {
	t.Parallel()

	def := &Definition{
		Trigger: Trigger{Event: "test.event"},
		Nodes: []Node{
			{
				ID:     "email_1",
				Type:   WorkflowStepTypeNotification,
				Config: mustRawJSON(t, `{"channels":["email"]}`),
			},
		},
		Edges: []Edge{},
	}

	result := channelsFromDefinition(def)
	expected := []string{"email"}
	if !stringSliceEqual(result, expected) {
		t.Fatalf("expected %v, got %v", expected, result)
	}
}

func TestChannelsFromDefinition_Deduplicates(t *testing.T) {
	t.Parallel()

	def := &Definition{
		Trigger: Trigger{Event: "test.event"},
		Nodes: []Node{
			{
				ID:     "email_1",
				Type:   WorkflowStepTypeNotification,
				Config: mustRawJSON(t, `{"channels":["email"]}`),
			},
			{
				ID:     "email_2",
				Type:   WorkflowStepTypeNotification,
				Config: mustRawJSON(t, `{"channels":["email"]}`),
			},
		},
		Edges: []Edge{},
	}

	result := channelsFromDefinition(def)
	expected := []string{"email"}
	if !stringSliceEqual(result, expected) {
		t.Fatalf("expected %v, got %v", expected, result)
	}
}

func TestChannelsFromDefinition_MultipleChannels(t *testing.T) {
	t.Parallel()

	def := &Definition{
		Trigger: Trigger{Event: "test.event"},
		Nodes: []Node{
			{
				ID:     "email_1",
				Type:   WorkflowStepTypeNotification,
				Config: mustRawJSON(t, `{"channels":["email"]}`),
			},
			{
				ID:     "sms_1",
				Type:   WorkflowStepTypeNotification,
				Config: mustRawJSON(t, `{"channels":["sms"]}`),
			},
		},
		Edges: []Edge{},
	}

	result := channelsFromDefinition(def)
	expected := []string{"email", "sms"}
	if !stringSliceEqual(result, expected) {
		t.Fatalf("expected %v, got %v", expected, result)
	}
}

func TestChannelsFromDefinition_IgnoresNonNotification(t *testing.T) {
	t.Parallel()

	def := &Definition{
		Trigger: Trigger{Event: "test.event"},
		Nodes: []Node{
			{
				ID:   "delay_1",
				Type: WorkflowStepTypeDelay,
				Config: mustRawJSON(t, `{"duration":"5m"}`),
			},
			{
				ID:     "email_1",
				Type:   WorkflowStepTypeNotification,
				Config: mustRawJSON(t, `{"channels":["email"]}`),
			},
		},
		Edges: []Edge{{Source: "delay_1", Target: "email_1"}},
	}

	result := channelsFromDefinition(def)
	expected := []string{"email"}
	if !stringSliceEqual(result, expected) {
		t.Fatalf("expected %v, got %v", expected, result)
	}
}

// ─── buildCreateDefinitionParams ────────────────────────────────────────────

func TestBuildCreateDefinitionParams_WithTemplateID(t *testing.T) {
	t.Parallel()

	templateID := uuid.New().String()
	in := CreateInput{
		EnvironmentID: uuid.New(),
		Key:           "test_workflow",
		Name:          "Test Workflow",
		Description:   strPtr("A test workflow"),
		Definition: &Definition{
			Trigger: Trigger{Event: "test.event"},
			Nodes: []Node{
				{
					ID:     "delay_1",
					Type:   WorkflowStepTypeDelay,
					Config: mustRawJSON(t, `{"duration":"5m"}`),
				},
				{
					ID:     "email_1",
					Type:   WorkflowStepTypeNotification,
					Config: mustRawJSON(t, `{"template_id":"`+templateID+`","channels":["email"]}`),
				},
			},
			Edges: []Edge{{Source: "delay_1", Target: "email_1"}},
		},
	}

	params, err := buildCreateDefinitionParams(in)
	if err != nil {
		t.Fatalf("buildCreateDefinitionParams() error = %v", err)
	}

	// Verify template_ids is populated
	var templateIDs map[string]string
	if err := json.Unmarshal(params.TemplateIds, &templateIDs); err != nil {
		t.Fatalf("unmarshal template_ids: %v", err)
	}

	if templateIDs["email"] != templateID {
		t.Fatalf("template_ids[email] = %q, want %q", templateIDs["email"], templateID)
	}

	// Verify channels are derived from definition
	if len(params.Channels) != 1 || params.Channels[0] != "email" {
		t.Fatalf("channels = %v, want [email]", params.Channels)
	}

	// Verify status is active
	if params.Status != string(WorkflowStatusActive) {
		t.Fatalf("status = %q, want %q", params.Status, WorkflowStatusActive)
	}

	// Verify trigger event is extracted
	if params.TriggerEvent == nil || *params.TriggerEvent != "test.event" {
		t.Fatalf("trigger_event = %v, want test.event", params.TriggerEvent)
	}
}

func TestBuildCreateDefinitionParams_WithoutTemplateID(t *testing.T) {
	t.Parallel()

	in := CreateInput{
		EnvironmentID: uuid.New(),
		Key:           "test_workflow",
		Name:          "Test Workflow",
		Definition: &Definition{
			Trigger: Trigger{Event: "test.event"},
			Nodes: []Node{
				{
					ID:     "email_1",
					Type:   WorkflowStepTypeNotification,
					Config: mustRawJSON(t, `{"channels":["email"]}`),
				},
			},
			Edges: []Edge{},
		},
	}

	params, err := buildCreateDefinitionParams(in)
	if err != nil {
		t.Fatalf("buildCreateDefinitionParams() error = %v", err)
	}

	if string(params.TemplateIds) != "{}" {
		t.Fatalf("template_ids = %s, want {}", params.TemplateIds)
	}
}

func TestBuildCreateDefinitionParams_EmptyKey(t *testing.T) {
	t.Parallel()

	in := CreateInput{
		EnvironmentID: uuid.New(),
		Key:           "",
		Name:          "Test Workflow",
		Definition: &Definition{
			Trigger: Trigger{Event: "test.event"},
			Nodes: []Node{
				{
					ID:   "delay_1",
					Type: WorkflowStepTypeDelay,
					Config: mustRawJSON(t, `{"duration":"5m"}`),
				},
			},
			Edges: []Edge{},
		},
	}

	_, err := buildCreateDefinitionParams(in)
	if err != ErrInvalidWorkflow {
		t.Fatalf("expected ErrInvalidWorkflow, got %v", err)
	}
}

// ─── buildUpdateDefinitionParams ────────────────────────────────────────────

func TestBuildUpdateDefinitionParams_WithTemplateID(t *testing.T) {
	t.Parallel()

	templateID := uuid.New().String()
	currentVersion := int32(2)
	in := UpdateInput{
		ID:            uuid.New(),
		EnvironmentID: uuid.New(),
		Key:           "test_workflow",
		Name:          "Test Workflow Updated",
		IsActive:      true,
		Definition: &Definition{
			Trigger: Trigger{Event: "test.event"},
			Nodes: []Node{
				{
					ID:     "email_1",
					Type:   WorkflowStepTypeNotification,
					Config: mustRawJSON(t, `{"template_id":"`+templateID+`","channels":["email"]}`),
				},
			},
			Edges: []Edge{},
		},
	}

	// Create a minimal current workflow record
	current := db.Workflow{
		ID:            in.ID,
		EnvironmentID: in.EnvironmentID,
		Version:       currentVersion,
	}

	params, err := buildUpdateDefinitionParams(current, in)
	if err != nil {
		t.Fatalf("buildUpdateDefinitionParams() error = %v", err)
	}

	// Verify template_ids is populated
	var templateIDs map[string]string
	if err := json.Unmarshal(params.TemplateIds, &templateIDs); err != nil {
		t.Fatalf("unmarshal template_ids: %v", err)
	}

	if templateIDs["email"] != templateID {
		t.Fatalf("template_ids[email] = %q, want %q", templateIDs["email"], templateID)
	}

	// Verify version is preserved from current
	if params.Version != currentVersion {
		t.Fatalf("version = %d, want %d", params.Version, currentVersion)
	}

	// Verify status is active
	if params.Status != string(WorkflowStatusActive) {
		t.Fatalf("status = %q, want %q", params.Status, WorkflowStatusActive)
	}
}

func TestBuildUpdateDefinitionParams_WithoutTemplateID(t *testing.T) {
	t.Parallel()

	in := UpdateInput{
		ID:            uuid.New(),
		EnvironmentID: uuid.New(),
		Key:           "test_workflow",
		Name:          "Test Workflow",
		Definition: &Definition{
			Trigger: Trigger{Event: "test.event"},
			Nodes: []Node{
				{
					ID:     "email_1",
					Type:   WorkflowStepTypeNotification,
					Config: mustRawJSON(t, `{"channels":["email"]}`),
				},
			},
			Edges: []Edge{},
		},
	}

	current := db.Workflow{
		ID:            in.ID,
		EnvironmentID: in.EnvironmentID,
	}

	params, err := buildUpdateDefinitionParams(current, in)
	if err != nil {
		t.Fatalf("buildUpdateDefinitionParams() error = %v", err)
	}

	if string(params.TemplateIds) != "{}" {
		t.Fatalf("template_ids = %s, want {}", params.TemplateIds)
	}
}

func TestBuildUpdateDefinitionParams_NilDefinition(t *testing.T) {
	t.Parallel()

	in := UpdateInput{
		ID:            uuid.New(),
		EnvironmentID: uuid.New(),
		Key:           "test_workflow",
		Name:          "Test Workflow",
	}

	current := db.Workflow{
		ID:            in.ID,
		EnvironmentID: in.EnvironmentID,
	}

	_, err := buildUpdateDefinitionParams(current, in)
	if err != ErrInvalidWorkflow {
		t.Fatalf("expected ErrInvalidWorkflow for nil definition, got %v", err)
	}
}

// ─── helpers ────────────────────────────────────────────────────────────────

func mustRawJSON(t *testing.T, s string) json.RawMessage {
	t.Helper()
	return json.RawMessage(s)
}

func strPtr(s string) *string {
	return &s
}

func stringSliceEqual(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}
