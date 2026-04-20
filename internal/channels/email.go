package channels

import (
	"context"
	"fmt"

	"github.com/deveasyclick/iwifunni/pkg/logger"
)

func SendEmail(ctx context.Context, apiKey, userID, title, message string, metadata map[string]string) error {
	logger.Get().Info().Str("user", userID).Str("title", title).Msg("sending Brevo email")
	if apiKey == "" {
		return fmt.Errorf("missing Brevo API key")
	}
	return nil
}
