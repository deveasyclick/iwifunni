package logger

import (
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"runtime/debug"
	"strconv"
	"sync"

	"github.com/lmittmann/tint"
	"github.com/mattn/go-colorable"
	"gopkg.in/natefinch/lumberjack.v2"
)

var once sync.Once

var log *slog.Logger

// colorizeAttr applies ANSI colors to specific log attributes when using tint.
func colorizeAttr(_ []string, a slog.Attr) slog.Attr {
	switch a.Key {
	case "method":
		return tint.Attr(3, a) // yellow
	case "path":
		return tint.Attr(5, a) // magenta
	case "status":
		if a.Value.Kind() == slog.KindInt64 {
			v := a.Value.Int64()
			switch {
			case v >= 500:
				return tint.Attr(1, a) // red
			case v >= 400:
				return tint.Attr(3, a) // yellow
			default:
				return tint.Attr(2, a) // green
			}
		}
		return tint.Attr(6, a) // cyan fallback
	case "error":
		return tint.Attr(1, a) // red
	case "duration":
		return tint.Attr(6, a) // cyan
	case "channel":
		return tint.Attr(4, a) // blue
	case "remote":
		return tint.Attr(8, a) // bright black / gray
	default:
		return a
	}
}

// Get returns the application-wide slog logger.
//
// In development mode, output is colored text written to stdout.
// In non-development mode, output is JSON written to stderr and a log file.
//
// Color can be controlled via environment variables:
//   - NO_COLOR: set to any value to disable color (see https://no-color.org/)
//   - CLICOLOR_FORCE: set to 1 to force color even when stdout is not a terminal
func Get() *slog.Logger {
	once.Do(func() {
		level := slog.LevelInfo
		if levelStr, err := strconv.Atoi(os.Getenv("LOG_LEVEL")); err == nil {
			level = slog.Level(levelStr)
		}

		environment := os.Getenv("ENVIRONMENT")
		if environment == "" {
			environment = "development"
		}

		var gitRevision string
		var goVersion string

		buildInfo, ok := debug.ReadBuildInfo()
		if ok {
			goVersion = buildInfo.GoVersion
			for _, v := range buildInfo.Settings {
				if v.Key == "vcs.revision" {
					gitRevision = v.Value
					break
				}
			}
		}

		var handler slog.Handler

		if environment == "development" {
			noColor := os.Getenv("NO_COLOR") != "" || os.Getenv("TERM") == "dumb"
			if os.Getenv("CLICOLOR_FORCE") == "1" {
				noColor = false
			}

			handler = tint.NewHandler(colorable.NewColorable(os.Stdout), &tint.Options{
				Level:      level,
				TimeFormat: "2006-01-02T15:04:05.000Z07:00",
				NoColor:    noColor,
				ReplaceAttr: colorizeAttr,
			})
		} else {
			logDir := os.Getenv("LOG_DIR")
			if logDir == "" {
				logDir = "logs"
			}

			_ = os.MkdirAll(logDir, 0o755)

			fileLogger := &lumberjack.Logger{
				Filename:   filepath.Join(logDir, "app_log.log"),
				MaxSize:    5,
				MaxBackups: 10,
				MaxAge:     14,
				Compress:   true,
			}

			writer := io.MultiWriter(os.Stderr, fileLogger)
			handler = slog.NewJSONHandler(writer, &slog.HandlerOptions{
				Level: level,
			})
		}

		log = slog.New(handler).With(
			"git_revision", gitRevision,
			"go_version", goVersion,
		)
	})

	return log
}
