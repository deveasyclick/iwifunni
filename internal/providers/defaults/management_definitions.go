package defaults

import (
	"encoding/json"
	"fmt"
	"math"
	"net/mail"
	"strings"

	"github.com/deveasyclick/iwifunni/internal/providers/catalog"
)

type definition struct {
	name      string
	channel   string
	normalize func(credentials, config map[string]any, current *catalog.StoredInput) (catalog.NormalizedInput, error)
}

func (d definition) Name() string { return d.name }

func (d definition) Channel() string { return d.channel }

func (d definition) Normalize(credentials, config map[string]any, current *catalog.StoredInput) (catalog.NormalizedInput, error) {
	return d.normalize(credentials, config, current)
}

func newBrevoDefinition() catalog.Definition {
	return definition{
		name:    "brevo",
		channel: "email",
		normalize: func(credentials, config map[string]any, current *catalog.StoredInput) (catalog.NormalizedInput, error) {
			login, apiKey, credentialsJSON, err := normalizeBrevoCredentials(credentials, current)
			if err != nil {
				return catalog.NormalizedInput{}, err
			}
			configJSON, err := normalizeBrevoConfig(config, login, apiKey, current)
			if err != nil {
				return catalog.NormalizedInput{}, err
			}
			return catalog.NormalizedInput{
				Name:            "brevo",
				Channel:         "email",
				CredentialsJSON: credentialsJSON,
				ConfigJSON:      configJSON,
			}, nil
		},
	}
}

func newSMTPDefinition() catalog.Definition {
	return definition{
		name:    "smtp",
		channel: "email",
		normalize: func(credentials, config map[string]any, current *catalog.StoredInput) (catalog.NormalizedInput, error) {
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
		},
	}
}

func newTermiiDefinition() catalog.Definition {
	return newSMSDefinition("termii")
}

