package workflow

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/deveasyclick/iwifunni/internal/shared/authctx"
	"github.com/deveasyclick/iwifunni/internal/db/gen"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

type fakeWorkflowService struct {
	triggerEventInput        TriggerEventInput
	triggerEventEnvironment  uuid.UUID
	triggerEventExecutions   []db.WorkflowExecution
	triggerEventErr          error
	listExecutionsItems      []db.WorkflowExecution
	listExecutionsErr        error
	listExecutionsWorkflowID *uuid.UUID
	getExecutionDetail       ExecutionDetail
	getExecutionErr          error
	getExecutionID           uuid.UUID
	getExecutionEnvironment  uuid.UUID
}

func (f *fakeWorkflowService) Create(context.Context, CreateInput) (db.Workflow, error) {
	panic("unexpected call")
}

func (f *fakeWorkflowService) List(context.Context, uuid.UUID) ([]db.Workflow, error) {
	panic("unexpected call")
}

func (f *fakeWorkflowService) GetByID(context.Context, uuid.UUID, uuid.UUID) (db.Workflow, error) {
	panic("unexpected call")
}

func (f *fakeWorkflowService) Update(context.Context, UpdateInput) (db.Workflow, error) {
	panic("unexpected call")
}

func (f *fakeWorkflowService) Delete(context.Context, uuid.UUID, uuid.UUID) error {
	panic("unexpected call")
}

func (f *fakeWorkflowService) Pause(context.Context, uuid.UUID, uuid.UUID) (db.Workflow, error) {
	panic("unexpected call")
}

func (f *fakeWorkflowService) Resume(context.Context, uuid.UUID, uuid.UUID) (db.Workflow, error) {
	panic("unexpected call")
}

func (f *fakeWorkflowService) TriggerEvent(_ context.Context, environmentID uuid.UUID, in TriggerEventInput) ([]db.WorkflowExecution, error) {
	f.triggerEventEnvironment = environmentID
	f.triggerEventInput = in
	return f.triggerEventExecutions, f.triggerEventErr
}

func (f *fakeWorkflowService) ListExecutions(_ context.Context, _ uuid.UUID, workflowID *uuid.UUID) ([]db.WorkflowExecution, error) {
	f.listExecutionsWorkflowID = workflowID
	return f.listExecutionsItems, f.listExecutionsErr
}

func TestHandlerTriggerEvent(t *testing.T) {
	t.Parallel()

	environmentID := uuid.New()
	workflowID := uuid.New()
	executionID := uuid.New()
	subscriberID := uuid.New()
	service := &fakeWorkflowService{triggerEventExecutions: []db.WorkflowExecution{{
		ID:             executionID,
		WorkflowID:     workflowID,
		EnvironmentID:  environmentID,
		SubscriberID:   pgtype.UUID{Bytes: subscriberID, Valid: true},
		Status:         "queued",
		CurrentStepID:  stringPtr("delay_1"),
		TriggerPayload: []byte(`{"event":"user.signup","subscriber_id":"` + subscriberID.String() + `","data":{"name":"Ada"}}`),
		StartedAt:      pgtype.Timestamptz{Time: time.Date(2026, time.May, 17, 9, 0, 0, 0, time.UTC), Valid: true},
		CreatedAt:      pgtype.Timestamptz{Time: time.Date(2026, time.May, 17, 9, 0, 0, 0, time.UTC), Valid: true},
		UpdatedAt:      pgtype.Timestamptz{Time: time.Date(2026, time.May, 17, 9, 0, 0, 0, time.UTC), Valid: true},
	}}}

	router := chi.NewRouter()
	handler := &Handler{service: service}
	handler.Register(router)

	req := httptest.NewRequest(http.MethodPost, "/events", strings.NewReader(`{"event":"user.signup","subscriber_id":"`+subscriberID.String()+`","data":{"name":"Ada"}}`))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(context.WithValue(req.Context(), authctx.ProjectContextKey, &authctx.AuthenticatedEnvironment{EnvironmentID: environmentID}))
	res := httptest.NewRecorder()

	router.ServeHTTP(res, req)

	if res.Code != http.StatusAccepted {
		t.Fatalf("status = %d, want %d", res.Code, http.StatusAccepted)
	}
	if service.triggerEventEnvironment != environmentID {
		t.Fatalf("environment id = %s, want %s", service.triggerEventEnvironment, environmentID)
	}
	if service.triggerEventInput.Event != "user.signup" {
		t.Fatalf("event = %q, want %q", service.triggerEventInput.Event, "user.signup")
	}
	if service.triggerEventInput.SubscriberID != subscriberID.String() {
		t.Fatalf("subscriber id = %q, want %q", service.triggerEventInput.SubscriberID, subscriberID.String())
	}
	if got := service.triggerEventInput.Data["name"]; got != "Ada" {
		t.Fatalf("data[name] = %v, want Ada", got)
	}

	var payload triggerEventResponse
	if err := json.NewDecoder(res.Body).Decode(&payload); err != nil {
		t.Fatalf("Decode() error = %v", err)
	}
	if payload.Status != "queued" {
		t.Fatalf("payload.Status = %q, want %q", payload.Status, "queued")
	}
	if len(payload.Executions) != 1 {
		t.Fatalf("len(payload.Executions) = %d, want 1", len(payload.Executions))
	}
	if payload.Executions[0].ID != executionID {
		t.Fatalf("payload.Executions[0].ID = %s, want %s", payload.Executions[0].ID, executionID)
	}
}

