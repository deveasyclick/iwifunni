package cli

import (
	"fmt"

	"github.com/spf13/cobra"
)

func newHelpCommand(rootCmd *cobra.Command) *cobra.Command {
	cmd := &cobra.Command{
		Use:     "help [command]",
		Aliases: []string{"--help", "-h"},
		Short:   "Show help for a command",
		Long:    "Show usage details for the Iwifunni CLI or for a specific subcommand.",
		Args:    cobra.MaximumNArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if len(args) == 0 {
				return rootCmd.Help()
			}

			target, _, err := rootCmd.Find(args)
			if err != nil {
				return fmt.Errorf("unknown help topic %q\n\nRun '%s help' for available commands", args[0], rootCmd.CommandPath())
			}

			return target.Help()
		},
	}

	cmd.SetOut(rootCmd.OutOrStdout())
	cmd.SetErr(rootCmd.ErrOrStderr())

	return cmd
}