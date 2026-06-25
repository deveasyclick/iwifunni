package provider

import (
	"encoding/json"
	"errors"
	"testing"

	"github.com/deveasyclick/iwifunni/internal/db"
	"github.com/deveasyclick/iwifunni/internal/providers"
)

func TestPrepareProviderInputRejectsUnsupportedProvider(t *testing.T) {
	t.Parallel()

	service := &Service{catalog: providers.NewCatalog()}

	_, _, _, _, err := service.prepareProviderInput(
		"ses",
		"email",
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

	service := &Service{catalog: providers.NewCatalog()}

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

	service := &Service{catalog: providers.NewCatalog()}
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

func TestPrepareProviderInputNormalizesBrevoValues(t *testing.T) {
	t.Parallel()

	service := &Service{catalog: providers.NewCatalog()}

	name, channel, credentialsJSON, configJSON, err := service.prepareProviderInput(
		" Brevo ",
		" EMAIL ",
		map[string]any{"login": " user@example.com ", "api_key": " xkeysib-123 "},
		map[string]any{"from_email": " notify@example.com "},
		nil,
	)
	if err != nil {
		t.Fatalf("prepareProviderInput() error = %v", err)
	}
	if name != "brevo" {
		t.Fatalf("name = %q, want brevo", name)
	}
	if channel != "email" {
		t.Fatalf("channel = %q, want email", channel)
	}

	var credentials map[string]string
	if err := json.Unmarshal(credentialsJSON, &credentials); err != nil {
		t.Fatalf("Unmarshal(credentialsJSON) error = %v", err)
	}
	if credentials["username"] != "user@example.com" {
		t.Fatalf("credentials.username = %q, want user@example.com", credentials["username"])
	}
	if credentials["password"] != "xkeysib-123" {
		t.Fatalf("credentials.password = %q, want xkeysib-123", credentials["password"])
	}

	var config map[string]any
	if err := json.Unmarshal(configJSON, &config); err != nil {
		t.Fatalf("Unmarshal(configJSON) error = %v", err)
	}
	if config["host"] != "smtp-relay.brevo.com" {
		t.Fatalf("config.host = %v, want smtp-relay.brevo.com", config["host"])
	}
	if config["from"] != "notify@example.com" {
		t.Fatalf("config.from = %v, want notify@example.com", config["from"])
	}
}
