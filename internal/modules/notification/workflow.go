package notification

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/deveasyclick/iwifunni/internal/db/gen"
	"github.com/deveasyclick/iwifunni/internal/modules/templates"
	"github.com/deveasyclick/iwifunni/internal/types"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

func (s *Service) prepareWorkflowDelivery(ctx context.Context, projectID uuid.UUID, workflowRecord db.Workflow, subscriberRecord db.Subscriber, prepared types.NotificationJob) ([]string, map[string]types.ChannelContent, []types.SkippedChannel, types.Recipient, error) {
	templateIDs, err := parseWorkflowTemplateIDs(workflowRecord.TemplateIds)
	if err != nil {
		return nil, nil, nil, types.Recipient{}, invalidSend("workflow template mapping is invalid")
	}

	channelStatus := parseSubscriberChannelStatus(subscriberRecord.Status)
	renderVars := buildWorkflowRenderVariables(prepared.Metadata, subscriberRecord)
	recipient := types.Recipient{Reference: subscriberRecord.ID.String()}
	deliverableChannels := make([]string, 0, len(workflowRecord.Channels))
	channelContent := make(map[string]types.ChannelContent, len(workflowRecord.Channels))
	skippedChannels := make([]types.SkippedChannel, 0)

	for _, channel := range workflowRecord.Channels {
		if reason, skip := skipReasonForSubscriberChannel(channel, channelStatus); skip {
			skippedChannels = append(skippedChannels, types.SkippedChannel{Channel: channel, Reason: reason})
			continue
		}

		templateIDValue, ok := templateIDs[channel]
		if !ok || strings.TrimSpace(templateIDValue) == "" {
			skippedChannels = append(skippedChannels, types.SkippedChannel{Channel: channel, Reason: "workflow channel has no linked template"})
			continue
		}

		templateID, err := uuid.Parse(strings.TrimSpace(templateIDValue))
		if err != nil {
			return nil, nil, nil, types.Recipient{}, invalidSend("workflow template mapping contains an invalid template id")
		}

		templateRecord, err := s.templates.GetTemplateByID(ctx, templateID, projectID)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				skippedChannels = append(skippedChannels, types.SkippedChannel{Channel: channel, Reason: "linked template not found"})
				continue
			}
			return nil, nil, nil, types.Recipient{}, err
		}
		if !templateRecord.IsActive {
			skippedChannels = append(skippedChannels, types.SkippedChannel{Channel: channel, Reason: "linked template is inactive"})
			continue
		}
		if templateRecord.Channel != channel {
			skippedChannels = append(skippedChannels, types.SkippedChannel{Channel: channel, Reason: "linked template channel mismatch"})
			continue
		}

		if reason, skip := appendRecipientChannel(&recipient, subscriberRecord, channel); skip {
			skippedChannels = append(skippedChannels, types.SkippedChannel{Channel: channel, Reason: reason})
			continue
		}

		renderedContent, err := renderWorkflowChannelContent(templateRecord, workflowRecord.Name, renderVars)
		if err != nil {
			return nil, nil, nil, types.Recipient{}, invalidSend(fmt.Sprintf("failed to render %s template: %v", channel, err))
		}

		deliverableChannels = append(deliverableChannels, channel)
		channelContent[channel] = renderedContent
	}

	return deliverableChannels, channelContent, skippedChannels, recipient, nil
}

func parseWorkflowTemplateIDs(raw []byte) (map[string]string, error) {
	if len(raw) == 0 {
		return map[string]string{}, nil
	}
	result := make(map[string]string)
	if err := json.Unmarshal(raw, &result); err != nil {
		return nil, err
	}
	return result, nil
}

func parseSubscriberChannelStatus(raw []byte) subscriberChannelStatus {
	status := subscriberChannelStatus{}
	if len(raw) > 0 {
		_ = json.Unmarshal(raw, &status)
	}
	return status
}

func skipReasonForSubscriberChannel(channel string, status subscriberChannelStatus) (string, bool) {
	var value string
	switch channel {
	case "email":
		value = strings.TrimSpace(status.Email)
	case "sms":
		value = strings.TrimSpace(status.SMS)
	case "push":
		value = strings.TrimSpace(status.Push)
	}
	switch value {
	case "unsubscribed":
		return "subscriber is unsubscribed for this channel", true
	case "bounced":
		return "subscriber is bounced for this channel", true
	default:
		return "", false
	}
}

func appendRecipientChannel(recipient *types.Recipient, subscriber db.Subscriber, channel string) (string, bool) {
	switch channel {
	case "email":
		if subscriber.Email == nil || strings.TrimSpace(*subscriber.Email) == "" {
			return "subscriber has no email target", true
		}
		recipient.Email = strings.TrimSpace(*subscriber.Email)
	case "sms":
		if subscriber.Phone == nil || strings.TrimSpace(*subscriber.Phone) == "" {
			return "subscriber has no phone target", true
		}
		recipient.PhoneNumber = strings.TrimSpace(*subscriber.Phone)
	case "push":
		if subscriber.PushToken == nil || strings.TrimSpace(*subscriber.PushToken) == "" {
			return "subscriber has no push target", true
		}
		recipient.PushTokens = []string{strings.TrimSpace(*subscriber.PushToken)}
	}
	return "", false
}

func buildWorkflowRenderVariables(metadata map[string]string, subscriber db.Subscriber) map[string]any {
	variables := make(map[string]any, len(metadata)+8)
	for key, value := range metadata {
		variables[key] = value
	}
	variables["metadata"] = metadata
	variables["subscriber_id"] = subscriber.ID.String()
	variables["name"] = subscriber.Name
	variables["tags"] = subscriber.Tags
	variables["reference"] = subscriber.ID.String()
	if subscriber.Email != nil {
		variables["email"] = strings.TrimSpace(*subscriber.Email)
	}
	if subscriber.Phone != nil {
		variables["phone"] = strings.TrimSpace(*subscriber.Phone)
	}
	if subscriber.PushToken != nil {
		variables["push_token"] = strings.TrimSpace(*subscriber.PushToken)
	}
	return variables
}

func renderWorkflowChannelContent(templateRecord db.Template, fallbackTitle string, variables map[string]any) (types.ChannelContent, error) {
	subject := ""
	if templateRecord.Subject != nil {
		subject = *templateRecord.Subject
	}
	rendered, err := templates.Render(subject, templateRecord.Body, variables)
	if err != nil {
		return types.ChannelContent{}, err
	}
	title := strings.TrimSpace(rendered.Subject)
	if title == "" {
		title = fallbackTitle
	}
	return types.ChannelContent{Title: title, Message: rendered.Body}, nil
}

func enrichMetadata(metadata map[string]string, workflow db.Workflow, subscriber db.Subscriber) map[string]string {
	result := make(map[string]string, len(metadata)+3)
	for key, value := range metadata {
		result[key] = value
	}
	result["workflow_id"] = workflow.ID.String()
	result["workflow_key"] = workflow.Key
	result["subscriber_id"] = subscriber.ID.String()
	return result
}

func finalNotificationStatus(successCount, failureCount, skippedCount int) string {
	switch {
	case successCount == 0 && failureCount == 0 && skippedCount > 0:
		return "skipped"
	case successCount > 0 && failureCount == 0 && skippedCount > 0:
		return "partial_skipped"
	case successCount > 0 && failureCount == 0:
		return "sent"
	case successCount > 0:
		return "partial_failed"
	default:
		return "failed"
	}
}

func isTerminalNotificationStatus(status string) bool {
	switch status {
	case "sent", "failed", "partial_failed", "partial_skipped", "skipped":
		return true
	default:
		return false
	}
}
