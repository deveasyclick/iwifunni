package logger

import (
	"io"
	"os"
	"path/filepath"
	"runtime/debug"
	"strconv"
	"sync"
	"time"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/pkgerrors"
	"gopkg.in/natefinch/lumberjack.v2"
)

var once sync.Once

var log zerolog.Logger

func Get() *zerolog.Logger {
	once.Do(func() {
		zerolog.ErrorStackMarshaler = pkgerrors.MarshalStack
		zerolog.TimeFieldFormat = time.RFC3339Nano

		logLevel, err := strconv.Atoi(os.Getenv("LOG_LEVEL"))
		if err != nil {
			logLevel = int(zerolog.InfoLevel) // default to INFO
		}

		var output io.Writer = zerolog.ConsoleWriter{
			Out:        os.Stdout,
			TimeFormat: time.RFC3339,
		}

		environment := os.Getenv("ENVIRONMENT")
		if environment == "" {
			environment = "development"
		}

		if environment != "development" {
			logDir := os.Getenv("LOG_DIR")
			if logDir == "" {
				logDir = "logs"
			}

			_ = os.MkdirAll(logDir, 0o755)

			fileLogger := &lumberjack.Logger{
				Filename:   filepath.Join(logDir, "app_log.log"),
				MaxSize:    5, //
				MaxBackups: 10,
				MaxAge:     14,
				Compress:   true,
			}

			output = zerolog.MultiLevelWriter(os.Stderr, fileLogger)
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

		log = zerolog.New(output).
			Level(zerolog.Level(logLevel)).
			With().
			Timestamp().
			Str("git_revision", gitRevision).
			Str("go_version", goVersion).
			Logger()
	})

	return &log
}
