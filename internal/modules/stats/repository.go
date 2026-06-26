package stats

import (
	"context"
	"time"

	"github.com/deveasyclick/iwifunni/internal/db"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

type Counts struct {
	Subscribers     int64
	Workflows       int64
	Notifications   int64
	ActiveProviders int64
}

type StatusCount struct {
	Status string
	Count  int64
}

type DailyActivity struct {
	Day       time.Time
	Total     int64
	Delivered int64
}

type ChannelCount struct {
	Channel string
	Count   int64
}

type RecentNotification struct {
	ID        uuid.UUID
	Title     string
	Message   string
	Channels  []string
	Status    string
	CreatedAt time.Time
}

type ActiveProvider struct {
	Name    string
	Channel string
}

type Repository struct {
	q *db.Queries
}

func NewRepository(q *db.Queries) *Repository {
	return &Repository{q: q}
}

func (r *Repository) GetCounts(ctx context.Context, environmentID uuid.UUID) (Counts, error) {
	envUUID := pgtype.UUID{Bytes: environmentID, Valid: true}

	subs, err := r.q.DashboardSubscriberCount(ctx, environmentID)
	if err != nil {
		return Counts{}, err
	}
	wfs, err := r.q.DashboardWorkflowCount(ctx, environmentID)
	if err != nil {
		return Counts{}, err
	}
	notifs, err := r.q.DashboardNotificationCount(ctx, envUUID)
	if err != nil {
		return Counts{}, err
	}
	provs, err := r.q.DashboardActiveIntegrationCount(ctx, environmentID)
	if err != nil {
		return Counts{}, err
	}

	return Counts{
		Subscribers:     subs,
		Workflows:       wfs,
		Notifications:   notifs,
		ActiveProviders: provs,
	}, nil
}

func (r *Repository) GetNotificationStats(ctx context.Context, environmentID uuid.UUID) ([]StatusCount, error) {
	rows, err := r.q.DashboardNotificationStats(ctx, pgtype.UUID{Bytes: environmentID, Valid: true})
	if err != nil {
		return nil, err
	}
	result := make([]StatusCount, len(rows))
	for i, row := range rows {
		result[i] = StatusCount{Status: row.Status, Count: row.Count}
	}
	return result, nil
}

func (r *Repository) GetDailyActivity(ctx context.Context, environmentID uuid.UUID, since time.Time) ([]DailyActivity, error) {
	rows, err := r.q.DashboardDailyActivity(ctx, db.DashboardDailyActivityParams{
		EnvironmentID: pgtype.UUID{Bytes: environmentID, Valid: true},
		CreatedAt:     pgtype.Timestamptz{Time: since, Valid: true},
	})
	if err != nil {
		return nil, err
	}
	result := make([]DailyActivity, len(rows))
	for i, row := range rows {
		result[i] = DailyActivity{
			Day:       row.Day.Time,
			Total:     row.Total,
			Delivered: row.Delivered,
		}
	}
	return result, nil
}

func (r *Repository) GetChannelBreakdown(ctx context.Context, environmentID uuid.UUID) ([]ChannelCount, error) {
	rows, err := r.q.DashboardChannelBreakdown(ctx, pgtype.UUID{Bytes: environmentID, Valid: true})
	if err != nil {
		return nil, err
	}
	result := make([]ChannelCount, len(rows))
	for i, row := range rows {
		result[i] = ChannelCount{Channel: row.Channel, Count: row.Count}
	}
	return result, nil
}

func (r *Repository) GetRecentNotifications(ctx context.Context, environmentID uuid.UUID, limit int32) ([]RecentNotification, error) {
	rows, err := r.q.DashboardRecentNotifications(ctx, db.DashboardRecentNotificationsParams{
		EnvironmentID: pgtype.UUID{Bytes: environmentID, Valid: true},
		Limit:         limit,
	})
	if err != nil {
		return nil, err
	}
	result := make([]RecentNotification, len(rows))
	for i, row := range rows {
		result[i] = RecentNotification{
			ID:        row.ID,
			Title:     row.Title,
			Message:   row.Message,
			Channels:  row.Channels,
			Status:    row.Status,
			CreatedAt: row.CreatedAt.Time,
		}
	}
	return result, nil
}

func (r *Repository) GetActiveProviders(ctx context.Context, environmentID uuid.UUID) ([]ActiveProvider, error) {
	rows, err := r.q.DashboardActiveIntegrations(ctx, environmentID)
	if err != nil {
		return nil, err
	}
	result := make([]ActiveProvider, len(rows))
	for i, row := range rows {
		result[i] = ActiveProvider{Name: row.Name, Channel: row.Channel}
	}
	return result, nil
}
