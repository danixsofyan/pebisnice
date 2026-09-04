-- Limited application role so RLS is actually enforced (postgres bypasses it).
-- Idempotent. Run once, then point DATABASE_URL at this role.
-- Set the password before running.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pebisnice_app') THEN
    CREATE ROLE pebisnice_app LOGIN;
  END IF;
END $$;

ALTER ROLE pebisnice_app WITH LOGIN NOBYPASSRLS PASSWORD 'REPLACE_WITH_STRONG_PASSWORD';

GRANT USAGE ON SCHEMA public TO pebisnice_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO pebisnice_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO pebisnice_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO pebisnice_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO pebisnice_app;

-- Account / tenant-discovery / audit tables are read before tenant context is
-- set, or written cross-tenant by the system. Grant this role full access to
-- them only; anon/authenticated (PostgREST) stay policy-less = denied. Business
-- tables keep their per-tenant policy, which this role is subject to.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','accounts','sessions','"verificationTokens"','projects','team_members','audit_logs','order_links']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS app_full_access ON %s', t);
    EXECUTE format('CREATE POLICY app_full_access ON %s FOR ALL TO pebisnice_app USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;
