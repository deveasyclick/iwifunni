package catalog

import (
	"encoding/json"
	"fmt"
	"math"
	"strings"
)

// FuncDefinition implements Definition using function fields.
// It is a convenience for providers that want a closure-based definition.
type FuncDefinition struct {
	name      string
	channel   string
	normalize func(credentials, config map[string]any, current *StoredInput) (NormalizedInput, error)
}

func (d FuncDefinition) Name() string { return d.name }

func (d FuncDefinition) Channel() string { return d.channel }

func (d FuncDefinition) Normalize(credentials, config map[string]any, current *StoredInput) (NormalizedInput, error) {
	return d.normalize(credentials, config, current)
}

// NewFuncDefinition creates a FuncDefinition.
func NewFuncDefinition(name, channel string, normalize func(credentials, config map[string]any, current *StoredInput) (NormalizedInput, error)) FuncDefinition {
	return FuncDefinition{name: name, channel: channel, normalize: normalize}
}

// NewSMSDefinition returns a Definition for a simple SMS provider that
// requires an api_key (credentials) and a sender_id (config).
func NewSMSDefinition(name string) Definition {
	return FuncDefinition{
		name:    name,
		channel: "sms",
		normalize: func(credentials, config map[string]any, current *StoredInput) (NormalizedInput, error) {
			credentialsJSON, err := NormalizeStringMapCredentials(credentials, current, fmt.Sprintf("a valid %s api_key is required", name), "api_key")
			if err != nil {
				return NormalizedInput{}, err
			}
			senderID, err := RequiredString(config, "sender_id")
			if err != nil {
				if current != nil && len(current.Config) > 0 {
					if valid, parseErr := ValidateStoredConfig(current.Config, "provider", "sender_id"); parseErr == nil {
						return NormalizedInput{
							Name:            name,
							Channel:         "sms",
							CredentialsJSON: credentialsJSON,
							ConfigJSON:      valid,
						}, nil
					}
				}
				return NormalizedInput{}, NewValidationError(fmt.Sprintf("a valid %s sender_id is required", name))
			}
			configJSON, marshalErr := json.Marshal(map[string]string{
				"provider":  name,
				"sender_id": senderID,
			})
			if marshalErr != nil {
				return NormalizedInput{}, marshalErr
			}
			return NormalizedInput{
				Name:            name,
				Channel:         "sms",
				CredentialsJSON: credentialsJSON,
				ConfigJSON:      configJSON,
			}, nil
		},
	}
}

// RequiredString extracts and trims a string value from a map.
func RequiredString(values map[string]any, key string) (string, error) {
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

// RequiredInt converts a value to int, accepting int, int32, int64, float64,
// and json.Number types.
func RequiredInt(value any) (int, error) {
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

// ValidateStoredConfig checks that the given raw JSON config contains all
// the specified keys. Returns the raw bytes on success.
func ValidateStoredConfig(raw []byte, keys ...string) ([]byte, error) {
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

// NormalizeStringMapCredentials validates and marshals a set of string
// credential fields from a map. If credentials is empty it falls back to
// the stored credentials.
func NormalizeStringMapCredentials(credentials map[string]any, current *StoredInput, message string, keys ...string) ([]byte, error) {
	if len(credentials) == 0 {
		if current != nil && len(current.Credentials) > 0 {
			return nil, nil
		}
		return nil, NewValidationError(message)
	}

	values := make(map[string]string, len(keys))
	for _, key := range keys {
		value, err := RequiredString(credentials, key)
		if err != nil {
			return nil, NewValidationError(message)
		}
		values[key] = value
	}

	credentialsJSON, err := json.Marshal(values)
	if err != nil {
		return nil, err
	}
	return credentialsJSON, nil
}
