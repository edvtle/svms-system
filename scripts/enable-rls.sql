-- Enable Row Level Security (RLS) on all public tables
-- This script fixes the "RLS Disabled in Public" security warnings
-- Adapted for BIGINT user IDs with custom JWT authentication
-- =============================================================================
-- HELPER FUNCTION: Get current authenticated user ID from JWT claims
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_auth_user_id() RETURNS BIGINT AS $$
SELECT COALESCE(
    (
      current_setting('request.jwt.claims', true)::jsonb->>'user_id'
    )::bigint,
    NULL
  ) $$ LANGUAGE sql STABLE
SET search_path = public;
-- =============================================================================
-- HELPER FUNCTION: Get current user's role
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_user_role() RETURNS VARCHAR AS $$
SELECT role
FROM users
WHERE id = public.get_auth_user_id() $$ LANGUAGE sql STABLE
SET search_path = public;
-- =============================================================================
-- 1. USERS TABLE - RLS Setup
-- =============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
-- Policy: Admins can see all users
CREATE POLICY "Admins can view all users" ON public.users FOR
SELECT TO authenticated USING (
    (
      SELECT role
      FROM users
      WHERE id = public.get_auth_user_id()
    ) = 'admin'
    OR public.get_auth_user_id() = id
  );
-- Policy: Admins can update any user
CREATE POLICY "Admins can update users" ON public.users FOR
UPDATE TO authenticated USING (
    (
      SELECT role
      FROM users
      WHERE id = public.get_auth_user_id()
    ) = 'admin'
  ) WITH CHECK (
    (
      SELECT role
      FROM users
      WHERE id = public.get_auth_user_id()
    ) = 'admin'
  );
-- Policy: Admins can insert users
CREATE POLICY "Admins can insert users" ON public.users FOR
INSERT TO authenticated WITH CHECK (
    (
      SELECT role
      FROM users
      WHERE id = public.get_auth_user_id()
    ) = 'admin'
  );
-- Policy: Admins can delete users
CREATE POLICY "Admins can delete users" ON public.users FOR DELETE TO authenticated USING (
  (
    SELECT role
    FROM users
    WHERE id = public.get_auth_user_id()
  ) = 'admin'
);
-- Policy: Allow service role (backend) full access
CREATE POLICY "Service role has full access to users" ON public.users TO service_role USING (true) WITH CHECK (true);
-- =============================================================================
-- 2. STUDENTS TABLE - RLS Setup
-- =============================================================================
ALTER TABLE public."Students" ENABLE ROW LEVEL SECURITY;
-- Policy: Admins can view all students
CREATE POLICY "Admins can view all students" ON public."Students" FOR
SELECT TO authenticated USING (
    (
      SELECT role
      FROM users
      WHERE id = public.get_auth_user_id()
    ) = 'admin'
  );
-- Policy: Students can view their own record
CREATE POLICY "Students can view own record" ON public."Students" FOR
SELECT TO authenticated USING (
    user_id = public.get_auth_user_id()
    OR (
      SELECT role
      FROM users
      WHERE id = public.get_auth_user_id()
    ) = 'admin'
  );
-- Policy: Admins can update students
CREATE POLICY "Admins can update students" ON public."Students" FOR
UPDATE TO authenticated USING (
    (
      SELECT role
      FROM users
      WHERE id = public.get_auth_user_id()
    ) = 'admin'
  ) WITH CHECK (
    (
      SELECT role
      FROM users
      WHERE id = public.get_auth_user_id()
    ) = 'admin'
  );
-- Policy: Admins can insert students
CREATE POLICY "Admins can insert students" ON public."Students" FOR
INSERT TO authenticated WITH CHECK (
    (
      SELECT role
      FROM users
      WHERE id = public.get_auth_user_id()
    ) = 'admin'
  );
