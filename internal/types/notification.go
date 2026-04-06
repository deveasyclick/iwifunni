package types

type NotificationJob struct {
    JobID     string            `json:"job_id"`
    ServiceID string            `json:"service_id"`
    UserID    string            `json:"user_id"`
    Title     string            `json:"title"`
    Message   string            `json:"message"`
    Channels  []string          `json:"channels,omitempty"`
    Metadata  map[string]string `json:"metadata,omitempty"`
}
