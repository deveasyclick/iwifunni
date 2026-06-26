package storage

import (
	"context"
	"database/sql"
	"log/slog"
	"os"

	"github.com/deveasyclick/iwifunni/internal/config"
	"github.com/deveasyclick/iwifunni/internal/db"
	"github.com/deveasyclick/iwifunni/pkg/logger"
	"github.com/jackc/pgx/v5/pgxpool"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
)

type Store struct {
	Queries *db.Queries
	Pool    *pgxpool.Pool
}

func NewStore(ctx context.Context, cfg *config.Config) *Store {
	pgPool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		logger.Get().Error("failed to connect to postgres", "error", err)
		os.Exit(1)
	}

	if err := pgPool.Ping(ctx); err != nil {
		logger.Get().Error("failed to connect to postgres", "error", err)
		os.Exit(1)
	}

	sharedLogger := logger.Get()
	if err := AutoMigrate(cfg, sharedLogger); err != nil {
		sharedLogger.Error("failed to apply migrations", "error", err)
		os.Exit(1)
	}
	return &Store{
		Queries: db.New(pgPool),
		Pool:    pgPool,
	}
}

func AutoMigrate(cfg *config.Config, logger *slog.Logger) error {
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
		logger.Info("migrations applied successfully")
	} else {
		logger.Info("production environment: skipping automatic migrations")
	}
	return nil
}
