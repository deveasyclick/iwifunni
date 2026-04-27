package channels

import (
	"context"
	"fmt"
	"time"

	"github.com/deveasyclick/iwifunni/pkg/logger"
)

type PushConfig struct {
	Provider   string `json:"provider"`
	ServerKey  string `json:"server_key"`
	PublicKey  string `json:"public_key"`
	PrivateKey string `json:"private_key"`
}

func SendFCM(ctx context.Context, serverKey, endpoint, title, message string, metadata map[string]string) error {
	logger.Get().Info().Str("endpoint", endpoint).Str("title", title).Str("message", message).Msg("sending FCM push")
	if serverKey == "" {
		return fmt.Errorf("missing FCM server key")
	}
	time.Sleep(100 * time.Millisecond)
	return nil
}

func SendBrowserPush(ctx context.Context, publicKey, privateKey, endpoint, title, message string, metadata map[string]string) error {
	logger.Get().Info().Str("endpoint", endpoint).Str("title", title).Str("message", message).Msg("sending browser push")
	if publicKey == "" || privateKey == "" {
		return fmt.Errorf("missing Web Push keys")
	}
	time.Sleep(100 * time.Millisecond)
	return nil
}
