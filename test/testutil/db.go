package testutil

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"sync"

	db "github.com/deveasyclick/iwifunni/internal/db/gen"
	"github.com/jackc/pgx/v5/pgxpool"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
)

const (
	// DefaultTestDatabase is the default database name for integration tests.
	DefaultTestDatabase = "iwifunni_test"
)

var (
	pool     *pgxpool.Pool
	queries  *db.Queries
	initOnce sync.Once
	initErr  error
)

// DBConfig holds the connection parameters for the test database.
type DBConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	DBName   string
}

// DefaultDBConfig returns a DBConfig from environment variables with sensible defaults
// matching the project's docker-compose.yml.
func DefaultDBConfig() DBConfig {
	return DBConfig{
		Host:     envOrDefault("TEST_DB_HOST", "localhost"),
		Port:     envOrDefault("TEST_DB_PORT", "5435"),
		User:     envOrDefault("TEST_DB_USER", "yusuf"),
		Password: envOrDefault("TEST_DB_PASSWORD", "123456"),
		DBName:   envOrDefault("TEST_DB_NAME", DefaultTestDatabase),
	}
}

// DSN returns the Postgres connection string for the config.
func (c DBConfig) DSN() string {
	return fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable",
		c.User, c.Password, c.Host, c.Port, c.DBName)
}

// AdminDSN returns a connection string without a database (for CREATE/DROP DATABASE).
func (c DBConfig) AdminDSN() string {
	return fmt.Sprintf("postgres://%s:%s@%s:%s/postgres?sslmode=disable",
		c.User, c.Password, c.Host, c.Port)
}

// InitTestDB initializes the test database connection and runs migrations.
// It is safe to call multiple times — initialization happens once.
func InitTestDB() (*pgxpool.Pool, *db.Queries, error) {
	initOnce.Do(func() {
		cfg := DefaultDBConfig()
		initErr = ensureTestDatabase(cfg)
		if initErr != nil {
			return
		}

		pool, initErr = pgxpool.New(context.Background(), cfg.DSN())
		if initErr != nil {
			return
		}

		if initErr = pool.Ping(context.Background()); initErr != nil {
			return
		}

		queries = db.New(pool)

		initErr = runMigrations(cfg)
	})
	return pool, queries, initErr
}

// Pool returns the initialized connection pool. It panics if InitTestDB hasn't been called.
func Pool() *pgxpool.Pool {
	if pool == nil {
		panic("testutil: InitTestDB must be called before Pool()")
	}
	return pool
}

// Queries returns the initialized queries object. It panics if InitTestDB hasn't been called.
func Queries() *db.Queries {
	if queries == nil {
		panic("testutil: InitTestDB must be called before Queries()")
	}
	return queries
}

// ResetTestDB drops all tables and re-runs migrations, giving a clean slate.
// Useful between test suites.
func ResetTestDB() error {
	p := Pool()
	q := Queries()
	_ = q

	_, err := p.Exec(context.Background(), `
		DROP SCHEMA public CASCADE;
		CREATE SCHEMA public;
	`)
	if err != nil {
		return fmt.Errorf("reset test db: %w", err)
	}
	return runMigrations(DefaultDBConfig())
}

func ensureTestDatabase(cfg DBConfig) error {
	adminDSN := cfg.AdminDSN()
	sqlDB, err := sql.Open("pgx", adminDSN)
	if err != nil {
		return fmt.Errorf("connect to admin db: %w", err)
	}
	defer sqlDB.Close()

	var exists bool
	err = sqlDB.QueryRow("SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1)", cfg.DBName).Scan(&exists)
	if err != nil {
		return fmt.Errorf("check db exists: %w", err)
	}

	if !exists {
		_, err = sqlDB.Exec(fmt.Sprintf("CREATE DATABASE %s", cfg.DBName))
		if err != nil {
			return fmt.Errorf("create test database: %w", err)
		}
	}

	return nil
}

func runMigrations(cfg DBConfig) error {
	// Find project root by looking for go.mod in parent directories.
	root := findProjectRoot()
	migrationsDir := filepath.Join(root, envOrDefault("TEST_MIGRATIONS_DIR", "migrations"))

	sqlDB, err := sql.Open("pgx", cfg.DSN())
	if err != nil {
		return fmt.Errorf("connect for migrations: %w", err)
	}
	defer sqlDB.Close()

	goose.SetLogger(goose.NopLogger())
	if err := goose.SetDialect("postgres"); err != nil {
		return fmt.Errorf("set dialect: %w", err)
	}
	if err := goose.Up(sqlDB, migrationsDir); err != nil {
		return fmt.Errorf("run migrations: %w", err)
	}
	return nil
}

func envOrDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func findProjectRoot() string {
	dir, _ := os.Getwd()
	for {
		if _, err := os.Stat(filepath.Join(dir, "go.mod")); err == nil {
			return dir
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return "."
		}
		dir = parent
	}
}
