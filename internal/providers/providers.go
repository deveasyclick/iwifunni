package providers

import (
	"github.com/deveasyclick/iwifunni/internal/providers/brevo"
	"github.com/deveasyclick/iwifunni/internal/providers/catalog"
	"github.com/deveasyclick/iwifunni/internal/providers/demo"
	"github.com/deveasyclick/iwifunni/internal/providers/fcm"
	"github.com/deveasyclick/iwifunni/internal/providers/sendgrid"
	"github.com/deveasyclick/iwifunni/internal/providers/smtp"
	"github.com/deveasyclick/iwifunni/internal/providers/twilio"
	"github.com/deveasyclick/iwifunni/internal/providers/webpush"
)

// NewCatalog returns a Catalog containing all built-in provider definitions.
func NewCatalog() *catalog.Catalog {
	return catalog.New(
		sendgrid.NewDefinition(),
		brevo.NewEmailDefinition(),
		brevo.NewSMSDefinition(),
		smtp.NewDefinition(),
		catalog.NewSMSDefinition("termii"),
		twilio.NewDefinition(),
		fcm.NewDefinition(),
		webpush.NewDefinition(),
		demo.NewEmailDefinition(),
		demo.NewSMSDefinition(),
	)
}
