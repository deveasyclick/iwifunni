package mailer

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"mime/multipart"
	"mime/quotedprintable"
	"net/smtp"
)

type Mailer struct {
	Host     string
	Port     int
	Username string
	Password string
	From     string
}

func NewMailer(host string, port int, username, password, from string) *Mailer {
	return &Mailer{
		Host:     host,
		Port:     port,
		Username: username,
		Password: password,
		From:     from,
	}
}

func (m *Mailer) Send(to, subject, body string) error {
	addr := fmt.Sprintf("%s:%d", m.Host, m.Port)
	auth := smtp.PlainAuth("", m.Username, m.Password, m.Host)

	msg := []byte(fmt.Sprintf(
		"From: %s\r\nTo: %s\r\nSubject: %s\r\n\r\n%s",
		m.From, to, subject, body,
	))

	return smtp.SendMail(addr, auth, m.From, []string{to}, msg)
}

func (m *Mailer) SendWithAttachment(to, subject, body, filename string, pdfBytes []byte) error {
	addr := fmt.Sprintf("%s:%d", m.Host, m.Port)
	auth := smtp.PlainAuth("", m.Username, m.Password, m.Host)

	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)
	boundary := writer.Boundary()

	// Email headers
	headers := fmt.Sprintf(
		"From: %s\r\nTo: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary=%s\r\n\r\n",
		m.From, to, subject, boundary,
	)
	buf.WriteString(headers)

	// Body part
	bodyPart, _ := writer.CreatePart(map[string][]string{
		"Content-Type": {"text/plain; charset=utf-8"},
	})
	qp := quotedprintable.NewWriter(bodyPart)
	_, err := qp.Write([]byte(body))
	if err != nil {
		return err
	}
	qp.Close()

	// Attachment part
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
