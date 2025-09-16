-- This script updates existing LinkedIn schedules to correct the author URN from 'personal' to 'person'.
-- It targets the 'post_content' JSONB column in the 'linkedin_schedules' table.

UPDATE linkedin_schedules
SET
  post_content = jsonb_set(
    post_content,
    '{authorUrn}',
    to_jsonb(REPLACE(post_content ->> 'authorUrn', 'urn:li:personal:', 'urn:li:person:'))
  )
WHERE
  post_content ->> 'authorUrn' LIKE 'urn:li:personal:%';

-- Optional: You can run this SELECT statement before and after the UPDATE to verify the changes.
-- SELECT id, post_content ->> 'authorUrn' as author_urn FROM linkedin_schedules WHERE post_content ->> 'authorUrn' LIKE 'urn:li:personal:%';
-- SELECT id, post_content ->> 'authorUrn' as author_urn FROM linkedin_schedules WHERE post_content ->> 'authorUrn' LIKE 'urn:li:person:%';
