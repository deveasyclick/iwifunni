package brevo

import (
	"encoding/json"
	"net/mail"

	"github.com/deveasyclick/iwifunni/internal/providers/catalog"
)

// NewEmailDefinition returns a catalog definition for the Brevo email provider.
func NewEmailDefinition() catalog.Definition {
	return catalog.NewFuncDefinition("brevo", "email", func(credentials, config map[string]any, current *catalog.StoredInput) (catalog.NormalizedInput, error) {
		credentialsJSON, err := normalizeBrevoCredentials(credentials, current)
		if err != nil {
			return catalog.NormalizedInput{}, err
		}
		configJSON, err := normalizeBrevoEmailConfig(config, current)
		if err != nil {
			return catalog.NormalizedInput{}, err
		}
		return catalog.NormalizedInput{
			Name:            "brevo",
			Channel:         "email",
			CredentialsJSON: credentialsJSON,
			ConfigJSON:      configJSON,
		}, nil
	})
}

// NewSMSDefinition returns a catalog definition for the Brevo SMS provider.
func NewSMSDefinition() catalog.Definition {
	return catalog.NewFuncDefinition("brevo-sms", "sms", func(credentials, config map[string]any, current *catalog.StoredInput) (catalog.NormalizedInput, error) {
		credentialsJSON, err := normalizeBrevoCredentials(credentials, current)
		if err != nil {
			return catalog.NormalizedInput{}, err
		}
		senderID, err := catalog.RequiredString(config, "sender_id")
		if err != nil {
			if current != nil && len(current.Config) > 0 {
				if valid, parseErr := catalog.ValidateStoredConfig(current.Config, "sender_id"); parseErr == nil {
					return catalog.NormalizedInput{
						Name:            "brevo-sms",
						Channel:         "sms",
						CredentialsJSON: credentialsJSON,
						ConfigJSON:      valid,
					}, nil
				}
			}
			return catalog.NormalizedInput{}, catalog.NewValidationError("a valid brevo sms sender_id is required")
		}
		configJSON, marshalErr := json.Marshal(map[string]string{
			"provider":  "brevo-sms",
			"sender_id": senderID,
		})
		if marshalErr != nil {
			return catalog.NormalizedInput{}, marshalErr
		}
		return catalog.NormalizedInput{
			Name:            "brevo-sms",
			Channel:         "sms",
			CredentialsJSON: credentialsJSON,
			ConfigJSON:      configJSON,
		}, nil
	})
}

func normalizeBrevoCredentials(credentials map[string]any, current *catalog.StoredInput) ([]byte, error) {
	if len(credentials) == 0 {
		if current != nil && len(current.Credentials) > 0 {
			if valid, err := catalog.ValidateStoredConfig(current.Credentials, "api_key"); err == nil {
				return valid, nil
			}
		}
		return nil, catalog.NewValidationError("a valid brevo api_key is required")
	}

	apiKey, err := catalog.RequiredString(credentials, "api_key")
	if err != nil {
		return nil, catalog.NewValidationError("a valid brevo api_key is required")
	}
	credentialsJSON, marshalErr := json.Marshal(map[string]string{
		"api_key": apiKey,
	})
	if marshalErr != nil {
		return nil, marshalErr
	}
	return credentialsJSON, nil
}

func normalizeBrevoEmailConfig(config map[string]any, current *catalog.StoredInput) ([]byte, error) {
	fromEmail, err := catalog.RequiredString(config, "from_email")
	if err != nil {
		if current != nil && len(current.Config) > 0 {
			return catalog.ValidateStoredConfig(current.Config, "from_email")
		}
		return nil, catalog.NewValidationError("a valid brevo from_email is required")
	}
	if _, parseErr := mail.ParseAddress(fromEmail); parseErr != nil {
		return nil, catalog.NewValidationError("a valid brevo from_email is required")
	}
	configJSON, marshalErr := json.Marshal(map[string]any{
		"from_email": fromEmail,
	})
	if marshalErr != nil {
		return nil, marshalErr
	}
	return configJSON, nil
}
