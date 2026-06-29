-- PlayFlow Admin - Seed SysAdmin role for bootstrap users
-- Assigns SysAdmin role to all users (for testing/development)
-- In production, this should be restricted to specific users

-- Get all users and assign SysAdmin role if not already assigned
INSERT INTO role_assignments (assignment_id, user_id, role, resource_type, resource_id, granted_by_user_id, status)
SELECT 
  UUID(),
  u.user_id,
  'SysAdmin',
  'Platform',
  'global',
  u.user_id,  -- Self-granted for bootstrap
  'active'
FROM users u
WHERE u.status IN ('active', 'invited', 'mfa_setup_required')
  AND NOT EXISTS (
    SELECT 1 FROM role_assignments ra 
    WHERE ra.user_id = u.user_id 
      AND ra.role = 'SysAdmin' 
      AND ra.status = 'active'
  );

