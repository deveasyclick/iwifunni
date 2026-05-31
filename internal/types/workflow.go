package types

type WorkflowStepJob struct {
	EnvironmentID string `json:"environment_id"`
	ExecutionID string `json:"execution_id"`
	WorkflowID  string `json:"workflow_id"`
	StepID      string `json:"step_id"`
}