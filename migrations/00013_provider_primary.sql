-- +goose Up
ALTER TABLE providers
ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE providers
DROP CONSTRAINT IF EXISTS providers_primary_requires_active;

ALTER TABLE providers
ADD CONSTRAINT providers_primary_requires_active CHECK (NOT is_primary OR is_active);

CREATE UNIQUE INDEX IF NOT EXISTS idx_providers_primary_per_channel
ON providers(environment_id, channel)
WHERE is_primary = true;

WITH ranked AS (
    SELECT
        id,
        environment_id,
        channel,
        ROW_NUMBER() OVER (PARTITION BY environment_id, channel ORDER BY created_at ASC, id ASC) AS row_num
    FROM providers
    WHERE is_active = true
),
channels_without_primary AS (
    SELECT DISTINCT p.environment_id, p.channel
    FROM providers p
    WHERE p.is_active = true
      AND NOT EXISTS (
          SELECT 1
          FROM providers existing
          WHERE existing.environment_id = p.environment_id
            AND existing.channel = p.channel
            AND existing.is_primary = true
      )
)
UPDATE providers target
SET is_primary = true,
    updated_at = now()
FROM ranked
JOIN channels_without_primary missing
  ON missing.environment_id = ranked.environment_id
 AND missing.channel = ranked.channel
WHERE target.id = ranked.id
  AND ranked.row_num = 1;

-- +goose Down
DROP INDEX IF EXISTS idx_providers_primary_per_channel;

ALTER TABLE providers
DROP CONSTRAINT IF EXISTS providers_primary_requires_active;

ALTER TABLE providers
DROP COLUMN IF EXISTS is_primary;
