-- Enable Supabase Realtime on the monitoring tables so the super admin
-- dashboard reflects activity the instant it happens (no manual refresh).

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'user_activity_logs'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE user_activity_logs;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'user_sessions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE user_sessions;
    END IF;
END $$;
