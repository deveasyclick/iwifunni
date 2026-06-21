package fcm

import (
	"encoding/json"

	"github.com/deveasyclick/iwifunni/internal/providers/catalog"
)

// NewDefinition returns a catalog definition for the FCM push provider.
func NewDefinition() catalog.Definition {
	return catalog.NewFuncDefinition("fcm", "push", func(credentials, config map[string]any, current *catalog.StoredInput) (catalog.NormalizedInput, error) {
		credentialsJSON, err := catalog.NormalizeStringMapCredentials(credentials, current, "a valid fcm server_key is required", "server_key")
		if err != nil {
			return catalog.NormalizedInput{}, err
		}
		configJSON, err := json.Marshal(map[string]string{"provider": "fcm"})
		if err != nil {
			return catalog.NormalizedInput{}, err
		}
		return catalog.NormalizedInput{
			Name:            "fcm",
			Channel:         "push",
			CredentialsJSON: credentialsJSON,
			ConfigJSON:      configJSON,
		}, nil
	})
}
