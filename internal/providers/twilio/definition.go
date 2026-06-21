package twilio

import (
	"encoding/json"

	"github.com/deveasyclick/iwifunni/internal/providers/catalog"
)

// NewDefinition returns a catalog definition for the Twilio SMS provider.
func NewDefinition() catalog.Definition {
	return catalog.NewFuncDefinition("twilio", "sms", func(credentials, config map[string]any, current *catalog.StoredInput) (catalog.NormalizedInput, error) {
		credentialsJSON, err := normalizeTwilioCredentials(credentials, current)
		if err != nil {
			return catalog.NormalizedInput{}, err
		}
		fromNumber, err := catalog.RequiredString(config, "from_number")
		if err != nil {
			if current != nil && len(current.Config) > 0 {
				if valid, parseErr := catalog.ValidateStoredConfig(current.Config, "from_number"); parseErr == nil {
					return catalog.NormalizedInput{
						Name:            "twilio",
						Channel:         "sms",
						CredentialsJSON: credentialsJSON,
						ConfigJSON:      valid,
					}, nil
				}
			}
			return catalog.NormalizedInput{}, catalog.NewValidationError("a valid twilio from_number is required")
		}
		configJSON, marshalErr := json.Marshal(map[string]string{
			"provider":  "twilio",
			"sender_id": fromNumber,
		})
		if marshalErr != nil {
			return catalog.NormalizedInput{}, marshalErr
		}
		return catalog.NormalizedInput{
			Name:            "twilio",
			Channel:         "sms",
			CredentialsJSON: credentialsJSON,
			ConfigJSON:      configJSON,
		}, nil
	})
}

func normalizeTwilioCredentials(credentials map[string]any, current *catalog.StoredInput) ([]byte, error) {
	if len(credentials) == 0 {
		if current != nil && len(current.Credentials) > 0 {
			return nil, nil
		}
		return nil, catalog.NewValidationError("valid twilio account_sid and auth_token are required")
	}

	accountSID, err := catalog.RequiredString(credentials, "account_sid")
	if err != nil {
		return nil, catalog.NewValidationError("valid twilio account_sid and auth_token are required")
	}
	authToken, err := catalog.RequiredString(credentials, "auth_token")
	if err != nil {
		return nil, catalog.NewValidationError("valid twilio account_sid and auth_token are required")
	}

	credentialsJSON, err := json.Marshal(map[string]string{
		"account_sid": accountSID,
		"api_key":     authToken,
	})
	if err != nil {
		return nil, err
	}
	return credentialsJSON, nil
}
