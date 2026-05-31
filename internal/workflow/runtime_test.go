package workflow

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/deveasyclick/iwifunni/internal/db"
	"github.com/deveasyclick/iwifunni/internal/types"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

type scheduledWorkflowStep struct {
	job   *types.WorkflowStepJob
	delay time.Duration
}

type fakeWorkflowStepProducer struct {
	notifications []*types.NotificationJob
	queued        []*types.WorkflowStepJob
	scheduled     []scheduledWorkflowStep
}

func (f *fakeWorkflowStepProducer) Enqueue(_ context.Context, job *types.NotificationJob) error {
	f.notifications = append(f.notifications, job)
	return nil
}

func (f *fakeWorkflowStepProducer) EnqueueWorkflowStep(_ context.Context, job *types.WorkflowStepJob) error {
	f.queued = append(f.queued, job)
	return nil
}

func (f *fakeWorkflowStepProducer) EnqueueWorkflowStepIn(_ context.Context, job *types.WorkflowStepJob, delay time.Duration) error {
	f.scheduled = append(f.scheduled, scheduledWorkflowStep{job: job, delay: delay})
	return nil
}

type fakeWorkflowRepo struct {
	workflow         db.Workflow
	execution        db.WorkflowExecution
	stepExecutions   map[string]db.WorkflowStepExecution
	subscriber       db.Subscriber
	template         db.Template
	executionUpdates []db.UpdateWorkflowExecutionStateParams
	stepUpdates      []db.UpdateWorkflowStepExecutionStateParams
}

func (f *fakeWorkflowRepo) CreateDefinition(context.Context, db.CreateWorkflowDefinitionParams) (db.Workflow, error) {
	panic("unexpected call to CreateDefinition")
}

func (f *fakeWorkflowRepo) GetActiveByTriggerEvent(context.Context, uuid.UUID, string) ([]db.Workflow, error) {
	panic("unexpected call to GetActiveByTriggerEvent")
}

func (f *fakeWorkflowRepo) Create(context.Context, db.CreateWorkflowParams) (db.Workflow, error) {
	panic("unexpected call to Create")
}

func (f *fakeWorkflowRepo) CreateExecution(context.Context, db.CreateWorkflowExecutionParams) (db.WorkflowExecution, error) {
	panic("unexpected call to CreateExecution")
}

func (f *fakeWorkflowRepo) List(context.Context, uuid.UUID) ([]db.Workflow, error) {
	panic("unexpected call to List")
}

func (f *fakeWorkflowRepo) GetByID(context.Context, uuid.UUID, uuid.UUID) (db.Workflow, error) {
	return f.workflow, nil
}

func (f *fakeWorkflowRepo) ListExecutions(context.Context, uuid.UUID, *uuid.UUID) ([]db.WorkflowExecution, error) {
	panic("unexpected call to ListExecutions")
}

func (f *fakeWorkflowRepo) GetExecutionByID(context.Context, uuid.UUID, uuid.UUID) (db.WorkflowExecution, error) {
	return f.execution, nil
}

func (f *fakeWorkflowRepo) GetSubscriberByID(context.Context, uuid.UUID, uuid.UUID) (db.Subscriber, error) {
	return f.subscriber, nil
}

func (f *fakeWorkflowRepo) GetTemplateByID(context.Context, uuid.UUID, uuid.UUID) (db.Template, error) {
	return f.template, nil
}

func (f *fakeWorkflowRepo) GetStepExecution(_ context.Context, _ uuid.UUID, stepID string) (db.WorkflowStepExecution, error) {
	if item, ok := f.stepExecutions[stepID]; ok {
		return item, nil
	}
	return db.WorkflowStepExecution{}, pgx.ErrNoRows
}

