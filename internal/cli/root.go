package cli

import (
	"context"
	"fmt"
	"strings"

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
		Use:   "iwifunni",
		Short: "Run Iwifunni CLI commands",
		Long:  "Iwifunni provides CLI commands for service provisioning and administration while the default binary mode starts the notification service.",
		Example: strings.Join([]string{
			"  iwifunni create-service --name checkout --description \"Checkout service\"",
			"  iwifunni help",
			"  iwifunni help create-service",
		}, "\n"),
		SilenceUsage:  true,
		SilenceErrors: true,
	}

	rootCmd.SetHelpCommand(newHelpCommand(rootCmd))
	rootCmd.SetHelpTemplate(rootHelpTemplate)
	rootCmd.SetFlagErrorFunc(func(cmd *cobra.Command, err error) error {
		return fmt.Errorf("%w\n\nRun '%s help' for usage", err, cmd.CommandPath())
	})

	rootCmd.AddCommand(newCreateServiceCommand(ctx, cfg))

	return rootCmd
}

const rootHelpTemplate = `{{with (or .Long .Short)}}{{.}}
{{end}}

Usage:
  {{.UseLine}}

{{if .HasAvailableSubCommands}}Available Commands:
{{range .Commands}}{{if .IsAvailableCommand}}  {{rpad .Name .NamePadding }} {{.Short}}
{{end}}{{end}}
{{end}}{{if .HasAvailableLocalFlags}}
Flags:
{{.LocalFlags.FlagUsages | trimTrailingWhitespaces}}
{{end}}{{if .HasAvailableInheritedFlags}}
Global Flags:
{{.InheritedFlags.FlagUsages | trimTrailingWhitespaces}}
{{end}}{{if .Example}}
Examples:
{{.Example}}
{{end}}`
