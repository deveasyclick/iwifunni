-- +goose Up
-- Remove duplicate delivery attempts before adding the unique constraint.
-- Keep only the latest attempt for each (notification_id, channel) pair.
DELETE FROM delivery_attempts da
USING (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY notification_id, channel
      ORDER BY attempted_at DESC
    ) AS rn
  FROM delivery_attempts
) dup
WHERE da.id = dup.id AND dup.rn > 1;

-- Add unique constraint on (notification_id, channel) so delivery attempts
-- can be upserted instead of inserted, preventing duplicates on retries.
ALTER TABLE delivery_attempts
ADD CONSTRAINT delivery_attempts_notification_channel_key UNIQUE (notification_id, channel);
