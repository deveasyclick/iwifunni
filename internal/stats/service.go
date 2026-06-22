package stats

import (
	"context"
	"time"

	"github.com/google/uuid"
	"golang.org/x/sync/errgroup"
)

type StatsResponse struct {
	Counts              CountsResponse           `json:"counts"`
	NotificationStats   []StatusCountResponse    `json:"notification_stats"`
	DailyActivity       []DailyActivityResponse  `json:"daily_activity"`
	ChannelBreakdown    []ChannelCountResponse   `json:"channel_breakdown"`
	RecentNotifications []NotificationResponse   `json:"recent_notifications"`
	ActiveProviders     []ActiveProviderResponse `json:"active_providers"`
}

type CountsResponse struct {
	TotalNotifications int64 `json:"total_notifications"`
	TotalSubscribers   int64 `json:"total_subscribers"`
	TotalWorkflows     int64 `json:"total_workflows"`
	ActiveProviders    int64 `json:"active_providers"`
}

type StatusCountResponse struct {
	Status string `json:"status"`
	Count  int64  `json:"count"`
}

type DailyActivityResponse struct {
	Day       string `json:"day"`
	Total     int64  `json:"total"`
	Delivered int64  `json:"delivered"`
}

type ChannelCountResponse struct {
	Channel string `json:"channel"`
	Count   int64  `json:"count"`
}

type ActiveProviderResponse struct {
	Name    string `json:"name"`
	Channel string `json:"channel"`
}

type NotificationResponse struct {
	ID        string   `json:"id"`
	Title     string   `json:"title"`
	Message   string   `json:"message"`
	Channels  []string `json:"channels"`
	Status    string   `json:"status"`
	CreatedAt string   `json:"created_at"`
}

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) GetStats(ctx context.Context, environmentID uuid.UUID) (*StatsResponse, error) {
	g, ctx := errgroup.WithContext(ctx)

	since := time.Now().AddDate(0, 0, -7)

	var counts Counts
	var notifStats []StatusCount
	var activity []DailyActivity
	var breakdown []ChannelCount
	var recent []RecentNotification
	var activeProvs []ActiveProvider

	g.Go(func() error {
		var err error
		counts, err = s.repo.GetCounts(ctx, environmentID)
		return err
	})
	g.Go(func() error {
		var err error
		notifStats, err = s.repo.GetNotificationStats(ctx, environmentID)
		return err
	})
	g.Go(func() error {
		var err error
		activity, err = s.repo.GetDailyActivity(ctx, environmentID, since)
		return err
	})
	g.Go(func() error {
		var err error
		breakdown, err = s.repo.GetChannelBreakdown(ctx, environmentID)
		return err
	})
	g.Go(func() error {
		var err error
		recent, err = s.repo.GetRecentNotifications(ctx, environmentID, 5)
		return err
	})
	g.Go(func() error {
		var err error
		activeProvs, err = s.repo.GetActiveProviders(ctx, environmentID)
		return err
	})

	if err := g.Wait(); err != nil {
		return nil, err
	}

	statusCounts := make([]StatusCountResponse, len(notifStats))
	for i, stat := range notifStats {
		statusCounts[i] = StatusCountResponse(stat)
	}

	dailyActivity := make([]DailyActivityResponse, len(activity))
	for i, a := range activity {
		dailyActivity[i] = DailyActivityResponse{
			Day:       a.Day.Format("Jan 2"),
			Total:     a.Total,
			Delivered: a.Delivered,
		}
	}

	channelBreakdown := make([]ChannelCountResponse, len(breakdown))
	for i, b := range breakdown {
		channelBreakdown[i] = ChannelCountResponse(b)
	}

	recentNotifs := make([]NotificationResponse, len(recent))
	for i, n := range recent {
		recentNotifs[i] = NotificationResponse{
			ID:        n.ID.String(),
			Title:     n.Title,
			Message:   n.Message,
			Channels:  n.Channels,
			Status:    n.Status,
			CreatedAt: n.CreatedAt.Format(time.RFC3339),
		}
	}

	activeProviderList := make([]ActiveProviderResponse, len(activeProvs))
	for i, p := range activeProvs {
		activeProviderList[i] = ActiveProviderResponse(p)
	}

	return &StatsResponse{
		Counts: CountsResponse{
			TotalNotifications: counts.Notifications,
			TotalSubscribers:   counts.Subscribers,
			TotalWorkflows:     counts.Workflows,
			ActiveProviders:    counts.ActiveProviders,
		},
		NotificationStats:   statusCounts,
		DailyActivity:       dailyActivity,
		ChannelBreakdown:    channelBreakdown,
		RecentNotifications: recentNotifs,
		ActiveProviders:     activeProviderList,
	}, nil
}
