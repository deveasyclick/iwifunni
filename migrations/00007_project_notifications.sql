-- +goose Up
ALTER TABLE notifications
    ADD COLUMN project_id UUID REFERENCES projects(id);

-- +goose Down
ALTER TABLE notifications
    DROP COLUMN project_id;
