ALTER TABLE crm_users
ADD COLUMN IF NOT EXISTS active_session_token TEXT;
