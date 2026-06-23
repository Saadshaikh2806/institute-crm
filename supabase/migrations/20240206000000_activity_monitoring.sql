-- Activity Monitoring Enhancements
-- Adds richer per-user activity tracking: user-agent capture on activity logs,
-- and a dedicated work-session / live-presence table.

-- 1. Capture the device/browser that performed each action
ALTER TABLE user_activity_logs
    ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- 2. Work sessions table (login -> logout, with heartbeat last_seen)
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    user_email VARCHAR(255),
    session_token TEXT,
    login_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    logout_at TIMESTAMP WITH TIME ZONE,
    ended_reason VARCHAR(50),
    user_agent TEXT,
    CONSTRAINT fk_session_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_seen ON user_sessions(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_logout_at ON user_sessions(logout_at);

-- 3. RLS
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- A user can create their own session rows
CREATE POLICY "Users can insert own sessions"
    ON user_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- A user can update their own session rows (heartbeat / logout)
CREATE POLICY "Users can update own sessions"
    ON user_sessions FOR UPDATE
    USING (auth.uid() = user_id);

-- A user can read their own sessions
CREATE POLICY "Users can view own sessions"
    ON user_sessions FOR SELECT
    USING (auth.uid() = user_id);

-- Super admins can read every session
CREATE POLICY "Super admins can view all sessions"
    ON user_sessions FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM crm_users
        WHERE auth_user_id = auth.uid()
        AND role = 'super_admin'
    ));

-- 4. Convenience view: who is currently online (seen within the last 2 minutes)
CREATE OR REPLACE VIEW online_users AS
SELECT DISTINCT ON (s.user_id)
    s.user_id,
    s.user_email,
    s.last_seen_at,
    s.login_at,
    s.user_agent
FROM user_sessions s
WHERE s.logout_at IS NULL
  AND s.last_seen_at > (CURRENT_TIMESTAMP - INTERVAL '2 minutes')
ORDER BY s.user_id, s.last_seen_at DESC;

GRANT SELECT ON online_users TO authenticated;
