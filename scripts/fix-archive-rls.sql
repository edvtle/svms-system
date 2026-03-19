-- Idempotent patch for Supabase linter error: rls_disabled_in_public
-- Targets:
--   - public.student_violation_archives
--   - public."ArchiveHistory"
ALTER TABLE public.student_violation_archives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ArchiveHistory" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (
  SELECT 1
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'student_violation_archives'
    AND policyname = 'Admins can view archived violations'
) THEN CREATE POLICY "Admins can view archived violations" ON public.student_violation_archives FOR
SELECT TO authenticated USING (
    (
      SELECT role
      FROM users
      WHERE id = public.get_auth_user_id()
    ) = 'admin'
  );
END IF;
IF NOT EXISTS (
  SELECT 1
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'student_violation_archives'
    AND policyname = 'Admins can insert archived violations'
) THEN CREATE POLICY "Admins can insert archived violations" ON public.student_violation_archives FOR
INSERT TO authenticated WITH CHECK (
    (
      SELECT role
      FROM users
      WHERE id = public.get_auth_user_id()
    ) = 'admin'
  );
END IF;
IF NOT EXISTS (
  SELECT 1
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'student_violation_archives'
    AND policyname = 'Admins can update archived violations'
) THEN CREATE POLICY "Admins can update archived violations" ON public.student_violation_archives FOR
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
END IF;
IF NOT EXISTS (
  SELECT 1
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'student_violation_archives'
    AND policyname = 'Admins can delete archived violations'
) THEN CREATE POLICY "Admins can delete archived violations" ON public.student_violation_archives FOR DELETE TO authenticated USING (
  (
    SELECT role
    FROM users
    WHERE id = public.get_auth_user_id()
  ) = 'admin'
);
END IF;
IF NOT EXISTS (
  SELECT 1
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'student_violation_archives'
    AND policyname = 'Service role has full access to student_violation_archives'
) THEN CREATE POLICY "Service role has full access to student_violation_archives" ON public.student_violation_archives TO service_role USING (true) WITH CHECK (true);
END IF;
END $$;
DO $$ BEGIN IF NOT EXISTS (
  SELECT 1
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'ArchiveHistory'
    AND policyname = 'Admins can view archive history'
) THEN CREATE POLICY "Admins can view archive history" ON public."ArchiveHistory" FOR
SELECT TO authenticated USING (
    (
      SELECT role
      FROM users
      WHERE id = public.get_auth_user_id()
    ) = 'admin'
  );
END IF;
IF NOT EXISTS (
  SELECT 1
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'ArchiveHistory'
    AND policyname = 'Admins can insert archive history'
) THEN CREATE POLICY "Admins can insert archive history" ON public."ArchiveHistory" FOR
INSERT TO authenticated WITH CHECK (
    (
      SELECT role
      FROM users
      WHERE id = public.get_auth_user_id()
    ) = 'admin'
  );
END IF;
IF NOT EXISTS (
  SELECT 1
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'ArchiveHistory'
    AND policyname = 'Admins can update archive history'
) THEN CREATE POLICY "Admins can update archive history" ON public."ArchiveHistory" FOR
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
END IF;
IF NOT EXISTS (
  SELECT 1
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'ArchiveHistory'
    AND policyname = 'Admins can delete archive history'
) THEN CREATE POLICY "Admins can delete archive history" ON public."ArchiveHistory" FOR DELETE TO authenticated USING (
  (
    SELECT role
    FROM users
    WHERE id = public.get_auth_user_id()
  ) = 'admin'
);
END IF;
IF NOT EXISTS (
  SELECT 1
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'ArchiveHistory'
    AND policyname = 'Service role has full access to ArchiveHistory'
) THEN CREATE POLICY "Service role has full access to ArchiveHistory" ON public."ArchiveHistory" TO service_role USING (true) WITH CHECK (true);
END IF;
END $$;
-- Optional verification:
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
--   AND tablename IN ('student_violation_archives', 'ArchiveHistory')
-- ORDER BY tablename;