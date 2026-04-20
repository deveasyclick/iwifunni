package worker

import (
	"context"
	"encoding/json"

	"github.com/deveasyclick/iwifunni/internal/notifications"
	"github.com/deveasyclick/iwifunni/internal/types"
	"github.com/deveasyclick/iwifunni/pkg/logger"
	"github.com/hibiken/asynq"
)

type Consumer struct {
	server   *asynq.Server
	notifier *notifications.Manager
}

func NewConsumer(server *asynq.Server, notifier *notifications.Manager) *Consumer {
	return &Consumer{server: server, notifier: notifier}
}

func (c *Consumer) Run(ctx context.Context) error {
	mux := asynq.NewServeMux()
	mux.HandleFunc(TaskTypeNotificationSend, c.handleNotificationSend)

	return c.server.Start(mux)
}

func (c *Consumer) handleNotificationSend(ctx context.Context, t *asynq.Task) error {
	var job types.NotificationJob
	if err := json.Unmarshal(t.Payload(), &job); err != nil {
		logger.Get().Error().Err(err).Msg("invalid job payload")
		return err
	}

	return c.notifier.Send(ctx, &job)
}
