package channels

import (
	"context"
	"fmt"
	"strings"

	"github.com/deveasyclick/iwifunni/pkg/logger"
	"github.com/deveasyclick/iwifunni/pkg/mailer"
)

type EmailConfig struct {
	Host     string `json:"host"`
	Port     int    `json:"port"`
	Username string `json:"username"`
	Password string `json:"password"`
	From     string `json:"from"`
}

func SendEmail(ctx context.Context, emailConfig EmailConfig, recipient, title, message string, metadata map[string]string) error {
	_ = ctx
	logger.Get().Info().Str("recipient", recipient).Str("title", title).Msg("sending email")
	if recipient == "" {
		return fmt.Errorf("email recipient is required")
	}
	if emailConfig.Host == "" || emailConfig.Port == 0 || emailConfig.Username == "" || emailConfig.Password == "" || emailConfig.From == "" {
		return fmt.Errorf("email channel config is incomplete")
	}

	body := message
	if len(metadata) > 0 {
		var builder strings.Builder
		builder.WriteString(message)
		builder.WriteString("\n\nMetadata:\n")
		for key, value := range metadata {
			builder.WriteString(key)
			builder.WriteString(": ")
			builder.WriteString(value)
			builder.WriteString("\n")
		}
		body = builder.String()
	}

	emailMailer := mailer.NewMailer(emailConfig.Host, emailConfig.Port, emailConfig.Username, emailConfig.Password, emailConfig.From)
	return emailMailer.Send(recipient, title, body)
}
