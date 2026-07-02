package types

type ChannelContent struct {
	Title   string `json:"title"`
	Message string `json:"message"`
}

type SkippedChannel struct {
	Channel string `json:"channel"`
	Reason  string `json:"reason"`
}

// SubscriberTo carries subscriber identification and optional field overrides
// sent in the API request body. If SubscriberID is provided, the existing
// subscriber is updated with any non-empty fields. If SubscriberID is empty,
// a new subscriber is created.
type SubscriberTo struct {
	SubscriberID string `json:"subscriberId,omitempty"`
	FirstName    string `json:"firstName,omitempty"`
	LastName     string `json:"lastName,omitempty"`
	Email        string `json:"email,omitempty"`
	Phone        string `json:"phone,omitempty"`
	Push         string `json:"push,omitempty"`
}

type Recipient struct {
	Email       string   `json:"email,omitempty"`
	PhoneNumber string   `json:"phone_number,omitempty"`
	PushTokens  []string `json:"push_tokens,omitempty"`
	Reference   string   `json:"reference,omitempty"`
}

type NotificationJob struct {
	JobID           string                    `json:"job_id"`
	ServiceID       string                    `json:"service_id,omitempty"`
	ProjectID       string                    `json:"project_id,omitempty"`
	WorkflowID      string                    `json:"workflow_id,omitempty"`
	SubscriberID    string                    `json:"subscriber_id,omitempty"`
	Title           string                    `json:"title"`
	Message         string                    `json:"message"`
	Channels        []string                  `json:"channels,omitempty"`
	ChannelContent  map[string]ChannelContent `json:"channel_content,omitempty"`
	SkippedChannels []SkippedChannel          `json:"skipped_channels,omitempty"`
	IsTest          bool                      `json:"is_test,omitempty"`
	IsSystemUser    bool                      `json:"is_system_user,omitempty"`
	Recipient       Recipient                 `json:"recipient"`
	Metadata        map[string]string         `json:"metadata,omitempty"`
	To              *SubscriberTo             `json:"to,omitempty"`
}

func (j NotificationJob) ContentForChannel(channel string) ChannelContent {
	if j.ChannelContent != nil {
		if content, ok := j.ChannelContent[channel]; ok {
			return content
		}
	}

	return ChannelContent{
		Title:   j.Title,
		Message: j.Message,
	}
}
