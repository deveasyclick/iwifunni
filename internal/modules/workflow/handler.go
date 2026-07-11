package workflow

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/deveasyclick/iwifunni/internal/db/gen"
	"github.com/deveasyclick/iwifunni/internal/shared/validate"
	"github.com/deveasyclick/iwifunni/internal/shared/authctx"
	"github.com/deveasyclick/iwifunni/pkg/logger"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
)

type Handler struct {
	service handlerService
}

type handlerService interface {
	Create(context.Context, CreateInput) (db.Workflow, error)
	TriggerEvent(context.Context, uuid.UUID, TriggerEventInput) ([]db.WorkflowExecution, error)
	List(context.Context, uuid.UUID) ([]db.Workflow, error)
	GetByID(context.Context, uuid.UUID, uuid.UUID) (db.Workflow, error)
	Update(context.Context, UpdateInput) (db.Workflow, error)
	Delete(context.Context, uuid.UUID, uuid.UUID) error
	ListExecutions(context.Context, uuid.UUID, *uuid.UUID) ([]db.WorkflowExecution, error)
	GetExecutionByID(context.Context, uuid.UUID, uuid.UUID) (ExecutionDetail, error)
}

func NewHandler(service handlerService) *Handler {
	return &Handler{service: service}
}

func (h *Handler) Register(r chi.Router) {
	h.RegisterDashboardRoutes(r)
	h.RegisterAPIRoutes(r)
}

func (h *Handler) RegisterDashboardRoutes(r chi.Router) {
	r.Post("/workflows", h.create)
	r.Get("/workflows", h.list)
	r.Get("/workflows/{workflowID}", h.get)
	r.Put("/workflows/{workflowID}", h.update)
	r.Delete("/workflows/{workflowID}", h.delete)
	r.Get("/workflow-executions", h.listExecutions)
	r.Get("/workflow-executions/{executionID}", h.getExecution)
}

func (h *Handler) RegisterAPIRoutes(r chi.Router) {
	r.Post("/events", h.triggerEvent)
}

type workflowRequest struct {
	Key         string            `json:"key"`
	Name        string            `json:"name"`
	Description *string           `json:"description"`
	Channels    []string          `json:"channels"`
	TemplateIDs map[string]string `json:"templateIds"`
	IsActive    bool              `json:"isActive"`
	Definition  *Definition       `json:"definition,omitempty"`
}

type triggerEventRequest struct {
	Event        string         `json:"event"`
	SubscriberID string         `json:"subscriber_id,omitempty"`
	Data         map[string]any `json:"data,omitempty"`
}

type workflowResponse struct {
	ID          uuid.UUID         `json:"id"`
	Key         string            `json:"key"`
	Name        string            `json:"name"`
	Description *string           `json:"description,omitempty"`
	Channels    []string          `json:"channels"`
	TemplateIDs map[string]string `json:"templateIds"`
	IsActive    bool              `json:"isActive"`
	Status      string            `json:"status"`
	Version     int32             `json:"version"`
	TriggerEvent *string          `json:"triggerEvent,omitempty"`
	Definition  *Definition       `json:"definition,omitempty"`
	CreatedAt   string            `json:"createdAt"`
	UpdatedAt   string            `json:"updatedAt"`
}

type workflowExecutionResponse struct {
	ID             uuid.UUID        `json:"id"`
	WorkflowID     uuid.UUID        `json:"workflowId"`
	SubscriberID   *string          `json:"subscriberId,omitempty"`
	Status         string           `json:"status"`
	CurrentStepID  *string          `json:"currentStepId,omitempty"`
	TriggerPayload json.RawMessage  `json:"triggerPayload,omitempty"`
	StartedAt      string           `json:"startedAt"`
	CompletedAt    string           `json:"completedAt,omitempty"`
	FailedAt       string           `json:"failedAt,omitempty"`
	CreatedAt      string           `json:"createdAt"`
	UpdatedAt      string           `json:"updatedAt"`
}

type workflowStepExecutionResponse struct {
	ID          uuid.UUID       `json:"id"`
	ExecutionID uuid.UUID       `json:"executionId"`
	StepID      string          `json:"stepId"`
	StepType    string          `json:"stepType"`
	Status      string          `json:"status"`
	Attempts    int32           `json:"attempts"`
	Input       json.RawMessage `json:"input,omitempty"`
	Output      json.RawMessage `json:"output,omitempty"`
	Error       json.RawMessage `json:"error,omitempty"`
	StartedAt   string          `json:"startedAt,omitempty"`
	CompletedAt string          `json:"completedAt,omitempty"`
	FailedAt    string          `json:"failedAt,omitempty"`
	CreatedAt   string          `json:"createdAt"`
	UpdatedAt   string          `json:"updatedAt"`
}

