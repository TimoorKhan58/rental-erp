-- SaaS phase 2c: a database-level lock so one business can never read or
-- write another business's rows, even through hand-written SQL.
--
-- How it works
--   * The app's connections identify themselves with the startup setting
--     rentcore.app=on (see src/shared/config/database.config.ts).
--   * Before each query the app sets rentcore.organization_id (or
--     rentcore.system=on for pre-login/platform code) for that transaction
--     only (set_config(..., true)).
--   * Every per-business table gets row-level security, forced also for the
--     table owner. On app connections a row is visible/writable only when its
--     organizationId matches the current business. If the app forgot to set
--     a business, nothing is visible (fails closed).
--   * Connections that are not the app (migrations, pg_dump, psql, the seed)
--     are not restricted, so maintenance keeps working.
--     NOTE: pg_dump must run with --enable-row-security (scripts/db/backup.*).
--
-- organizationId defaults
--   The phase-1 default (always the first business) is replaced by the
--   current business of the transaction. On app connections with no
--   business set the default is NULL, so a write that missed its business
--   fails on NOT NULL instead of silently landing in the first business.
--   Non-app connections keep defaulting to the first business.
--
-- Every name is schema-qualified: pg_dump and restores run with an empty
-- search_path, and the policies must still evaluate there.
--
-- Rollback: see docs/production/DATABASE_OPERATIONS.md ("Row-level security").

CREATE OR REPLACE FUNCTION public.rentcore_is_app_connection()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce(current_setting('rentcore.app', true), '') = 'on'
$$;

CREATE OR REPLACE FUNCTION public.rentcore_current_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN NOT public.rentcore_is_app_connection()
      THEN '00000000-0000-4000-8000-000000000001'::uuid
    ELSE nullif(current_setting('rentcore.organization_id', true), '')::uuid
  END
$$;

CREATE OR REPLACE FUNCTION public.rentcore_row_allowed(row_organization uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN NOT public.rentcore_is_app_connection() THEN true
    WHEN coalesce(current_setting('rentcore.system', true), '') = 'on' THEN true
    ELSE row_organization = nullif(current_setting('rentcore.organization_id', true), '')::uuid
  END
$$;

-- The phase-2 same-business trigger treated "referenced row not found" as
-- fine. With row-level security another business's row is invisible here
-- (while the foreign key itself still sees it), so "not visible" must be
-- refused too. A truly missing row would fail the foreign key anyway.
CREATE OR REPLACE FUNCTION public.rentcore_assert_same_organization()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  i integer;
  fk_column text;
  ref_table text;
  ref_column text;
  fk_value text;
  ref_organization uuid;
BEGIN
  FOR i IN 0 .. (TG_NARGS / 3) - 1 LOOP
    fk_column := TG_ARGV[i * 3];
    ref_table := TG_ARGV[i * 3 + 1];
    ref_column := TG_ARGV[i * 3 + 2];

    EXECUTE format('SELECT ($1).%I::text', fk_column) INTO fk_value USING NEW;

    IF fk_value IS NOT NULL THEN
      ref_organization := NULL;
      EXECUTE format(
        'SELECT "organizationId" FROM %I.%I WHERE %I::text = $1',
        TG_TABLE_SCHEMA,
        ref_table,
        ref_column
      ) INTO ref_organization USING fk_value;

      IF ref_organization IS DISTINCT FROM NEW."organizationId" THEN
        RAISE EXCEPTION 'RENTCORE_CROSS_ORGANIZATION_REFERENCE: %.% references a % row of another organization',
          TG_TABLE_NAME, fk_column, ref_table
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DO $$
DECLARE
  tenant record;
  table_count integer := 0;
BEGIN
  FOR tenant IN
    SELECT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND c.column_name = 'organizationId'
      AND t.table_type = 'BASE TABLE'
    ORDER BY c.table_name
  LOOP
    EXECUTE format(
      'ALTER TABLE %I ALTER COLUMN "organizationId" SET DEFAULT public.rentcore_current_organization_id()',
      tenant.table_name
    );
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tenant.table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tenant.table_name);
    EXECUTE format('DROP POLICY IF EXISTS rentcore_organization_isolation ON %I', tenant.table_name);
    EXECUTE format(
      'CREATE POLICY rentcore_organization_isolation ON %I
         USING (public.rentcore_row_allowed("organizationId"))
         WITH CHECK (public.rentcore_row_allowed("organizationId"))',
      tenant.table_name
    );
    table_count := table_count + 1;
  END LOOP;

  IF table_count <> 49 THEN
    RAISE EXCEPTION 'Expected 49 per-business tables, found %', table_count;
  END IF;
END;
$$;
