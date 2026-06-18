-- +goose Up
ALTER TABLE notifications ALTER COLUMN service_id DROP NOT NULL;

ALTER TABLE notifications
    DROP CONSTRAINT notifications_service_id_fkey,
    ADD CONSTRAINT notifications_service_id_fkey
        FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL;

-- +goose Down
ALTER TABLE notifications
    DROP CONSTRAINT notifications_service_id_fkey,
    ADD CONSTRAINT notifications_service_id_fkey
        FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE;

ALTER TABLE notifications ALTER COLUMN service_id SET NOT NULL;
