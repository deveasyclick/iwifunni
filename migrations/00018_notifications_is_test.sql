-- Add is_test column to notifications for marking test sends
ALTER TABLE notifications
    ADD COLUMN is_test BOOLEAN NOT NULL DEFAULT false;

-- Index for efficient filtering of test notifications
CREATE INDEX idx_notifications_environment_id_is_test
    ON notifications(environment_id, is_test);
