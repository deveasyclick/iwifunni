package channels

import (
	"context"
	"fmt"

	"github.com/deveasyclick/iwifunni/pkg/logger"
)

func SendSMS(ctx context.Context, apiKey, sender, userID, title, message string, metadata map[string]string) error {
	logger.Get().Info().Str("user", userID).Str("title", title).Msg("sending Termii SMS")
	if apiKey == "" {
		return fmt.Errorf("missing Termii API key")
	}
	return nil
}
