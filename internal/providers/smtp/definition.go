package smtp

import (
	"encoding/json"
	"net/mail"

	"github.com/deveasyclick/iwifunni/internal/providers/catalog"
)

// NewDefinition returns a catalog definition for the SMTP email provider.
func NewDefinition() catalog.Definition {
	return catalog.NewFuncDefinition("smtp", "email", func(credentials, config map[string]any, current *catalog.StoredInput) (catalog.NormalizedInput, error) {
		credentialsJSON, err := normalizeSMTPAuth(credentials, current)
		if err != nil {
			return catalog.NormalizedInput{}, err
		}
		configJSON, err := normalizeSMTPConfig(config, current)
		if err != nil {
			return catalog.NormalizedInput{}, err
		}
		return catalog.NormalizedInput{
			Name:            "smtp",
			Channel:         "email",
			CredentialsJSON: credentialsJSON,
			ConfigJSON:      configJSON,
		}, nil
	})
}

func normalizeSMTPAuth(credentials map[string]any, current *catalog.StoredInput) ([]byte, error) {
	return catalog.NormalizeStringMapCredentials(credentials, current, "valid smtp username and password are required", "username", "password")
}

func normalizeSMTPConfig(config map[string]any, current *catalog.StoredInput) ([]byte, error) {
	if len(config) == 0 {
		if current != nil && len(current.Config) > 0 {
			return catalog.ValidateStoredConfig(current.Config, "host", "port", "from")
		}
		return nil, catalog.NewValidationError("valid smtp host, port, and from_email are required")
	}
	host, err := catalog.RequiredString(config, "host")
	if err != nil {
		return nil, catalog.NewValidationError("valid smtp host, port, and from_email are required")
	}
	port, err := catalog.RequiredInt(config["port"])
	if err != nil || port <= 0 {
		return nil, catalog.NewValidationError("valid smtp host, port, and from_email are required")
	}
	fromEmail, err := catalog.RequiredString(config, "from_email")
	if err != nil {
		return nil, catalog.NewValidationError("valid smtp host, port, and from_email are required")
	}
	if _, parseErr := mail.ParseAddress(fromEmail); parseErr != nil {
		return nil, catalog.NewValidationError("valid smtp host, port, and from_email are required")
	}
	configJSON, marshalErr := json.Marshal(map[string]any{
		"host": host,
		"port": port,
		"from": fromEmail,
	})
	if marshalErr != nil {
		return nil, marshalErr
	}
	return configJSON, nil
}
