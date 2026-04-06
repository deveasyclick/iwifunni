package storage

import (
	"context"
	"database/sql"

	"github.com/deveasyclick/iwifunni/internal/config"
	"github.com/deveasyclick/iwifunni/internal/db"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/pressly/goose/v3"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

type Store struct {
	Queries *db.Queries
	Pool    *pgxpool.Pool
}

func NewStore(ctx context.Context, cfg *config.Config) *Store {
	pgPool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatal().Err(err).Msg("failed to connect to postgres")
	}

	if err := pgPool.Ping(ctx); err != nil {
		log.Fatal().Err(err).Msg("failed to connect to postgres")
	}

	AutoMigrate(cfg, &log.Logger)
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

		goose.SetDialect("postgres")
		if err := goose.Up(sqlDB, "migrations"); err != nil {
			return err
		}
		logger.Info().Msg("migrations applied successfully")
	} else {
		logger.Info().Msg("production environment: skipping automatic migrations")
	}
	return nil
}
