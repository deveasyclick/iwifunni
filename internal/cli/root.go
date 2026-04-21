package cli

import (
	"context"

	"github.com/spf13/cobra"

	"github.com/deveasyclick/iwifunni/internal/config"
)

func Run(ctx context.Context, cfg *config.Config, args []string) (bool, error) {
	if len(args) == 0 {
		return false, nil
	}

	rootCmd := newRootCommand(ctx, cfg)
	rootCmd.SetArgs(args)

	return true, rootCmd.ExecuteContext(ctx)
}

func newRootCommand(ctx context.Context, cfg *config.Config) *cobra.Command {
	rootCmd := &cobra.Command{
		Use:           "iwifunni",
		Short:         "Iwifunni service commands",
		SilenceUsage:  true,
		SilenceErrors: true,
	}

	rootCmd.AddCommand(newCreateServiceCommand(ctx, cfg))

	return rootCmd
}