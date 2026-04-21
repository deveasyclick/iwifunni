package channels

import (
	"context"
	"fmt"
	"strings"

	"github.com/deveasyclick/iwifunni/pkg/logger"
	"github.com/deveasyclick/iwifunni/pkg/mailer"
)

func SendEmail(ctx context.Context, emailMailer *mailer.Mailer, recipient, title, message string, metadata map[string]string) error {
	_ = ctx
	logger.Get().Info().Str("recipient", recipient).Str("title", title).Msg("sending email")
	if emailMailer == nil {
		return fmt.Errorf("mailer is not configured")
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

	return emailMailer.Send(recipient, title, body)
}
