package provider

import (
	"encoding/json"
	"errors"
	"testing"

	"github.com/deveasyclick/iwifunni/internal/db"
	"github.com/deveasyclick/iwifunni/internal/providers/defaults"
)

func TestPrepareProviderInputRejectsUnsupportedProvider(t *testing.T) {
	t.Parallel()

	service := &Service{catalog: defaults.NewCatalog()}

	_, _, _, _, err := service.prepareProviderInput(
		"twilio",
		"sms",
		map[string]any{"api_key": "token"},
		map[string]any{"from_email": "no-reply@example.com"},
		nil,
	)
	if !errors.Is(err, ErrUnsupportedProvider) {
		t.Fatalf("prepareProviderInput() error = %v, want %v", err, ErrUnsupportedProvider)
	}
}

func TestPrepareProviderInputNormalizesSendGridValues(t *testing.T) {
	t.Parallel()

	service := &Service{catalog: defaults.NewCatalog()}

	name, channel, credentialsJSON, configJSON, err := service.prepareProviderInput(
		" SendGrid ",
		" EMAIL ",
		map[string]any{"api_key": " SG.test "},
		map[string]any{"from_email": " no-reply@example.com "},
		nil,
	)
	if err != nil {
		t.Fatalf("prepareProviderInput() error = %v", err)
	}
	if name != "sendgrid" {
		t.Fatalf("name = %q, want sendgrid", name)
	}
	if channel != "email" {
		t.Fatalf("channel = %q, want email", channel)
	}

	var credentials map[string]string
	if err := json.Unmarshal(credentialsJSON, &credentials); err != nil {
		t.Fatalf("Unmarshal(credentialsJSON) error = %v", err)
	}
	if credentials["api_key"] != "SG.test" {
		t.Fatalf("credentials.api_key = %q, want SG.test", credentials["api_key"])
	}

	var config map[string]string
	if err := json.Unmarshal(configJSON, &config); err != nil {
		t.Fatalf("Unmarshal(configJSON) error = %v", err)
	}
	if config["from_email"] != "no-reply@example.com" {
		t.Fatalf("config.from_email = %q, want no-reply@example.com", config["from_email"])
	}
}

func TestPrepareProviderInputReusesStoredCredentialsOnUpdate(t *testing.T) {
	t.Parallel()

	service := &Service{catalog: defaults.NewCatalog()}
	current := &db.Provider{
		Credentials: []byte(`"encrypted"`),
		Config:      []byte(`{"from_email":"no-reply@example.com"}`),
	}

	_, _, credentialsJSON, configJSON, err := service.prepareProviderInput(
		"sendgrid",
		"email",
		nil,
		nil,
		current,
	)
	if err != nil {
		t.Fatalf("prepareProviderInput() error = %v", err)
	}
	if credentialsJSON != nil {
		t.Fatalf("credentialsJSON = %q, want nil", credentialsJSON)
	}

	var config map[string]string
	if err := json.Unmarshal(configJSON, &config); err != nil {
		t.Fatalf("Unmarshal(configJSON) error = %v", err)
	}
	if config["from_email"] != "no-reply@example.com" {
		t.Fatalf("config.from_email = %q, want no-reply@example.com", config["from_email"])
	}
}
