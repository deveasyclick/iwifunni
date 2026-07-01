package channels

import (
	"bytes"
	"context"
	"encoding/base64"
	"fmt"
	"mime/multipart"
	"mime/quotedprintable"
	"net/smtp"
	"strings"

	"github.com/deveasyclick/iwifunni/pkg/logger"
)

type EmailConfig struct {
	Host     string `json:"host"`
	Port     int    `json:"port"`
	Username string `json:"username"`
	Password string `json:"password"`
	From     string `json:"from"`
}

type mailer struct {
	Host     string
	Port     int
	Username string
	Password string
	From     string
}

func newMailer(host string, port int, username, password, from string) *mailer {
	return &mailer{
		Host:     host,
		Port:     port,
		Username: username,
		Password: password,
		From:     from,
	}
}

func (m *mailer) send(to, subject, body string) error {
	addr := fmt.Sprintf("%s:%d", m.Host, m.Port)
	auth := smtp.PlainAuth("", m.Username, m.Password, m.Host)

	msg := []byte(fmt.Sprintf(
		"From: %s\r\nTo: %s\r\nSubject: %s\r\n\r\n%s",
		m.From, to, subject, body,
	))

	return smtp.SendMail(addr, auth, m.From, []string{to}, msg)
}

func (m *mailer) sendWithAttachment(to, subject, body, filename string, pdfBytes []byte) error {
	addr := fmt.Sprintf("%s:%d", m.Host, m.Port)
	auth := smtp.PlainAuth("", m.Username, m.Password, m.Host)

	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)
	boundary := writer.Boundary()

	headers := fmt.Sprintf(
		"From: %s\r\nTo: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary=%s\r\n\r\n",
		m.From, to, subject, boundary,
	)
	buf.WriteString(headers)

	bodyPart, _ := writer.CreatePart(map[string][]string{
		"Content-Type": {"text/plain; charset=utf-8"},
	})
	qp := quotedprintable.NewWriter(bodyPart)
	_, err := qp.Write([]byte(body))
	if err != nil {
		return err
	}
	qp.Close()

	attachmentHeader := map[string][]string{
		"Content-Type":              {"application/pdf"},
		"Content-Transfer-Encoding": {"base64"},
		"Content-Disposition":       {fmt.Sprintf(`attachment; filename="%s"`, filename)},
	}
	attachmentPart, _ := writer.CreatePart(attachmentHeader)

	encoded := make([]byte, base64.StdEncoding.EncodedLen(len(pdfBytes)))
	base64.StdEncoding.Encode(encoded, pdfBytes)
	_, err = attachmentPart.Write(encoded)
	if err != nil {
		return err
	}

	writer.Close()

	return smtp.SendMail(addr, auth, m.From, []string{to}, buf.Bytes())
}

func SendEmail(ctx context.Context, cfg EmailConfig, recipient, title, message string, metadata map[string]string) error {
	_ = ctx
	logger.Get().Info("sending email", "recipient", recipient, "title", title)
	if recipient == "" {
		return fmt.Errorf("email recipient is required")
	}
	if cfg.Host == "" || cfg.Port == 0 || cfg.Username == "" || cfg.Password == "" || cfg.From == "" {
		return fmt.Errorf("email channel config is incomplete")
	}

	body := message
	if len(metadata) > 0 {
		var builder strings.Builder
		builder.WriteString(message)
		builder.WriteString("\n\nMetadata:\n")
		for key, value := range metadata {
			builder.WriteString(key)
			builder.WriteString(": ")
			builder.WriteString(value)
			builder.WriteString("\n")
		}
		body = builder.String()
	}

	m := newMailer(cfg.Host, cfg.Port, cfg.Username, cfg.Password, cfg.From)
	return m.send(recipient, title, body)
}
