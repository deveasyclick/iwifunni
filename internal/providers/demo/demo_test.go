package demo_test

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/deveasyclick/iwifunni/internal/providers/demo"
	"github.com/deveasyclick/iwifunni/internal/types"
)

func TestEmailRuntimeProvider_Send_RedirectsToOwner(t *testing.T) {
	p := demo.NewEmailRuntimeProvider()

	if p.Name() != "demo-email" {
		t.Fatalf("Name() = %q, want %q", p.Name(), "demo-email")
	}
	if p.Channel() != "email" {
		t.Fatalf("Channel() = %q, want %q", p.Channel(), "email")
	}

	cfg, _ := json.Marshal(map[string]string{
		"owner_email": "owner@example.com",
		"sender_name": "Owner",
	})

	job := &types.NotificationJob{
		JobID:   "test-job",
		Title:   "Hello",
		Message: "World",
		Recipient: types.Recipient{
			Email: "subscriber@example.com",
		},
	}

	attempts, err := p.Send(context.Background(), job, cfg)
	if err != nil {
		t.Fatalf("Send() error = %v", err)
	}
	if len(attempts) != 1 {
		t.Fatalf("len(attempts) = %d, want 1", len(attempts))
	}
	if attempts[0].Destination != "owner@example.com" {
		t.Errorf("Destination = %q, want %q", attempts[0].Destination, "owner@example.com")
	}
	if attempts[0].Err != nil {
		t.Errorf("attempt.Err = %v, want nil", attempts[0].Err)
	}
}

func TestEmailRuntimeProvider_Send_MissingOwnerEmail(t *testing.T) {
	p := demo.NewEmailRuntimeProvider()
	cfg, _ := json.Marshal(map[string]string{})

	job := &types.NotificationJob{
		JobID:     "test-job",
		Recipient: types.Recipient{Email: "sub@example.com"},
	}

	_, err := p.Send(context.Background(), job, cfg)
	if err == nil {
		t.Fatal("expected error when owner_email is empty, got nil")
	}
}

func TestSMSRuntimeProvider_Send_RedirectsToOwner(t *testing.T) {
	p := demo.NewSMSRuntimeProvider()

	if p.Name() != "demo-sms" {
		t.Fatalf("Name() = %q, want %q", p.Name(), "demo-sms")
	}
	if p.Channel() != "sms" {
		t.Fatalf("Channel() = %q, want %q", p.Channel(), "sms")
	}

	cfg, _ := json.Marshal(map[string]string{
		"owner_phone": "+2348000000000",
	})

	job := &types.NotificationJob{
		JobID:   "test-sms",
		Title:   "Alert",
		Message: "Something happened",
		Recipient: types.Recipient{
			PhoneNumber: "+2341111111111",
		},
	}

	attempts, err := p.Send(context.Background(), job, cfg)
	if err != nil {
		t.Fatalf("Send() error = %v", err)
	}
	if len(attempts) != 1 {
		t.Fatalf("len(attempts) = %d, want 1", len(attempts))
	}
	if attempts[0].Destination != "+2348000000000" {
		t.Errorf("Destination = %q, want %q", attempts[0].Destination, "+2348000000000")
	}
}

func TestSMSRuntimeProvider_Send_MissingOwnerPhone(t *testing.T) {
	p := demo.NewSMSRuntimeProvider()
	cfg, _ := json.Marshal(map[string]string{})

	job := &types.NotificationJob{
		JobID:     "test-sms",
		Recipient: types.Recipient{PhoneNumber: "+2341111111111"},
	}

	_, err := p.Send(context.Background(), job, cfg)
	if err == nil {
		t.Fatal("expected error when owner_phone is empty, got nil")
	}
}
