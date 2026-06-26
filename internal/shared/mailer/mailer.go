package mailer

import (
	"context"
	"fmt"

	brevo "github.com/getbrevo/brevo-go/lib"
)

type Mailer struct {
	apiKey    string
	fromEmail string
}

func New(apiKey, fromEmail string) *Mailer {
	return &Mailer{apiKey: apiKey, fromEmail: fromEmail}
}

// SendVerification sends the signup verification code email.
func (m *Mailer) SendVerificationCode(ctx context.Context, to, code string) error {
	if m.apiKey == "" || m.fromEmail == "" {
		return nil
	}

	apiCfg := brevo.NewConfiguration()
	apiCfg.AddDefaultHeader("api-key", m.apiKey)
	client := brevo.NewAPIClient(apiCfg)

	email := brevo.SendSmtpEmail{
		Sender: &brevo.SendSmtpEmailSender{
			Email: m.fromEmail,
		},
		To: []brevo.SendSmtpEmailTo{
			{Email: to},
		},
		Subject: "Verify your email address",
		HtmlContent: fmt.Sprintf(
			`<p>Your verification code is:</p>
<h2 style="letter-spacing:4px;font-size:28px;text-align:center">%s</h2>
<p>This code expires in 15 minutes.</p>
<p>If you didn't request this, you can safely ignore this email.</p>`,
			code,
		),
	}

	_, _, err := client.TransactionalEmailsApi.SendTransacEmail(ctx, email)
	return err
}