func (f *fakeWorkflowService) GetExecutionByID(_ context.Context, id, environmentID uuid.UUID) (ExecutionDetail, error) {
	f.getExecutionID = id
	f.getExecutionEnvironment = environmentID
	return f.getExecutionDetail, f.getExecutionErr
}

func TestHandlerListExecutions(t *testing.T) {
	t.Parallel()

	environmentID := uuid.New()
	workflowID := uuid.New()
	executionID := uuid.New()
	service := &fakeWorkflowService{listExecutionsItems: []db.WorkflowExecution{{
		ID:            executionID,
		WorkflowID:    workflowID,
		EnvironmentID: environmentID,
		Status:        "queued",
		StartedAt:     pgtype.Timestamptz{Time: time.Date(2026, time.May, 17, 7, 30, 0, 0, time.UTC), Valid: true},
		CreatedAt:     pgtype.Timestamptz{Time: time.Date(2026, time.May, 17, 7, 30, 0, 0, time.UTC), Valid: true},
		UpdatedAt:     pgtype.Timestamptz{Time: time.Date(2026, time.May, 17, 7, 30, 0, 0, time.UTC), Valid: true},
	}}}

	router := chi.NewRouter()
	handler := &Handler{service: service}
	handler.Register(router)

	req := httptest.NewRequest(http.MethodGet, "/workflow-executions?workflow_id="+workflowID.String(), nil)
	req = req.WithContext(context.WithValue(req.Context(), authctx.ProjectContextKey, &authctx.AuthenticatedEnvironment{EnvironmentID: environmentID}))
	res := httptest.NewRecorder()

	router.ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", res.Code, http.StatusOK)
	}
	if service.listExecutionsWorkflowID == nil || *service.listExecutionsWorkflowID != workflowID {
		t.Fatalf("workflow filter = %v, want %s", service.listExecutionsWorkflowID, workflowID)
	}

	var payload []workflowExecutionResponse
	if err := json.NewDecoder(res.Body).Decode(&payload); err != nil {
		t.Fatalf("Decode() error = %v", err)
	}
	if len(payload) != 1 {
		t.Fatalf("len(payload) = %d, want 1", len(payload))
	}
	if payload[0].ID != executionID {
		t.Fatalf("payload[0].ID = %s, want %s", payload[0].ID, executionID)
	}
}

func TestHandlerGetExecution(t *testing.T) {
	t.Parallel()

	environmentID := uuid.New()
	executionID := uuid.New()
	workflowID := uuid.New()
	stepID := uuid.New()
	service := &fakeWorkflowService{getExecutionDetail: ExecutionDetail{
		Execution: db.WorkflowExecution{
			ID:             executionID,
			WorkflowID:     workflowID,
			EnvironmentID:  environmentID,
			Status:         "running",
			CurrentStepID:  stringPtr("delay_1"),
			TriggerPayload: []byte(`{"event":"user.signup"}`),
			StartedAt:      pgtype.Timestamptz{Time: time.Date(2026, time.May, 17, 7, 35, 0, 0, time.UTC), Valid: true},
			CreatedAt:      pgtype.Timestamptz{Time: time.Date(2026, time.May, 17, 7, 35, 0, 0, time.UTC), Valid: true},
			UpdatedAt:      pgtype.Timestamptz{Time: time.Date(2026, time.May, 17, 7, 35, 0, 0, time.UTC), Valid: true},
		},
		Steps: []db.WorkflowStepExecution{{
			ID:          stepID,
			ExecutionID: executionID,
			StepID:      "delay_1",
			StepType:    "delay",
			Status:      "running",
			Attempts:    1,
			InputJson:   []byte(`{"duration":"5m"}`),
			CreatedAt:   pgtype.Timestamptz{Time: time.Date(2026, time.May, 17, 7, 35, 0, 0, time.UTC), Valid: true},
			UpdatedAt:   pgtype.Timestamptz{Time: time.Date(2026, time.May, 17, 7, 35, 0, 0, time.UTC), Valid: true},
		}},
	}}

	router := chi.NewRouter()
	handler := &Handler{service: service}
	handler.Register(router)

	req := httptest.NewRequest(http.MethodGet, "/workflow-executions/"+executionID.String(), nil)
	req = req.WithContext(context.WithValue(req.Context(), authctx.ProjectContextKey, &authctx.AuthenticatedEnvironment{EnvironmentID: environmentID}))
	res := httptest.NewRecorder()

	router.ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", res.Code, http.StatusOK)
	}
	if service.getExecutionID != executionID {
		t.Fatalf("execution id = %s, want %s", service.getExecutionID, executionID)
	}
	if service.getExecutionEnvironment != environmentID {
		t.Fatalf("environment id = %s, want %s", service.getExecutionEnvironment, environmentID)
	}

	var payload workflowExecutionDetailResponse
	if err := json.NewDecoder(res.Body).Decode(&payload); err != nil {
		t.Fatalf("Decode() error = %v", err)
	}
	if payload.ID != executionID {
		t.Fatalf("payload.ID = %s, want %s", payload.ID, executionID)
	}
	if len(payload.Steps) != 1 {
		t.Fatalf("len(payload.Steps) = %d, want 1", len(payload.Steps))
	}
	if payload.Steps[0].StepID != "delay_1" {
		t.Fatalf("payload.Steps[0].StepID = %q, want %q", payload.Steps[0].StepID, "delay_1")
	}
	if string(payload.TriggerPayload) != `{"event":"user.signup"}` {
		t.Fatalf("payload.TriggerPayload = %s, want event payload", payload.TriggerPayload)
	}
}

func stringPtr(value string) *string {
	return &value
}