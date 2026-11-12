-- SaaS phase 2: a row may only reference rows of its own organization.
--
-- Foreign keys alone allow a row of business B to point at a customer,
-- product, warehouse, user, ... of business A. This adds one generic check
-- function and, on every per-business table, a trigger listing its
-- foreign-key columns that point at other per-business tables. Inserts and
-- updates that reference another organization's row are rejected.
--
-- Triggers run inside the writing transaction (so rows created earlier in
-- the same transaction are visible) and also cover raw SQL. Existing rows
-- are not re-checked; at the time of this migration all rows belong to the
-- first organization.

CREATE OR REPLACE FUNCTION rentcore_assert_same_organization()
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
      EXECUTE format(
        'SELECT "organizationId" FROM %I WHERE %I::text = $1',
        ref_table,
        ref_column
      ) INTO ref_organization USING fk_value;

      IF ref_organization IS NOT NULL AND ref_organization <> NEW."organizationId" THEN
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
  source record;
BEGIN
  FOR source IN
    WITH tenant_tables AS (
      SELECT c.table_name
      FROM information_schema.columns c
      WHERE c.table_schema = 'public' AND c.column_name = 'organizationId'
    ),
    references_by_table AS (
      SELECT
        src.relname AS table_name,
        string_agg(
          format('%L, %L, %L', a.attname, ref.relname, af.attname),
          ', ' ORDER BY a.attname
        ) AS trigger_args
      FROM pg_constraint con
      JOIN pg_class src ON src.oid = con.conrelid
      JOIN pg_class ref ON ref.oid = con.confrelid
      JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = con.conkey[1]
      JOIN pg_attribute af ON af.attrelid = con.confrelid AND af.attnum = con.confkey[1]
      WHERE con.contype = 'f'
        AND con.connamespace = 'public'::regnamespace
        AND array_length(con.conkey, 1) = 1
        AND a.attname <> 'organizationId'
        AND src.relname IN (SELECT table_name FROM tenant_tables)
        AND ref.relname IN (SELECT table_name FROM tenant_tables)
      GROUP BY src.relname
    )
    SELECT table_name, trigger_args FROM references_by_table
  LOOP
    EXECUTE format(
      'CREATE TRIGGER rentcore_same_organization BEFORE INSERT OR UPDATE ON %I '
      'FOR EACH ROW EXECUTE FUNCTION rentcore_assert_same_organization(%s)',
      source.table_name,
      source.trigger_args
    );
  END LOOP;
END;
$$;
