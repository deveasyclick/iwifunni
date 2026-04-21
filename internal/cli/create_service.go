package cli

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/spf13/cobra"

	"github.com/deveasyclick/iwifunni/internal/auth"
	"github.com/deveasyclick/iwifunni/internal/config"
	"github.com/deveasyclick/iwifunni/internal/db"
	"github.com/deveasyclick/iwifunni/internal/storage"
)

func newCreateServiceCommand(ctx context.Context, cfg *config.Config) *cobra.Command {
	var name string
	var description string

	cmd := &cobra.Command{
		Use:   "create-service",
		Short: "Create a service API key",
		Long:  "Create a new service record and print a one-time API key for clients that need to authenticate against the notification service.",
		Example: "  iwifunni create-service --name checkout --description \"Checkout service\"\n" +
			"  iwifunni create-service --name billing",
		RunE: func(cmd *cobra.Command, args []string) error {
			store := storage.NewStore(ctx, cfg)
			defer store.Pool.Close()

			rawAPIKey, err := auth.GenerateAPIKey()
			if err != nil {
				return fmt.Errorf("generate api key: %w", err)
			}
			hashedAPIKey := auth.HashAPIKey(rawAPIKey)

			params := db.InsertServiceParams{
				ID:     uuid.New(),
				Name:   name,
				ApiKey: hashedAPIKey,
			}
			if description != "" {
				params.Description = &description
			}

			if err := store.Queries.InsertService(cmd.Context(), params); err != nil {
				return fmt.Errorf("insert service: %w", err)
			}

			_, _ = fmt.Fprintf(cmd.OutOrStdout(), "service created\n")
			_, _ = fmt.Fprintf(cmd.OutOrStdout(), "name: %s\n", params.Name)
			_, _ = fmt.Fprintf(cmd.OutOrStdout(), "id: %s\n", params.ID)
			_, _ = fmt.Fprintf(cmd.OutOrStdout(), "api_key: %s\n", rawAPIKey)
			_, _ = fmt.Fprintln(cmd.OutOrStdout(), "store this key now; it is not persisted in plaintext")

			return nil
		},
	}

	cmd.Flags().StringVar(&name, "name", "", "service name")
	cmd.Flags().StringVar(&description, "description", "", "service description")
	_ = cmd.MarkFlagRequired("name")
	cmd.Flags().SortFlags = false

	return cmd
}