type workflowExecutionDetailResponse struct {
	workflowExecutionResponse
	Steps []workflowStepExecutionResponse `json:"steps"`
}

type triggerEventResponse struct {
	Status     string                      `json:"status"`
	Executions []workflowExecutionResponse `json:"executions"`
}

// @Summary      Create workflow
// @Description  Create a new notification workflow
// @Tags         Workflows
// @Accept       json
// @Produce      json
// @Param        body  body  workflowRequest  true  "Workflow configuration"
// @Success      201   {object}  workflowResponse
// @Failure      400   {string}  string  "Invalid workflow payload"
// @Failure      401   {string}  string  "Unauthorized"
// @Router       /workflows [post]
// @Security     BearerAuth
func (h *Handler) create(w http.ResponseWriter, r *http.Request) {
	environmentID, ok := authctx.GetEnvironmentID(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	var req workflowRequest
	if !validate.DecodeAndRespond(w, r, &req) {
		return
	}
	item, err := h.service.Create(r.Context(), CreateInput{
		EnvironmentID: environmentID,
		Key:           req.Key,
		Name:          req.Name,
		Description:   req.Description,
		Channels:      req.Channels,
		TemplateIDs:   req.TemplateIDs,
		Definition:    req.Definition,
	})
	if err != nil {
		h.respondError(w, err)
		return
	}
	h.writeJSON(w, http.StatusCreated, workflowFromRecord(item))
}

// @Summary      Trigger event
// @Description  Trigger workflows matching an event name via API key auth
// @Tags         Workflows
// @Accept       json
// @Produce      json
// @Param        body  body  triggerEventRequest  true  "Event payload"
// @Success      202   {object}  triggerEventResponse
// @Failure      400   {string}  string  "Invalid payload"
// @Failure      401   {string}  string  "Unauthorized"
// @Router       /events [post]
// @Security     ApiKeyAuth
func (h *Handler) triggerEvent(w http.ResponseWriter, r *http.Request) {
	environmentID, ok := authctx.GetEnvironmentID(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	var req triggerEventRequest
	if !validate.DecodeAndRespond(w, r, &req) {
		return
	}

	executions, err := h.service.TriggerEvent(r.Context(), environmentID, TriggerEventInput{
		Event:        req.Event,
		SubscriberID: req.SubscriberID,
		Data:         req.Data,
	})
	if err != nil {
		h.respondError(w, err)
		return
	}

	response := make([]workflowExecutionResponse, 0, len(executions))
	for _, item := range executions {
		response = append(response, workflowExecutionFromRecord(item))
	}
	h.writeJSON(w, http.StatusAccepted, triggerEventResponse{Status: "queued", Executions: response})
}

// @Summary      List workflows
// @Description  Get all workflows for the project
// @Tags         Workflows
// @Produce      json
// @Success      200  {array}   workflowResponse
// @Failure      401  {string}  string  "Unauthorized"
// @Router       /workflows [get]
// @Security     BearerAuth
func (h *Handler) list(w http.ResponseWriter, r *http.Request) {
	environmentID, ok := authctx.GetEnvironmentID(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	items, err := h.service.List(r.Context(), environmentID)
	if err != nil {
		http.Error(w, "failed to list workflows", http.StatusInternalServerError)
		return
	}
	response := make([]workflowResponse, 0, len(items))
	for _, item := range items {
		response = append(response, workflowFromRecord(item))
	}
	h.writeJSON(w, http.StatusOK, response)
}

// @Summary      Get workflow
// @Description  Get a single workflow by ID
// @Tags         Workflows
// @Produce      json
// @Param        workflowID  path  string  true  "Workflow ID"
// @Success      200         {object}  workflowResponse
// @Failure      400         {string}  string  "Invalid ID"
// @Failure      401         {string}  string  "Unauthorized"
// @Failure      404         {string}  string  "Not found"
// @Router       /workflows/{workflowID} [get]
// @Security     BearerAuth
func (h *Handler) get(w http.ResponseWriter, r *http.Request) {
	environmentID, ok := authctx.GetEnvironmentID(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "workflowID"))
	if err != nil {
		http.Error(w, "invalid workflow id", http.StatusBadRequest)
		return
	}
	item, err := h.service.GetByID(r.Context(), id, environmentID)
	if err != nil {
		h.respondError(w, err)
		return
	}
	h.writeJSON(w, http.StatusOK, workflowFromRecord(item))
}

// @Summary      Update workflow
// @Description  Update a workflow configuration
// @Tags         Workflows
// @Accept       json
// @Produce      json
// @Param        workflowID  path  string  true  "Workflow ID"
// @Param        body        body  workflowRequest  true  "Updated workflow data"
// @Success      200         {object}  workflowResponse
// @Failure      400         {string}  string  "Invalid ID or payload"
// @Failure      401         {string}  string  "Unauthorized"
// @Failure      404         {string}  string  "Not found"
// @Failure      409         {string}  string  "Published workflows are immutable"
// @Router       /workflows/{workflowID} [put]
// @Security     BearerAuth
func (h *Handler) update(w http.ResponseWriter, r *http.Request) {
	environmentID, ok := authctx.GetEnvironmentID(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "workflowID"))
	if err != nil {
		http.Error(w, "invalid workflow id", http.StatusBadRequest)
		return
	}
	var req workflowRequest
	if !validate.DecodeAndRespond(w, r, &req) {
		return
	}
	item, err := h.service.Update(r.Context(), UpdateInput{
		ID:            id,
		EnvironmentID: environmentID,
		Key:           req.Key,
		Name:          req.Name,
		Description:   req.Description,
		Channels:      req.Channels,
		TemplateIDs:   req.TemplateIDs,
		IsActive:      req.IsActive,
		Definition:    req.Definition,
	})
	if err != nil {
		h.respondError(w, err)
		return
	}
	h.writeJSON(w, http.StatusOK, workflowFromRecord(item))
}



// @Summary      Delete workflow
// @Description  Delete a workflow
// @Tags         Workflows
// @Param        workflowID  path  string  true  "Workflow ID"
// @Success      204         {string}  string  "No content"
// @Failure      400         {string}  string  "Invalid ID"
// @Failure      401         {string}  string  "Unauthorized"
// @Router       /workflows/{workflowID} [delete]
// @Security     BearerAuth
func (h *Handler) delete(w http.ResponseWriter, r *http.Request) {
	environmentID, ok := authctx.GetEnvironmentID(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "workflowID"))
	if err != nil {
		http.Error(w, "invalid workflow id", http.StatusBadRequest)
		return
	}
	if err := h.service.Delete(r.Context(), id, environmentID); err != nil {
		h.respondError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// @Summary      List workflow executions
// @Description  Get all workflow executions, optionally filtered by workflow ID
// @Tags         Workflows
// @Produce      json
// @Param        workflow_id  query  string  false  "Filter by workflow ID"
// @Success      200          {array}   workflowExecutionResponse
// @Failure      400          {string}  string  "Invalid workflow ID"
// @Failure      401          {string}  string  "Unauthorized"
// @Router       /workflow-executions [get]
// @Security     BearerAuth
func (h *Handler) listExecutions(w http.ResponseWriter, r *http.Request) {
	environmentID, ok := authctx.GetEnvironmentID(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var workflowID *uuid.UUID
	if raw := strings.TrimSpace(r.URL.Query().Get("workflow_id")); raw != "" {
		parsed, err := uuid.Parse(raw)
		if err != nil {
			http.Error(w, "invalid workflow id", http.StatusBadRequest)
			return
		}
		workflowID = &parsed
	}

	items, err := h.service.ListExecutions(r.Context(), environmentID, workflowID)
	if err != nil {
		http.Error(w, "failed to list workflow executions", http.StatusInternalServerError)
		return
	}

	response := make([]workflowExecutionResponse, 0, len(items))
	for _, item := range items {
		response = append(response, workflowExecutionFromRecord(item))
	}
	h.writeJSON(w, http.StatusOK, response)
}

// @Summary      Get workflow execution
// @Description  Get a workflow execution with step details
// @Tags         Workflows
// @Produce      json
// @Param        executionID  path  string  true  "Execution ID"
// @Success      200          {object}  workflowExecutionDetailResponse
// @Failure      400          {string}  string  "Invalid ID"
// @Failure      401          {string}  string  "Unauthorized"
// @Failure      404          {string}  string  "Not found"
// @Router       /workflow-executions/{executionID} [get]
// @Security     BearerAuth
func (h *Handler) getExecution(w http.ResponseWriter, r *http.Request) {
	environmentID, ok := authctx.GetEnvironmentID(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "executionID"))
	if err != nil {
		http.Error(w, "invalid execution id", http.StatusBadRequest)
		return
	}

	detail, err := h.service.GetExecutionByID(r.Context(), id, environmentID)
	if err != nil {
		h.respondError(w, err)
		return
	}

	h.writeJSON(w, http.StatusOK, workflowExecutionDetailFromRecord(detail))
}

func (h *Handler) respondError(w http.ResponseWriter, err error) {
	var pgErr *pgconn.PgError
	switch {
	case errors.Is(err, ErrInvalidWorkflow):
		http.Error(w, "invalid workflow payload", http.StatusBadRequest)
	case errors.Is(err, ErrInvalidWorkflowEvent):
		http.Error(w, "invalid workflow event payload", http.StatusBadRequest)
	case errors.Is(err, pgx.ErrNoRows):
		http.Error(w, "workflow not found", http.StatusNotFound)
	case errors.As(err, &pgErr) && pgErr.Code == "23505":
		http.Error(w, "a workflow with this key already exists", http.StatusConflict)
	default:
		logger.Get().Error("workflow: unhandled error", "error", err)
		http.Error(w, "workflow request failed", http.StatusInternalServerError)
	}
}

func (h *Handler) writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func workflowFromRecord(item db.Workflow) workflowResponse {
	templateIDs := make(map[string]string)
	if len(item.TemplateIds) > 0 {
		_ = json.Unmarshal(item.TemplateIds, &templateIDs)
	}
	var definition *Definition
	if raw := strings.TrimSpace(string(item.DefinitionJson)); raw != "" && raw != "{}" && raw != "null" {
		var parsed Definition
		if err := json.Unmarshal(item.DefinitionJson, &parsed); err == nil {
			definition = &parsed
		}
	}
	return workflowResponse{
		ID:          item.ID,
		Key:         item.Key,
		Name:        item.Name,
		Description: item.Description,
		Channels:    item.Channels,
		TemplateIDs: templateIDs,
		IsActive:    item.IsActive,
		Status:      item.Status,
		Version:     item.Version,
		TriggerEvent: item.TriggerEvent,
		Definition:  definition,
		CreatedAt:   formatTime(item.CreatedAt),
		UpdatedAt:   formatTime(item.UpdatedAt),
	}
}

func workflowExecutionFromRecord(item db.WorkflowExecution) workflowExecutionResponse {
	return workflowExecutionResponse{
		ID:             item.ID,
		WorkflowID:     item.WorkflowID,
		SubscriberID:   formatUUID(item.SubscriberID),
		Status:         item.Status,
		CurrentStepID:  item.CurrentStepID,
		TriggerPayload: rawJSON(item.TriggerPayload),
		StartedAt:      formatTime(item.StartedAt),
		CompletedAt:    formatTime(item.CompletedAt),
		FailedAt:       formatTime(item.FailedAt),
		CreatedAt:      formatTime(item.CreatedAt),
		UpdatedAt:      formatTime(item.UpdatedAt),
	}
}

func workflowExecutionDetailFromRecord(detail ExecutionDetail) workflowExecutionDetailResponse {
	steps := make([]workflowStepExecutionResponse, 0, len(detail.Steps))
	for _, step := range detail.Steps {
		steps = append(steps, workflowStepExecutionFromRecord(step))
	}

	return workflowExecutionDetailResponse{
		workflowExecutionResponse: workflowExecutionFromRecord(detail.Execution),
		Steps:                     steps,
	}
}

func workflowStepExecutionFromRecord(item db.WorkflowStepExecution) workflowStepExecutionResponse {
	return workflowStepExecutionResponse{
		ID:          item.ID,
		ExecutionID: item.ExecutionID,
		StepID:      item.StepID,
		StepType:    item.StepType,
		Status:      item.Status,
		Attempts:    item.Attempts,
		Input:       rawJSON(item.InputJson),
		Output:      rawJSON(item.OutputJson),
		Error:       rawJSON(item.ErrorJson),
		StartedAt:   formatTime(item.StartedAt),
		CompletedAt: formatTime(item.CompletedAt),
		FailedAt:    formatTime(item.FailedAt),
		CreatedAt:   formatTime(item.CreatedAt),
		UpdatedAt:   formatTime(item.UpdatedAt),
	}
}

func formatUUID(value pgtype.UUID) *string {
	if !value.Valid {
		return nil
	}
	formatted := uuid.UUID(value.Bytes).String()
	return &formatted
}

func rawJSON(value []byte) json.RawMessage {
	trimmed := strings.TrimSpace(string(value))
	if trimmed == "" || trimmed == "null" || trimmed == "{}" {
		return nil
	}
	return json.RawMessage(value)
}

func formatTime(value pgtype.Timestamptz) string {
	if !value.Valid {
		return ""
	}
	return value.Time.UTC().Format(time.RFC3339)
}