func (f *fakeWorkflowRepo) CreateStepExecution(_ context.Context, arg db.CreateWorkflowStepExecutionParams) (db.WorkflowStepExecution, error) {
	item := db.WorkflowStepExecution{
		ID:          arg.ID,
		ExecutionID: arg.ExecutionID,
		StepID:      arg.StepID,
		StepType:    arg.StepType,
		Status:      arg.Status,
		Attempts:    arg.Attempts,
		InputJson:   arg.InputJson,
		OutputJson:  arg.OutputJson,
		ErrorJson:   arg.ErrorJson,
		StartedAt:   arg.StartedAt,
		CompletedAt: arg.CompletedAt,
		FailedAt:    arg.FailedAt,
	}
	f.stepExecutions[arg.StepID] = item
	return item, nil
	}

func (f *fakeWorkflowRepo) UpdateStepExecutionState(_ context.Context, arg db.UpdateWorkflowStepExecutionStateParams) (db.WorkflowStepExecution, error) {
	current := f.stepExecutions[arg.StepID]
	current.Status = arg.Status
	current.Attempts = arg.Attempts
	current.InputJson = arg.InputJson
	current.OutputJson = arg.OutputJson
	current.ErrorJson = arg.ErrorJson
	current.StartedAt = arg.StartedAt
	current.CompletedAt = arg.CompletedAt
	current.FailedAt = arg.FailedAt
	f.stepExecutions[arg.StepID] = current
	f.stepUpdates = append(f.stepUpdates, arg)
	return current, nil
}

func (f *fakeWorkflowRepo) UpdateExecutionState(_ context.Context, executionID, environmentID uuid.UUID, status string, currentStepID *string, completedAt, failedAt pgtype.Timestamptz) (db.WorkflowExecution, error) {
	f.execution.ID = executionID
	f.execution.EnvironmentID = environmentID
	f.execution.Status = status
	f.execution.CurrentStepID = currentStepID
	f.execution.CompletedAt = completedAt
	f.execution.FailedAt = failedAt
	f.executionUpdates = append(f.executionUpdates, db.UpdateWorkflowExecutionStateParams{
		ID:            executionID,
		EnvironmentID: environmentID,
		Status:        status,
		CurrentStepID: currentStepID,
		CompletedAt:   completedAt,
		FailedAt:      failedAt,
	})
	return f.execution, nil
}

func (f *fakeWorkflowRepo) ListStepExecutionsByExecution(context.Context, uuid.UUID) ([]db.WorkflowStepExecution, error) {
	items := make([]db.WorkflowStepExecution, 0, len(f.stepExecutions))
	for _, item := range f.stepExecutions {
		items = append(items, item)
	}
	return items, nil
}

func (f *fakeWorkflowRepo) Update(context.Context, db.UpdateWorkflowParams) (db.Workflow, error) {
	panic("unexpected call to Update")
}

func (f *fakeWorkflowRepo) UpdateDefinition(context.Context, db.UpdateWorkflowDefinitionParams) (db.Workflow, error) {
	panic("unexpected call to UpdateDefinition")
}

func (f *fakeWorkflowRepo) Delete(context.Context, uuid.UUID, uuid.UUID) error {
	panic("unexpected call to Delete")
}

func TestProcessStepTriggerQueuesNextStep(t *testing.T) {
	t.Parallel()

	repo, execution, workflowRecord := newRuntimeTestFixture(t, Definition{
		Trigger: Trigger{Event: "user.signup"},
		Nodes: []Node{
			{ID: "start", Type: WorkflowStepTypeTrigger},
			{ID: "next_delay", Type: WorkflowStepTypeDelay, Config: mustJSON(t, DelayConfig{Duration: "5m"})},
		},
		Edges: []Edge{{Source: "start", Target: "next_delay"}},
	})
	producer := &fakeWorkflowStepProducer{}
	service := &Service{repo: repo, producer: producer}

	err := service.ProcessStep(context.Background(), types.WorkflowStepJob{
		EnvironmentID: execution.EnvironmentID.String(),
		ExecutionID:   execution.ID.String(),
		WorkflowID:    workflowRecord.ID.String(),
		StepID:        "start",
	})
	if err != nil {
		t.Fatalf("ProcessStep returned error: %v", err)
	}

	if len(producer.queued) != 1 || producer.queued[0].StepID != "next_delay" {
		t.Fatalf("queued next steps = %+v, want next_delay", producer.queued)
	}
	if repo.execution.Status != "queued" {
		t.Fatalf("execution status = %s, want queued", repo.execution.Status)
	}
	if repo.execution.CurrentStepID == nil || *repo.execution.CurrentStepID != "next_delay" {
		t.Fatalf("current step = %v, want next_delay", repo.execution.CurrentStepID)
	}
	if repo.stepExecutions["start"].Status != "completed" {
		t.Fatalf("start step status = %s, want completed", repo.stepExecutions["start"].Status)
	}
}

