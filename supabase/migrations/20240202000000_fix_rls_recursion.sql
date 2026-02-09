-- Fix for infinite recursion in RLS policies
-- This migration fixes the super admin policies by using a SECURITY DEFINER function

-- 1. First, drop the problematic policies that cause recursion
DROP POLICY IF EXISTS "Super admins can view all CRM users" ON crm_users;
DROP POLICY IF EXISTS "Super admins can update all CRM users" ON crm_users;
DROP POLICY IF EXISTS "Super admins can insert CRM users" ON crm_users;

-- 2. Create a SECURITY DEFINER function to get user role without triggering RLS
CREATE OR REPLACE FUNCTION get_user_role(user_auth_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM crm_users WHERE auth_user_id = user_auth_id LIMIT 1;
$$;

-- 3. Create a SECURITY DEFINER function to check if current user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM crm_users 
    WHERE auth_user_id = auth.uid() 
    AND role = 'super_admin'
  );
$$;

-- 4. Create a SECURITY DEFINER function to check if current user is admin or super admin
CREATE OR REPLACE FUNCTION is_admin_or_super()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM crm_users 
    WHERE auth_user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  );
$$;

-- 5. Recreate crm_users policies using the helper functions (no recursion)
CREATE POLICY "Super admins can view all CRM users"
    ON crm_users FOR SELECT
    USING (is_super_admin() OR is_admin_or_super());

CREATE POLICY "Super admins can update all CRM users"
    ON crm_users FOR UPDATE
    USING (is_super_admin());

CREATE POLICY "Admins can insert CRM users"
    ON crm_users FOR INSERT
    WITH CHECK (is_admin_or_super());

-- 6. Update other table policies to use helper functions
-- Drop and recreate super admin policies for other tables

DROP POLICY IF EXISTS "Super admins can view all customers" ON customers;
CREATE POLICY "Super admins can view all customers"
    ON customers FOR SELECT
    USING (is_super_admin());

DROP POLICY IF EXISTS "Super admins can view all tasks" ON tasks;
CREATE POLICY "Super admins can view all tasks"
    ON tasks FOR SELECT
    USING (is_super_admin());

DROP POLICY IF EXISTS "Super admins can view all interactions" ON interactions;
CREATE POLICY "Super admins can view all interactions"
    ON interactions FOR SELECT
    USING (is_super_admin());

DROP POLICY IF EXISTS "Super admins can view all tags" ON tags;
CREATE POLICY "Super admins can view all tags"
    ON tags FOR SELECT
    USING (is_super_admin());

DROP POLICY IF EXISTS "Super admins can view all activity logs" ON user_activity_logs;
CREATE POLICY "Super admins can view all activity logs"
    ON user_activity_logs FOR SELECT
    USING (is_super_admin());