-- Policy: Admins can delete students
CREATE POLICY "Admins can delete students" ON public."Students" FOR DELETE TO authenticated USING (
  (
    SELECT role
    FROM users
    WHERE id = public.get_auth_user_id()
  ) = 'admin'
);
-- Policy: Allow service role (backend) full access
CREATE POLICY "Service role has full access to students" ON public."Students" TO service_role USING (true) WITH CHECK (true);
-- =============================================================================
-- 3. VIOLATIONS TABLE - RLS Setup (Reference/Catalog Table)
-- =============================================================================
ALTER TABLE public.violations ENABLE ROW LEVEL SECURITY;
-- Policy: Everyone can read violations (it's a reference table)
CREATE POLICY "Anyone can view violations" ON public.violations FOR
SELECT TO authenticated USING (true);
-- Policy: Admins can manage violations
CREATE POLICY "Admins can insert violations" ON public.violations FOR
INSERT TO authenticated WITH CHECK (
    (
      SELECT role
      FROM users
      WHERE id = public.get_auth_user_id()
    ) = 'admin'
  );
CREATE POLICY "Admins can update violations" ON public.violations FOR
UPDATE TO authenticated USING (
    (
      SELECT role
      FROM users
      WHERE id = public.get_auth_user_id()
    ) = 'admin'
  ) WITH CHECK (
    (
      SELECT role
      FROM users
      WHERE id = public.get_auth_user_id()
    ) = 'admin'
  );
CREATE POLICY "Admins can delete violations" ON public.violations FOR DELETE TO authenticated USING (
  (
    SELECT role
    FROM users
    WHERE id = public.get_auth_user_id()
  ) = 'admin'
);
-- Policy: Allow service role (backend) full access
CREATE POLICY "Service role has full access to violations" ON public.violations TO service_role USING (true) WITH CHECK (true);
-- =============================================================================
-- 4. STUDENT_VIOLATION_LOGS TABLE - RLS Setup
-- =============================================================================
ALTER TABLE public.student_violation_logs ENABLE ROW LEVEL SECURITY;
-- Policy: Admins can view all violation logs
CREATE POLICY "Admins can view all violation logs" ON public.student_violation_logs FOR
SELECT TO authenticated USING (
    (
      SELECT role
      FROM users
      WHERE id = public.get_auth_user_id()
    ) = 'admin'
  );
-- Policy: Students can view their own violation logs
CREATE POLICY "Students can view own violation logs" ON public.student_violation_logs FOR
SELECT TO authenticated USING (
    (
      SELECT user_id
      FROM "Students"
      WHERE id = student_id
    ) = public.get_auth_user_id()
    OR (
      SELECT role
      FROM users
      WHERE id = public.get_auth_user_id()
    ) = 'admin'
  );
-- Policy: Admins can insert violation logs
CREATE POLICY "Admins can insert violation logs" ON public.student_violation_logs FOR
INSERT TO authenticated WITH CHECK (
    (
      SELECT role
      FROM users
      WHERE id = public.get_auth_user_id()
    ) = 'admin'
  );
-- Policy: Admins can update violation logs
CREATE POLICY "Admins can update violation logs" ON public.student_violation_logs FOR
UPDATE TO authenticated USING (
    (
      SELECT role
      FROM users
      WHERE id = public.get_auth_user_id()
    ) = 'admin'
  ) WITH CHECK (
    (
      SELECT role
      FROM users
      WHERE id = public.get_auth_user_id()
    ) = 'admin'
  );
-- Policy: Admins can delete violation logs
CREATE POLICY "Admins can delete violation logs" ON public.student_violation_logs FOR DELETE TO authenticated USING (
  (
    SELECT role
    FROM users
    WHERE id = public.get_auth_user_id()
  ) = 'admin'
);
-- Policy: Allow service role (backend) full access
CREATE POLICY "Service role has full access to student_violation_logs" ON public.student_violation_logs TO service_role USING (true) WITH CHECK (true);
-- =============================================================================
-- 5. ADMINS TABLE - RLS Setup
-- =============================================================================
ALTER TABLE public."Admins" ENABLE ROW LEVEL SECURITY;
-- Policy: Admins can see all admin records
CREATE POLICY "Admins can view all admins" ON public."Admins" FOR
SELECT TO authenticated USING (
    (
      SELECT role
      FROM users
      WHERE id = public.get_auth_user_id()
    ) = 'admin'
  );
-- Policy: Students can see limited admin info (for contact/support purposes)
CREATE POLICY "Students can view admin directory" ON public."Admins" FOR
SELECT TO authenticated USING (
    (
      SELECT role
      FROM users
      WHERE id = public.get_auth_user_id()
    ) = 'student'
  );
-- Policy: Admins can update admin records
CREATE POLICY "Admins can update admins" ON public."Admins" FOR
UPDATE TO authenticated USING (
    (
      SELECT role
      FROM users
      WHERE id = public.get_auth_user_id()
    ) = 'admin'
  ) WITH CHECK (
    (
      SELECT role
      FROM users
      WHERE id = public.get_auth_user_id()
    ) = 'admin'
  );
-- Policy: Admins can insert admin records
CREATE POLICY "Admins can insert admins" ON public."Admins" FOR
INSERT TO authenticated WITH CHECK (
    (
      SELECT role
      FROM users
      WHERE id = public.get_auth_user_id()
    ) = 'admin'
  );
-- Policy: Admins can delete admin records
CREATE POLICY "Admins can delete admins" ON public."Admins" FOR DELETE TO authenticated USING (
  (
    SELECT role
    FROM users
    WHERE id = public.get_auth_user_id()
  ) = 'admin'
);
-- Policy: Allow service role (backend) full access
CREATE POLICY "Service role has full access to admins" ON public."Admins" TO service_role USING (true) WITH CHECK (true);
-- =============================================================================
-- 6. AUDIT_LOGS TABLE - RLS Setup
-- =============================================================================
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
-- Policy: Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR
SELECT TO authenticated USING (
    (
      SELECT role
      FROM users
      WHERE id = public.get_auth_user_id()
    ) = 'admin'
  );
-- Policy: Admins can insert audit logs
CREATE POLICY "Admins can insert audit logs" ON public.audit_logs FOR
INSERT TO authenticated WITH CHECK (
    (
      SELECT role
      FROM users
      WHERE id = public.get_auth_user_id()
    ) = 'admin'
  );
-- Policy: Allow service role (backend) full access for logging
CREATE POLICY "Service role has full access to audit_logs" ON public.audit_logs TO service_role USING (true) WITH CHECK (true);
-- =============================================================================
-- 7. SYSTEMSETTINGS TABLE - RLS Setup
-- =============================================================================
ALTER TABLE public."SystemSettings" ENABLE ROW LEVEL SECURITY;
-- Policy: Everyone can read system settings
CREATE POLICY "Anyone can view system settings" ON public."SystemSettings" FOR
SELECT TO authenticated USING (true);
-- Policy: Admins can update system settings
CREATE POLICY "Admins can update system settings" ON public."SystemSettings" FOR
UPDATE TO authenticated USING (
    (
      SELECT role
      FROM users
      WHERE id = public.get_auth_user_id()
    ) = 'admin'
  ) WITH CHECK (
    (
      SELECT role
      FROM users
      WHERE id = public.get_auth_user_id()
    ) = 'admin'
  );
-- Policy: Admins can insert system settings
CREATE POLICY "Admins can insert system settings" ON public."SystemSettings" FOR
INSERT TO authenticated WITH CHECK (
    (
      SELECT role
      FROM users
      WHERE id = public.get_auth_user_id()
    ) = 'admin'
  );
-- Policy: Allow service role (backend) full access
CREATE POLICY "Service role has full access to SystemSettings" ON public."SystemSettings" TO service_role USING (true) WITH CHECK (true);
-- =============================================================================
-- 8. NOTIFICATIONS TABLE - RLS Setup
-- =============================================================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
-- Policy: Students can view their own notifications
CREATE POLICY "Students can view own notifications" ON public.notifications FOR
SELECT TO authenticated USING (
    student_user_id = public.get_auth_user_id()
    OR (
      SELECT role
      FROM users
      WHERE id = public.get_auth_user_id()
    ) = 'admin'
  );
-- Policy: Admins can view all notifications
CREATE POLICY "Admins can view all notifications" ON public.notifications FOR
SELECT TO authenticated USING (
    (
      SELECT role
      FROM users
      WHERE id = public.get_auth_user_id()
    ) = 'admin'
  );
-- Policy: Admins can insert notifications
CREATE POLICY "Admins can insert notifications" ON public.notifications FOR
INSERT TO authenticated WITH CHECK (
    (
      SELECT role
      FROM users
      WHERE id = public.get_auth_user_id()
    ) = 'admin'
  );
-- Policy: Students can update their own notification read status
CREATE POLICY "Students can update own notifications" ON public.notifications FOR
UPDATE TO authenticated USING (student_user_id = public.get_auth_user_id()) WITH CHECK (student_user_id = public.get_auth_user_id());
-- Policy: Admins can update all notifications
CREATE POLICY "Admins can update all notifications" ON public.notifications FOR
UPDATE TO authenticated USING (
    (
      SELECT role
      FROM users
      WHERE id = public.get_auth_user_id()
    ) = 'admin'
  ) WITH CHECK (
    (
      SELECT role
      FROM users
      WHERE id = public.get_auth_user_id()
    ) = 'admin'
  );
-- Policy: Admins can delete notifications
CREATE POLICY "Admins can delete notifications" ON public.notifications FOR DELETE TO authenticated USING (
  (
    SELECT role
    FROM users
    WHERE id = public.get_auth_user_id()
  ) = 'admin'
);
-- Policy: Allow service role (backend) full access
CREATE POLICY "Service role has full access to notifications" ON public.notifications TO service_role USING (true) WITH CHECK (true);
-- =============================================================================
-- 9. STUDENT_VIOLATION_ARCHIVES TABLE - RLS Setup
-- =============================================================================
ALTER TABLE public.student_violation_archives ENABLE ROW LEVEL SECURITY;
-- Policy: Admins can view all archived violations
CREATE POLICY "Admins can view archived violations" ON public.student_violation_archives FOR
SELECT TO authenticated USING (
    (
      SELECT role
      FROM users
      WHERE id = public.get_auth_user_id()
    ) = 'admin'
  );
-- Policy: Admins can insert archived violations
CREATE POLICY "Admins can insert archived violations" ON public.student_violation_archives FOR
INSERT TO authenticated WITH CHECK (
    (
      SELECT role
      FROM users
      WHERE id = public.get_auth_user_id()
    ) = 'admin'
  );
-- Policy: Admins can update archived violations
CREATE POLICY "Admins can update archived violations" ON public.student_violation_archives FOR
UPDATE TO authenticated USING (
    (
      SELECT role
      FROM users
      WHERE id = public.get_auth_user_id()
    ) = 'admin'
  ) WITH CHECK (
    (
      SELECT role
      FROM users
      WHERE id = public.get_auth_user_id()
    ) = 'admin'
  );
-- Policy: Admins can delete archived violations
CREATE POLICY "Admins can delete archived violations" ON public.student_violation_archives FOR DELETE TO authenticated USING (
  (
    SELECT role
    FROM users
    WHERE id = public.get_auth_user_id()
  ) = 'admin'
);
-- Policy: Allow service role (backend) full access
CREATE POLICY "Service role has full access to student_violation_archives" ON public.student_violation_archives TO service_role USING (true) WITH CHECK (true);
-- =============================================================================
-- 10. ARCHIVEHISTORY TABLE - RLS Setup
-- =============================================================================
ALTER TABLE public."ArchiveHistory" ENABLE ROW LEVEL SECURITY;
-- Policy: Admins can view archive history
CREATE POLICY "Admins can view archive history" ON public."ArchiveHistory" FOR
SELECT TO authenticated USING (
    (
      SELECT role
      FROM users
      WHERE id = public.get_auth_user_id()
    ) = 'admin'
  );
-- Policy: Admins can insert archive history
CREATE POLICY "Admins can insert archive history" ON public."ArchiveHistory" FOR
INSERT TO authenticated WITH CHECK (
    (
      SELECT role
      FROM users
      WHERE id = public.get_auth_user_id()
    ) = 'admin'
  );
-- Policy: Admins can update archive history
CREATE POLICY "Admins can update archive history" ON public."ArchiveHistory" FOR
UPDATE TO authenticated USING (
    (
      SELECT role
      FROM users
      WHERE id = public.get_auth_user_id()
    ) = 'admin'
  ) WITH CHECK (
    (
      SELECT role
      FROM users
      WHERE id = public.get_auth_user_id()
    ) = 'admin'
  );
-- Policy: Admins can delete archive history
CREATE POLICY "Admins can delete archive history" ON public."ArchiveHistory" FOR DELETE TO authenticated USING (
  (
    SELECT role
    FROM users
    WHERE id = public.get_auth_user_id()
  ) = 'admin'
);
-- Policy: Allow service role (backend) full access
CREATE POLICY "Service role has full access to ArchiveHistory" ON public."ArchiveHistory" TO service_role USING (true) WITH CHECK (true);
-- =============================================================================
-- Verification Query
-- =============================================================================
-- Run this to verify RLS is enabled on all tables:
-- SELECT schemaname, tablename, rowsecurity FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('users', 'Students', 'violations', 'student_violation_logs', 'Admins', 'audit_logs', 'SystemSettings', 'notifications', 'student_violation_archives', 'ArchiveHistory')
-- ORDER BY tablename;