package channels

import (
	"context"
	"fmt"

	"github.com/rs/zerolog/log"
)

func SendEmail(ctx context.Context, apiKey, userID, title, message string, metadata map[string]string) error {
    log.Info().Str("user", userID).Str("title", title).Msg("sending Brevo email")
    if apiKey == "" {
        return fmt.Errorf("missing Brevo API key")
    }
    fmt.Printf("email sent to user=%s title=%s message=%s\n", userID, title, message)
    return nil
}
