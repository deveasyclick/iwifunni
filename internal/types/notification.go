package types

type ChannelContent struct {
	Title   string `json:"title"`
	Message string `json:"message"`
}

type SkippedChannel struct {
	Channel string `json:"channel"`
	Reason  string `json:"reason"`
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
	Recipient       Recipient                 `json:"recipient"`
	Metadata        map[string]string         `json:"metadata,omitempty"`
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
