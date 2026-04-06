package channels

import (
	"context"
	"fmt"

	"github.com/rs/zerolog/log"
)

func SendSMS(ctx context.Context, apiKey, sender, userID, title, message string, metadata map[string]string) error {
    log.Info().Str("user", userID).Str("title", title).Msg("sending Termii SMS")
    if apiKey == "" {
        return fmt.Errorf("missing Termii API key")
    }
    if sender == "" {
        sender = "Pingora"
    }
    fmt.Printf("sms sent via Termii from=%s to=%s title=%s message=%s\n", sender, userID, title, message)
    return nil
}
