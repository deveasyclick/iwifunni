package types

type Recipient struct {
    Email       string   `json:"email,omitempty"`
    PhoneNumber string   `json:"phone_number,omitempty"`
    PushTokens  []string `json:"push_tokens,omitempty"`
    Reference   string   `json:"reference,omitempty"`
}

type NotificationJob struct {
    JobID     string            `json:"job_id"`
    ServiceID string            `json:"service_id,omitempty"`
    ProjectID string            `json:"project_id,omitempty"`
    Title     string            `json:"title"`
    Message   string            `json:"message"`
    Channels  []string          `json:"channels,omitempty"`
    Recipient Recipient         `json:"recipient"`
    Metadata  map[string]string `json:"metadata,omitempty"`
}
