package channels

import (
	"context"
	"fmt"

	"github.com/deveasyclick/iwifunni/pkg/logger"
)

type SMSConfig struct {
	Provider string `json:"provider"`
	APIKey   string `json:"api_key"`
	SenderID string `json:"sender_id"`
}

func SendSMS(ctx context.Context, smsConfig SMSConfig, phoneNumber, title, message string, metadata map[string]string) error {
	_ = ctx
	_ = metadata
	logger.Get().Info().Str("recipient", phoneNumber).Str("title", title).Msg("sending SMS")
	if phoneNumber == "" {
		return fmt.Errorf("sms recipient is required")
	}
	if smsConfig.APIKey == "" {
		return fmt.Errorf("missing sms api key")
	}
	if smsConfig.Provider == "" {
		return fmt.Errorf("missing sms provider")
	}
	if smsConfig.SenderID == "" {
		return fmt.Errorf("missing sms sender id")
	}
	return nil
}
