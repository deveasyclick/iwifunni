package demo

import (
	"encoding/json"
	"net/mail"
	"strings"

	"github.com/deveasyclick/iwifunni/internal/providers/catalog"
)

// NewEmailDefinition returns a catalog definition for the demo email provider.
// No credentials are required — only the owner's email address is stored in config.
// Brevo API credentials can be injected by the handler for actual delivery.
func NewEmailDefinition() catalog.Definition {
	return catalog.NewFuncDefinition("demo-email", "email", func(credentials, config map[string]any, current *catalog.StoredInput) (catalog.NormalizedInput, error) {
		ownerEmail, err := catalog.RequiredString(config, "owner_email")
		if err != nil {
			if current != nil && len(current.Config) > 0 {
				// Merge any new config values (e.g. Brevo credentials injected by handler)
				// into the existing stored config.
				if len(config) > 0 {
					var merged map[string]any
					if unmarshalErr := json.Unmarshal(current.Config, &merged); unmarshalErr == nil {
						for k, v := range config {
							if s, ok := v.(string); ok && s != "" {
								merged[k] = s
							}
						}
						mergedJSON, marshalErr := json.Marshal(merged)
						if marshalErr == nil {
							return catalog.NormalizedInput{
								Name:       "demo-email",
								Channel:    "email",
								ConfigJSON: mergedJSON,
							}, nil
						}
					}
				}
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

		// Build JSON, preserving any Brevo credentials injected by the handler
		cfgMap := map[string]string{
			"owner_email": ownerEmail,
			"sender_name": strings.TrimSpace(senderName),
		}

		// Pass through Brevo credentials if the handler injected them
		if brevoKey, ok := config["brevo_api_key"]; ok {
			if s, ok := brevoKey.(string); ok && s != "" {
				cfgMap["brevo_api_key"] = s
			}
		}
		if brevoFrom, ok := config["brevo_from_email"]; ok {
			if s, ok := brevoFrom.(string); ok && s != "" {
				cfgMap["brevo_from_email"] = s
			}
		}

		configJSON, err := json.Marshal(cfgMap)
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
