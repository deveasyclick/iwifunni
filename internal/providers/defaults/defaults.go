package defaults

import (
	"github.com/deveasyclick/iwifunni/internal/providers/brevo"
	"github.com/deveasyclick/iwifunni/internal/providers/catalog"
	"github.com/deveasyclick/iwifunni/internal/providers/fcm"
	"github.com/deveasyclick/iwifunni/internal/providers/sendgrid"
	"github.com/deveasyclick/iwifunni/internal/providers/smtp"
	"github.com/deveasyclick/iwifunni/internal/providers/termii"
	"github.com/deveasyclick/iwifunni/internal/providers/twilio"
	"github.com/deveasyclick/iwifunni/internal/providers/webpush"
)

func NewCatalog() *catalog.Catalog {
	return catalog.New(
		sendgrid.NewDefinition(),
		newBrevoDefinition(),
		newSMTPDefinition(),
		newTermiiDefinition(),
		newTwilioDefinition(),
		newFCMDefinition(),
		newWebPushDefinition(),
	)
}

func NewRegistry() *catalog.Registry {
	return catalog.NewRegistry(
		smtp.NewRuntimeProvider(),
		sendgrid.NewRuntimeProvider(),
		brevo.NewRuntimeProvider(),
		termii.NewRuntimeProvider(),
		twilio.NewRuntimeProvider(),
		fcm.NewRuntimeProvider(),
		webpush.NewRuntimeProvider(),
	)
}
