-- First drop any existing triggers and views
DROP TRIGGER IF EXISTS log_daily_tasks_view_access ON daily_tasks_view;
DROP FUNCTION IF EXISTS log_view_access();
DROP VIEW IF EXISTS daily_tasks_view;

-- Create the view without triggers
CREATE VIEW daily_tasks_view AS
SELECT 
    t.id as task_id,
    t.title as task_title,
    t.duedate as due_date,
    t.completed,
    c.name as customer_name,
    c.phone as customer_phone,
    au.email as user_email,
    t.user_id,
    c.id as customer_id
FROM 
    tasks t
    INNER JOIN customers c ON t.customer_id = c.id
    INNER JOIN auth.users au ON t.user_id = au.id;

-- Add comment for documentation
COMMENT ON VIEW daily_tasks_view IS 'Daily tasks view for email notifications';

-- Test queries to verify data
SELECT * FROM daily_tasks_view;
