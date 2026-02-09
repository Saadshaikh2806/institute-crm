-- Super Admin Activity Tracking Migration
-- Creates activity logs table and updates user roles

-- 1. Create user_activity_logs table
CREATE TABLE IF NOT EXISTS user_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    user_email VARCHAR(255),
    action_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    details JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 2. Create indexes for better query performance
CREATE INDEX idx_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX idx_activity_logs_action_type ON user_activity_logs(action_type);
CREATE INDEX idx_activity_logs_created_at ON user_activity_logs(created_at);
CREATE INDEX idx_activity_logs_entity_type ON user_activity_logs(entity_type);

-- 3. Enable RLS on activity logs
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;

-- 4. Super Admin policies for viewing all data
-- Super admins can view all activity logs
CREATE POLICY "Super admins can view all activity logs"
    ON user_activity_logs FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM crm_users
        WHERE auth_user_id = auth.uid()
        AND role = 'super_admin'
    ));

-- Super admins can insert activity logs (for logging actions)
CREATE POLICY "Authenticated users can insert activity logs"
    ON user_activity_logs FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- 5. Super Admin policies for crm_users table
CREATE POLICY "Super admins can view all CRM users"
    ON crm_users FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM crm_users
        WHERE auth_user_id = auth.uid()
        AND role = 'super_admin'
    ));

CREATE POLICY "Super admins can update all CRM users"
    ON crm_users FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM crm_users
        WHERE auth_user_id = auth.uid()
        AND role = 'super_admin'
    ));

CREATE POLICY "Super admins can insert CRM users"
    ON crm_users FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM crm_users
        WHERE auth_user_id = auth.uid()
        AND role IN ('super_admin', 'admin')
    ));

-- 6. Super Admin policies for customers table (view all)
CREATE POLICY "Super admins can view all customers"
    ON customers FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM crm_users
        WHERE auth_user_id = auth.uid()
        AND role = 'super_admin'
    ));

-- 7. Super Admin policies for tasks table (view all)
CREATE POLICY "Super admins can view all tasks"
    ON tasks FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM crm_users
        WHERE auth_user_id = auth.uid()
        AND role = 'super_admin'
    ));

-- 8. Super Admin policies for interactions table (view all)
CREATE POLICY "Super admins can view all interactions"
    ON interactions FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM crm_users
        WHERE auth_user_id = auth.uid()
        AND role = 'super_admin'
    ));

-- 9. Super Admin policies for tags table (view all)
CREATE POLICY "Super admins can view all tags"
    ON tags FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM crm_users
        WHERE auth_user_id = auth.uid()
        AND role = 'super_admin'
    ));

-- 10. Create a view for user statistics (for super admin dashboard)
CREATE OR REPLACE VIEW user_statistics AS
SELECT 
    cu.id as user_id,
    cu.auth_user_id,
    cu.email,
    cu.full_name,
    cu.role,
    cu.is_active,
    cu.last_login,
    cu.created_at,
    COALESCE(c.customer_count, 0) as customer_count,
    COALESCE(t.task_count, 0) as task_count,
    COALESCE(t.completed_task_count, 0) as completed_task_count,
    la.last_activity
FROM crm_users cu
LEFT JOIN (
    SELECT user_id, COUNT(*) as customer_count
    FROM customers
    GROUP BY user_id
) c ON cu.auth_user_id = c.user_id
LEFT JOIN (
    SELECT user_id, 
           COUNT(*) as task_count,
           COUNT(*) FILTER (WHERE completed = true) as completed_task_count
    FROM tasks
    GROUP BY user_id
) t ON cu.auth_user_id = t.user_id
LEFT JOIN (
    SELECT user_id, MAX(created_at) as last_activity
    FROM user_activity_logs
    GROUP BY user_id
) la ON cu.auth_user_id = la.user_id;

-- Grant select on view to authenticated users
GRANT SELECT ON user_statistics TO authenticated;