func TestProcessStepDelaySchedulesNextStep(t *testing.T) {
	t.Parallel()

	repo, execution, workflowRecord := newRuntimeTestFixture(t, Definition{
		Trigger: Trigger{Event: "user.signup"},
		Nodes: []Node{
			{ID: "wait", Type: WorkflowStepTypeDelay, Config: mustJSON(t, DelayConfig{Duration: "5m"})},
			{ID: "notify", Type: WorkflowStepTypeNotification, Config: mustJSON(t, NotificationConfig{TemplateID: uuid.NewString(), Channels: []string{"email"}})},
		},
		Edges: []Edge{{Source: "wait", Target: "notify"}},
	})
	producer := &fakeWorkflowStepProducer{}
	service := &Service{repo: repo, producer: producer}

	err := service.ProcessStep(context.Background(), types.WorkflowStepJob{
		EnvironmentID: execution.EnvironmentID.String(),
		ExecutionID:   execution.ID.String(),
		WorkflowID:    workflowRecord.ID.String(),
		StepID:        "wait",
	})
	if err != nil {
		t.Fatalf("ProcessStep returned error: %v", err)
	}

	if len(producer.scheduled) != 1 {
		t.Fatalf("scheduled steps = %d, want 1", len(producer.scheduled))
	}
	if producer.scheduled[0].job.StepID != "notify" {
		t.Fatalf("scheduled step id = %s, want notify", producer.scheduled[0].job.StepID)
	}
	if producer.scheduled[0].delay != 5*time.Minute {
		t.Fatalf("scheduled delay = %s, want 5m", producer.scheduled[0].delay)
	}
	if len(producer.queued) != 0 {
		t.Fatalf("immediate queued steps = %+v, want none", producer.queued)
	}
	if repo.stepExecutions["wait"].Status != "completed" {
		t.Fatalf("delay step status = %s, want completed", repo.stepExecutions["wait"].Status)
	}
}

func TestProcessStepConditionQueuesMatchedBranch(t *testing.T) {
	t.Parallel()

	repo, execution, workflowRecord := newRuntimeTestFixture(t, Definition{
		Trigger: Trigger{Event: "user.signup"},
		Nodes: []Node{{ID: "gate", Type: WorkflowStepTypeCondition, Config: mustJSON(t, ConditionConfig{Field: "data.plan", Operator: "equals", Value: "pro"})}},
		Edges: []Edge{
			{Source: "gate", Target: "vip_email", Branch: "true"},
			{Source: "gate", Target: "standard_email", Branch: "false"},
		},
	})
	execution.TriggerPayload = mustJSON(t, map[string]any{
		"event": "user.signup",
		"data": map[string]any{"plan": "pro"},
	})
	repo.execution = execution
	producer := &fakeWorkflowStepProducer{}
	service := &Service{repo: repo, producer: producer}

	err := service.ProcessStep(context.Background(), types.WorkflowStepJob{
		EnvironmentID: execution.EnvironmentID.String(),
		ExecutionID:   execution.ID.String(),
		WorkflowID:    workflowRecord.ID.String(),
		StepID:        "gate",
	})
	if err != nil {
		t.Fatalf("ProcessStep returned error: %v", err)
	}

	if len(producer.queued) != 1 || producer.queued[0].StepID != "vip_email" {
		t.Fatalf("queued next steps = %+v, want vip_email", producer.queued)
	}
	var output map[string]any
	if err := json.Unmarshal(repo.stepExecutions["gate"].OutputJson, &output); err != nil {
		t.Fatalf("unmarshal output: %v", err)
	}
	if matched, ok := output["matched"].(bool); !ok || !matched {
		t.Fatalf("condition output = %+v, want matched=true", output)
	}
}

