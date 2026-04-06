package storage

import (
	"context"
	"time"

	"github.com/gofrs/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Store struct {
    pool *pgxpool.Pool
}

type ServiceRecord struct {
    ID          string
    Name        string
    APIKey      string
    Description string
    CreatedAt   time.Time
}

type UserPreferences struct {
    UserID   string
    EmailOpt bool
    SMSOpt   bool
}

type PushSubscription struct {
    ID        string
    UserID    string
    Channel   string
    Endpoint  string
    CreatedAt time.Time
}

type NotificationRecord struct {
    ID         string
    ServiceID  string
    UserID     string
    Title      string
    Message    string
    Channels   []string
    Metadata   map[string]string
    Status     string
    RetryCount int
    CreatedAt  time.Time
    UpdatedAt  time.Time
}

func NewStore(pool *pgxpool.Pool) *Store {
    return &Store{pool: pool}
}

func (s *Store) GetServiceByAPIKey(ctx context.Context, key string) (*ServiceRecord, error) {
    const q = `SELECT id, name, api_key, description, created_at FROM services WHERE api_key = $1`;
    row := s.pool.QueryRow(ctx, q, key)
    var svc ServiceRecord
    if err := row.Scan(&svc.ID, &svc.Name, &svc.APIKey, &svc.Description, &svc.CreatedAt); err != nil {
        return nil, err
    }
    return &svc, nil
}

func (s *Store) InsertNotification(ctx context.Context, record *NotificationRecord) error {
    const q = `INSERT INTO notifications (id, service_id, user_id, title, message, channels, metadata, status, retry_count, created_at, updated_at)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`;
    record.ID = uuid.Must(uuid.NewV4()).String()
    record.CreatedAt = time.Now().UTC()
    record.UpdatedAt = record.CreatedAt
    _, err := s.pool.Exec(ctx, q,
        record.ID,
        record.ServiceID,
        record.UserID,
        record.Title,
        record.Message,
        record.Channels,
        record.Metadata,
        record.Status,
        record.RetryCount,
        record.CreatedAt,
        record.UpdatedAt,
    )
    return err
}

func (s *Store) UpsertInAppNotification(ctx context.Context, userID, title, message string, metadata map[string]string) error {
    const q = `INSERT INTO in_app_notifications (id, user_id, title, message, metadata, created_at) VALUES ($1,$2,$3,$4,$5,$6)`;
    _, err := s.pool.Exec(ctx, q, uuid.Must(uuid.NewV4()).String(), userID, title, message, metadata, time.Now().UTC())
    return err
}

func (s *Store) GetUserPreferences(ctx context.Context, userID string) (*UserPreferences, error) {
    const q = `SELECT user_id, email_opt_in, sms_opt_in FROM users_preferences WHERE user_id = $1`;
    row := s.pool.QueryRow(ctx, q, userID)
    var prefs UserPreferences
    if err := row.Scan(&prefs.UserID, &prefs.EmailOpt, &prefs.SMSOpt); err != nil {
        return nil, err
    }
    return &prefs, nil
}

func (s *Store) GetPushSubscriptions(ctx context.Context, userID string) ([]PushSubscription, error) {
    const q = `SELECT id, user_id, channel, endpoint, created_at FROM push_subscriptions WHERE user_id = $1`;
    rows, err := s.pool.Query(ctx, q, userID)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var subs []PushSubscription
    for rows.Next() {
        var sub PushSubscription
        if err := rows.Scan(&sub.ID, &sub.UserID, &sub.Channel, &sub.Endpoint, &sub.CreatedAt); err != nil {
            return nil, err
        }
        subs = append(subs, sub)
    }
    return subs, rows.Err()
}