func newTwilioDefinition() catalog.Definition {
	return definition{
		name:    "twilio",
		channel: "sms",
		normalize: func(credentials, config map[string]any, current *catalog.StoredInput) (catalog.NormalizedInput, error) {
			credentialsJSON, err := normalizeTwilioCredentials(credentials, current)
			if err != nil {
				return catalog.NormalizedInput{}, err
			}
			fromNumber, err := requiredString(config, "from_number")
			if err != nil {
				if current != nil && len(current.Config) > 0 {
					if valid, parseErr := validateStoredConfig(current.Config, []string{"from_number"}); parseErr == nil {
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
		},
	}
}

func newFCMDefinition() catalog.Definition {
	return definition{
		name:    "fcm",
		channel: "push",
		normalize: func(credentials, config map[string]any, current *catalog.StoredInput) (catalog.NormalizedInput, error) {
			credentialsJSON, err := normalizeStringMapCredentials(credentials, current, "a valid fcm server_key is required", "server_key")
			if err != nil {
				return catalog.NormalizedInput{}, err
			}
			configJSON, err := json.Marshal(map[string]string{"provider": "fcm"})
			if err != nil {
				return catalog.NormalizedInput{}, err
			}
			return catalog.NormalizedInput{
				Name:            "fcm",
				Channel:         "push",
				CredentialsJSON: credentialsJSON,
				ConfigJSON:      configJSON,
			}, nil
		},
	}
}

func newWebPushDefinition() catalog.Definition {
	return definition{
		name:    "webpush",
		channel: "push",
		normalize: func(credentials, config map[string]any, current *catalog.StoredInput) (catalog.NormalizedInput, error) {
			credentialsJSON, err := normalizeStringMapCredentials(credentials, current, "valid web push public_key and private_key are required", "public_key", "private_key")
			if err != nil {
				return catalog.NormalizedInput{}, err
			}
			configJSON, err := json.Marshal(map[string]string{"provider": "webpush"})
			if err != nil {
				return catalog.NormalizedInput{}, err
			}
			return catalog.NormalizedInput{
				Name:            "webpush",
				Channel:         "push",
				CredentialsJSON: credentialsJSON,
				ConfigJSON:      configJSON,
			}, nil
		},
	}
}

func newSMSDefinition(name string) catalog.Definition {
	return definition{
		name:    name,
		channel: "sms",
		normalize: func(credentials, config map[string]any, current *catalog.StoredInput) (catalog.NormalizedInput, error) {
			credentialsJSON, err := normalizeStringMapCredentials(credentials, current, fmt.Sprintf("a valid %s api_key is required", name), "api_key")
			if err != nil {
				return catalog.NormalizedInput{}, err
			}
			senderID, err := requiredString(config, "sender_id")
			if err != nil {
				if current != nil && len(current.Config) > 0 {
					if valid, parseErr := validateStoredConfig(current.Config, []string{"provider", "sender_id"}); parseErr == nil {
						return catalog.NormalizedInput{
							Name:            name,
							Channel:         "sms",
							CredentialsJSON: credentialsJSON,
							ConfigJSON:      valid,
						}, nil
					}
				}
				return catalog.NormalizedInput{}, catalog.NewValidationError(fmt.Sprintf("a valid %s sender_id is required", name))
			}
			configJSON, marshalErr := json.Marshal(map[string]string{
				"provider":  name,
				"sender_id": senderID,
			})
			if marshalErr != nil {
				return catalog.NormalizedInput{}, marshalErr
			}
			return catalog.NormalizedInput{
				Name:            name,
				Channel:         "sms",
				CredentialsJSON: credentialsJSON,
				ConfigJSON:      configJSON,
			}, nil
		},
	}
}

func normalizeBrevoCredentials(credentials map[string]any, current *catalog.StoredInput) (string, string, []byte, error) {
	if len(credentials) == 0 {
		if current != nil && len(current.Credentials) > 0 {
			var stored map[string]string
			if err := json.Unmarshal(current.Credentials, &stored); err == nil {
				return stored["username"], stored["password"], nil, nil
			}
			return "", "", nil, catalog.NewValidationError("valid brevo login and api_key are required")
		}
		return "", "", nil, catalog.NewValidationError("valid brevo login and api_key are required")
	}

	login, err := requiredString(credentials, "login")
	if err != nil {
		return "", "", nil, catalog.NewValidationError("valid brevo login and api_key are required")
	}
	apiKey, err := requiredString(credentials, "api_key")
	if err != nil {
		return "", "", nil, catalog.NewValidationError("valid brevo login and api_key are required")
	}
	credentialsJSON, marshalErr := json.Marshal(map[string]string{
		"username": login,
		"password": apiKey,
	})
	if marshalErr != nil {
		return "", "", nil, marshalErr
	}
	return login, apiKey, credentialsJSON, nil
}

func normalizeBrevoConfig(config map[string]any, _, _ string, current *catalog.StoredInput) ([]byte, error) {
	fromEmail, err := requiredString(config, "from_email")
	if err != nil {
		if current != nil && len(current.Config) > 0 {
			return validateStoredConfig(current.Config, []string{"host", "port", "from"})
		}
		return nil, catalog.NewValidationError("a valid brevo from_email is required")
	}
	if _, parseErr := mail.ParseAddress(fromEmail); parseErr != nil {
		return nil, catalog.NewValidationError("a valid brevo from_email is required")
	}
	configJSON, marshalErr := json.Marshal(map[string]any{
		"host": "smtp-relay.brevo.com",
		"port": 587,
		"from": fromEmail,
	})
	if marshalErr != nil {
		return nil, marshalErr
	}
	return configJSON, nil
}

func normalizeSMTPAuth(credentials map[string]any, current *catalog.StoredInput) ([]byte, error) {
	return normalizeStringMapCredentials(credentials, current, "valid smtp username and password are required", "username", "password")
}

func normalizeTwilioCredentials(credentials map[string]any, current *catalog.StoredInput) ([]byte, error) {
	if len(credentials) == 0 {
		if current != nil && len(current.Credentials) > 0 {
			return nil, nil
		}
		return nil, catalog.NewValidationError("valid twilio account_sid and auth_token are required")
	}

	accountSID, err := requiredString(credentials, "account_sid")
	if err != nil {
		return nil, catalog.NewValidationError("valid twilio account_sid and auth_token are required")
	}
	authToken, err := requiredString(credentials, "auth_token")
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

func normalizeSMTPConfig(config map[string]any, current *catalog.StoredInput) ([]byte, error) {
	if len(config) == 0 {
		if current != nil && len(current.Config) > 0 {
			return validateStoredConfig(current.Config, []string{"host", "port", "from"})
		}
		return nil, catalog.NewValidationError("valid smtp host, port, and from_email are required")
	}
	host, err := requiredString(config, "host")
	if err != nil {
		return nil, catalog.NewValidationError("valid smtp host, port, and from_email are required")
	}
	port, err := requiredInt(config["port"])
	if err != nil || port <= 0 {
		return nil, catalog.NewValidationError("valid smtp host, port, and from_email are required")
	}
	fromEmail, err := requiredString(config, "from_email")
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

func normalizeStringMapCredentials(credentials map[string]any, current *catalog.StoredInput, message string, keys ...string) ([]byte, error) {
	if len(credentials) == 0 {
		if current != nil && len(current.Credentials) > 0 {
			return nil, nil
		}
		return nil, catalog.NewValidationError(message)
	}

	values := make(map[string]string, len(keys))
	for _, key := range keys {
		value, err := requiredString(credentials, key)
		if err != nil {
			return nil, catalog.NewValidationError(message)
		}
		values[key] = value
	}

	credentialsJSON, err := json.Marshal(values)
	if err != nil {
		return nil, err
	}
	return credentialsJSON, nil
}

func validateStoredConfig(raw []byte, keys []string) ([]byte, error) {
	if len(raw) == 0 {
		return nil, fmt.Errorf("missing stored config")
	}

	var config map[string]any
	if err := json.Unmarshal(raw, &config); err != nil {
		return nil, err
	}
	for _, key := range keys {
		if _, ok := config[key]; !ok {
			return nil, fmt.Errorf("missing %s", key)
		}
	}
	return raw, nil
}

func requiredString(values map[string]any, key string) (string, error) {
	raw, ok := values[key]
	if !ok {
		return "", fmt.Errorf("missing %s", key)
	}
	value, ok := raw.(string)
	if !ok {
		return "", fmt.Errorf("invalid %s", key)
	}
	value = strings.TrimSpace(value)
	if value == "" {
		return "", fmt.Errorf("invalid %s", key)
	}
	return value, nil
}

func requiredInt(value any) (int, error) {
	switch typed := value.(type) {
	case int:
		return typed, nil
	case int32:
		return int(typed), nil
	case int64:
		return int(typed), nil
	case float64:
		if math.Trunc(typed) != typed {
			return 0, fmt.Errorf("invalid integer")
		}
		return int(typed), nil
	case json.Number:
		number, err := typed.Int64()
		if err != nil {
			return 0, err
		}
		return int(number), nil
	default:
		return 0, fmt.Errorf("invalid integer")
	}
}

// newDemoEmailDefinition returns a catalog definition for the demo email provider.
// No credentials are required — only the owner's email address is stored in config.
func newDemoEmailDefinition() catalog.Definition {
	return definition{
		name:    "demo-email",
		channel: "email",
		normalize: func(credentials, config map[string]any, current *catalog.StoredInput) (catalog.NormalizedInput, error) {
			ownerEmail, err := requiredString(config, "owner_email")
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
		},
	}
}

// newDemoSMSDefinition returns a catalog definition for the demo SMS provider.
// No credentials or config are required — sends are logged and no real message
// is delivered. The recipient's own phone number is used at runtime.
func newDemoSMSDefinition() catalog.Definition {
	return definition{
		name:    "demo-sms",
		channel: "sms",
		normalize: func(_, _ map[string]any, _ *catalog.StoredInput) (catalog.NormalizedInput, error) {
			return catalog.NormalizedInput{
				Name:    "demo-sms",
				Channel: "sms",
			}, nil
		},
	}
}
