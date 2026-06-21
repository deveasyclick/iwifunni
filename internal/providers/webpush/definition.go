package webpush

import (
	"encoding/json"

	"github.com/deveasyclick/iwifunni/internal/providers/catalog"
)

// NewDefinition returns a catalog definition for the Web Push provider.
func NewDefinition() catalog.Definition {
	return catalog.NewFuncDefinition("webpush", "push", func(credentials, config map[string]any, current *catalog.StoredInput) (catalog.NormalizedInput, error) {
		credentialsJSON, err := catalog.NormalizeStringMapCredentials(credentials, current, "valid web push public_key and private_key are required", "public_key", "private_key")
		if err != nil {
			return catalog.NormalizedInput{}, err
		}
		configJSON, err := json.Marshal(map[string]string{"provider": "webpush"})
		if err != nil {
			return catalog.NormalizedInput{}, err
		}
		return catalog.NormalizedInput{
			Name:            "webpush",
			Channel:         "push",
			CredentialsJSON: credentialsJSON,
			ConfigJSON:      configJSON,
		}, nil
	})
}
