-- Migration to modify the campaign_shares table for pending invitations

-- Step 1: Add the new email column, allowing it to be null for now.
ALTER TABLE campaign_shares
ADD COLUMN shared_with_email VARCHAR(255);

-- Step 2: Allow the shared_with_user_id to be nullable for pending invites.
ALTER TABLE campaign_shares
ALTER COLUMN shared_with_user_id DROP NOT NULL;

-- Step 3: Remove the old unique constraint as it requires a non-null user_id.
ALTER TABLE campaign_shares
DROP CONSTRAINT IF EXISTS campaign_shares_campaign_id_shared_with_user_id_key; -- Name might vary, check if this fails

-- Step 4: Add a more complex CHECK constraint.
-- This ensures that either the user_id is set, or the email is set, but not both, and not neither.
ALTER TABLE campaign_shares
ADD CONSTRAINT chk_share_target
CHECK (
    (shared_with_user_id IS NOT NULL AND shared_with_email IS NULL) OR
    (shared_with_user_id IS NULL AND shared_with_email IS NOT NULL)
);

-- Step 5: Add separate unique constraints to handle the nullable columns correctly.
-- Constraint for when a user already exists.
CREATE UNIQUE INDEX IF NOT EXISTS uq_campaign_user_share
ON campaign_shares (campaign_id, shared_with_user_id)
WHERE shared_with_user_id IS NOT NULL;

-- Constraint for when a user is invited by email (pending).
CREATE UNIQUE INDEX IF NOT EXISTS uq_campaign_email_share
ON campaign_shares (campaign_id, shared_with_email)
WHERE shared_with_email IS NOT NULL;

COMMENT ON TABLE campaign_shares IS 'Table to manage campaign sharing, now with support for pending email invitations.';
