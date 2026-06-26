-- +goose Up
-- Rename the providers table to integrations, keeping all columns and constraints.

ALTER TABLE providers RENAME TO integrations;

-- Rename indexes to match the new table name
ALTER INDEX idx_providers_project RENAME TO idx_integrations_project;
ALTER INDEX idx_providers_project_name RENAME TO idx_integrations_project_name;
ALTER INDEX idx_providers_primary_per_channel RENAME TO idx_integrations_primary_per_channel;

-- +goose Down
ALTER TABLE integrations RENAME TO providers;

ALTER INDEX idx_integrations_project RENAME TO idx_providers_project;
ALTER INDEX idx_integrations_project_name RENAME TO idx_providers_project_name;
ALTER INDEX idx_integrations_primary_per_channel RENAME TO idx_providers_primary_per_channel;
