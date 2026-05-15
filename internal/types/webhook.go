package types

type WebhookDeliveryJob struct {
	JobID     string `json:"job_id"`
	WebhookID string `json:"webhook_id"`
	ProjectID string `json:"project_id"`
	Event     string `json:"event"`
	Payload   []byte `json:"payload"`
}