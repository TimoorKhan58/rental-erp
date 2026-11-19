-- Speed up the same-business check on every insert/update (QA huge-data run).
--
-- rentcore_assert_same_organization() looked the referenced row up with
-- `WHERE "id"::text = $1`. Casting the column to text stops PostgreSQL from
-- using the primary-key index, so every new order line read every order,
-- every payment read every invoice, and so on. With 10,000 orders one check
-- took ~9 ms instead of ~0.2 ms, and it keeps growing with the business.
--
-- Same rule, same error, same "not visible counts as another business"
-- behaviour as before (20261118100000). Only the lookup changes: it compares
-- the referenced column with NEW's value in its own type, so the index is used.
-- A foreign key always has the same type on both sides.
CREATE OR REPLACE FUNCTION public.rentcore_assert_same_organization()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  i integer;
  fk_column text;
  ref_table text;
  ref_column text;
  fk_is_null boolean;
  ref_organization uuid;
BEGIN
  FOR i IN 0 .. (TG_NARGS / 3) - 1 LOOP
    fk_column := TG_ARGV[i * 3];
    ref_table := TG_ARGV[i * 3 + 1];
    ref_column := TG_ARGV[i * 3 + 2];

    EXECUTE format('SELECT ($1).%I IS NULL', fk_column) INTO fk_is_null USING NEW;

    IF NOT fk_is_null THEN
      ref_organization := NULL;
      EXECUTE format(
        'SELECT "organizationId" FROM %I.%I WHERE %I = ($1).%I',
        TG_TABLE_SCHEMA,
        ref_table,
        ref_column,
        fk_column
      ) INTO ref_organization USING NEW;

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
