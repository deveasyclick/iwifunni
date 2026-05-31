-- +goose Up
ALTER TABLE notifications
ADD COLUMN job_id TEXT;

CREATE UNIQUE INDEX idx_notifications_job_id
ON notifications(job_id)
WHERE job_id IS NOT NULL;

-- +goose Down
DROP INDEX IF EXISTS idx_notifications_job_id;

ALTER TABLE notifications
DROP COLUMN IF EXISTS job_id;