func TestProcessStepNotificationEnqueuesNotification(t *testing.T) {
	t.Parallel()

	templateID := uuid.New()
	repo, execution, workflowRecord := newRuntimeTestFixture(t, Definition{
		Trigger: Trigger{Event: "user.signup"},
		Nodes: []Node{{
			ID:   "welcome_email",
			Type: WorkflowStepTypeNotification,
			Config: mustJSON(t, NotificationConfig{
				TemplateID: templateID.String(),
				Channels:   []string{"email"},
			}),
		}},
	})
	email := "ada@example.com"
	repo.subscriber = db.Subscriber{ID: uuid.UUID(execution.SubscriberID.Bytes), EnvironmentID: execution.EnvironmentID, Name: "Ada", Email: &email}
	subject := "Welcome {{.name}}"
	repo.template = db.Template{
		ID:            templateID,
		EnvironmentID: execution.EnvironmentID,
		Name:          "Welcome",
		Channel:       "email",
		Subject:       &subject,
		Body:          "Hi {{.name}}, your plan is {{.plan}}.",
		IsActive:      true,
	}
	execution.TriggerPayload = mustJSON(t, map[string]any{
		"event": "user.signup",
		"data": map[string]any{"plan": "pro"},
	})
	repo.execution = execution
	producer := &fakeWorkflowStepProducer{}
	service := &Service{repo: repo, producer: producer}

	err := service.ProcessStep(context.Background(), types.WorkflowStepJob{
		EnvironmentID: execution.EnvironmentID.String(),
		ExecutionID:   execution.ID.String(),
		WorkflowID:    workflowRecord.ID.String(),
		StepID:        "welcome_email",
	})
	if err != nil {
		t.Fatalf("ProcessStep returned error: %v", err)
	}

	if len(producer.notifications) != 1 {
		t.Fatalf("notifications queued = %d, want 1", len(producer.notifications))
	}
	job := producer.notifications[0]
	if job.Recipient.Email != email {
		t.Fatalf("recipient email = %s, want %s", job.Recipient.Email, email)
	}
	if content := job.ContentForChannel("email"); content.Title != "Welcome Ada" || content.Message != "Hi Ada, your plan is pro." {
		t.Fatalf("notification content = %+v, want rendered template", content)
	}
	if repo.execution.Status != "completed" {
		t.Fatalf("execution status = %s, want completed", repo.execution.Status)
	}
	if repo.stepExecutions["welcome_email"].Status != "completed" {
		t.Fatalf("notification step status = %s, want completed", repo.stepExecutions["welcome_email"].Status)
	}
}

func newRuntimeTestFixture(t *testing.T, definition Definition) (*fakeWorkflowRepo, db.WorkflowExecution, db.Workflow) {
	t.Helper()

	environmentID := uuid.New()
	workflowID := uuid.New()
	executionID := uuid.New()
	subscriberID := uuid.New()
	definitionJSON, err := marshalDefinition(definition)
	if err != nil {
		t.Fatalf("marshal definition: %v", err)
	}
	workflowRecord := db.Workflow{
		ID:             workflowID,
		EnvironmentID:  environmentID,
		Key:            "workflow_key",
		Name:           "Workflow",
		Status:         string(WorkflowStatusActive),
		DefinitionJson: definitionJSON,
	}
	execution := db.WorkflowExecution{
		ID:            executionID,
		WorkflowID:    workflowID,
		EnvironmentID: environmentID,
		SubscriberID:  pgtype.UUID{Bytes: subscriberID, Valid: true},
		Status:        "queued",
	}
	repo := &fakeWorkflowRepo{
		workflow:       workflowRecord,
		execution:      execution,
		stepExecutions: make(map[string]db.WorkflowStepExecution),
	}
	return repo, execution, workflowRecord
}

func mustJSON(t *testing.T, value any) []byte {
	t.Helper()
	raw, err := json.Marshal(value)
	if err != nil {
		t.Fatalf("marshal json: %v", err)
	}
	return raw
}