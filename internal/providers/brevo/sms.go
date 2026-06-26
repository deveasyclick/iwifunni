package brevo

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"

	brevo "github.com/getbrevo/brevo-go/lib"

	"github.com/deveasyclick/iwifunni/internal/providers/catalog"
	"github.com/deveasyclick/iwifunni/internal/types"
	"github.com/deveasyclick/iwifunni/pkg/logger"
)

type SMSRuntimeProvider struct{}

func NewSMSRuntimeProvider() SMSRuntimeProvider { return SMSRuntimeProvider{} }

func (SMSRuntimeProvider) Name() string    { return "brevo-sms" }
func (SMSRuntimeProvider) Channel() string { return "sms" }

type brevoSMSConfig struct {
	APIKey   string `json:"api_key"`
	SenderID string `json:"sender_id"`
}

func (SMSRuntimeProvider) Send(ctx context.Context, job *types.NotificationJob, configJSON []byte) ([]catalog.DeliveryAttempt, error) {
	content := job.ContentForChannel("sms")

	var cfg brevoSMSConfig
	if err := json.Unmarshal(configJSON, &cfg); err != nil {
		return []catalog.DeliveryAttempt{{Destination: job.Recipient.PhoneNumber, Err: fmt.Errorf("invalid brevo sms config: %w", err)}}, err
	}

	if cfg.APIKey == "" {
		return []catalog.DeliveryAttempt{{Destination: job.Recipient.PhoneNumber, Err: fmt.Errorf("brevo sms api_key is required")}}, fmt.Errorf("brevo sms api_key is required")
	}
	if cfg.SenderID == "" {
		return []catalog.DeliveryAttempt{{Destination: job.Recipient.PhoneNumber, Err: fmt.Errorf("brevo sms sender_id is required")}}, fmt.Errorf("brevo sms sender_id is required")
	}
	if job.Recipient.PhoneNumber == "" {
		return []catalog.DeliveryAttempt{{Destination: job.Recipient.PhoneNumber, Err: fmt.Errorf("recipient phone number is required")}}, fmt.Errorf("recipient phone number is required")
	}

	apiCfg := brevo.NewConfiguration()
	apiCfg.AddDefaultHeader("api-key", cfg.APIKey)
	client := brevo.NewAPIClient(apiCfg)

	sms := brevo.SendTransacSms{
		Sender:    cfg.SenderID,
		Recipient: job.Recipient.PhoneNumber,
		Content:   content.Message,
	}

	smsRes, res, err := client.TransactionalSMSApi.SendTransacSms(ctx, sms)
	if err != nil {
		userErr := fmt.Errorf("brevo: %s", brevoErrorMessage(err))
		logger.Get().Error("brevo sms send failed",
			"error", err,
			"http_status", statusCode(res),
			"response_body", brevoResponseBody(err),
			"recipient", job.Recipient.PhoneNumber,
			"sender", cfg.SenderID,
			"content_length", len(content.Message),
		)
		return []catalog.DeliveryAttempt{{Destination: job.Recipient.PhoneNumber, Err: userErr}}, userErr
	}

	logger.Get().Info("brevo sms sent successfully",
		"http_status", statusCode(res),
		"message_id", fmt.Sprintf("%d", smsRes.MessageId),
		"reference", smsRes.Reference,
		"sms_count", smsRes.SmsCount,
		"recipient", job.Recipient.PhoneNumber,
	)

	return []catalog.DeliveryAttempt{{Destination: job.Recipient.PhoneNumber}}, nil
}

func statusCode(res *http.Response) int {
	if res == nil {
		return 0
	}
	return res.StatusCode
}

func brevoResponseBody(err error) string {
	swaggerErr, ok := errors.AsType[brevo.GenericSwaggerError](err)
	if !ok {
		return ""
	}
	return string(swaggerErr.Body())
}

func brevoErrorMessage(err error) string {
	swaggerErr, ok := errors.AsType[brevo.GenericSwaggerError](err)
	if !ok {
		return err.Error()
	}
	errModel, ok := swaggerErr.Model().(brevo.ErrorModel)
	if ok && errModel.Message != "" {
		return errModel.Message
	}
	return err.Error()
}
