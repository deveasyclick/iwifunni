package demo

import (
	"encoding/json"
	"net/mail"
	"strings"

	"github.com/deveasyclick/iwifunni/internal/providers/catalog"
)

// NewEmailDefinition returns a catalog definition for the demo email provider.
// No credentials are required — only the owner's email address is stored in config.
func NewEmailDefinition() catalog.Definition {
	return catalog.NewFuncDefinition("demo-email", "email", func(credentials, config map[string]any, current *catalog.StoredInput) (catalog.NormalizedInput, error) {
		ownerEmail, err := catalog.RequiredString(config, "owner_email")
		if err != nil {
			if current != nil && len(current.Config) > 0 {
				return catalog.NormalizedInput{
					Name:       "demo-email",
					Channel:    "email",
					ConfigJSON: current.Config,
				}, nil
			}
			return catalog.NormalizedInput{}, catalog.NewValidationError("demo-email: owner_email is required")
		}
		ownerEmail = strings.TrimSpace(ownerEmail)
		if ownerEmail == "" {
			return catalog.NormalizedInput{}, catalog.NewValidationError("demo-email: owner_email is required")
		}
		if _, err := mail.ParseAddress(ownerEmail); err != nil {
			return catalog.NormalizedInput{}, catalog.NewValidationError("demo-email: a valid owner_email is required")
		}
		senderName, _ := config["sender_name"].(string)

		configJSON, err := json.Marshal(map[string]string{
			"owner_email": ownerEmail,
			"sender_name": strings.TrimSpace(senderName),
		})
		if err != nil {
			return catalog.NormalizedInput{}, err
		}
		return catalog.NormalizedInput{
			Name:       "demo-email",
			Channel:    "email",
			ConfigJSON: configJSON,
		}, nil
	})
}

// NewSMSDefinition returns a catalog definition for the demo SMS provider.
// No credentials or config are required — sends are logged and no real message
// is delivered. The recipient's own phone number is used at runtime.
func NewSMSDefinition() catalog.Definition {
	return catalog.NewFuncDefinition("demo-sms", "sms", func(_, _ map[string]any, _ *catalog.StoredInput) (catalog.NormalizedInput, error) {
		return catalog.NormalizedInput{
			Name:    "demo-sms",
			Channel: "sms",
		}, nil
	})
}
