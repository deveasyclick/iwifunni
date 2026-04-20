package storage

import (
	"context"
	"database/sql"

	"github.com/deveasyclick/iwifunni/internal/config"
	"github.com/deveasyclick/iwifunni/internal/db"
	"github.com/deveasyclick/iwifunni/pkg/logger"
	"github.com/jackc/pgx/v5/pgxpool"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
	"github.com/rs/zerolog"
)

type Store struct {
	Queries *db.Queries
	Pool    *pgxpool.Pool
}

func NewStore(ctx context.Context, cfg *config.Config) *Store {
	pgPool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		logger.Get().Fatal().Err(err).Msg("failed to connect to postgres")
	}

	if err := pgPool.Ping(ctx); err != nil {
		logger.Get().Fatal().Err(err).Msg("failed to connect to postgres")
	}

	sharedLogger := logger.Get()
	if err := AutoMigrate(cfg, sharedLogger); err != nil {
		sharedLogger.Fatal().Err(err).Msg("failed to apply migrations")
	}
	return &Store{
		Queries: db.New(pgPool),
		Pool:    pgPool,
	}
}

func AutoMigrate(cfg *config.Config, logger *zerolog.Logger) error {
	if cfg.Environment != "production" {
		sqlDB, err := sql.Open("pgx", cfg.DatabaseURL)
		if err != nil {
			return err
		}
		defer sqlDB.Close()

		if err := goose.SetDialect("postgres"); err != nil {
			return err
		}
		if err := goose.Up(sqlDB, "migrations"); err != nil {
			return err
		}
		logger.Info().Msg("migrations applied successfully")
	} else {
		logger.Info().Msg("production environment: skipping automatic migrations")
	}
	return nil
}
