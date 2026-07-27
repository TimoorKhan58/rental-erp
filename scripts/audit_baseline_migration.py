"""
Audit prisma/migrations/0_baseline/migration.sql against prisma/schema.prisma.
Read-only — no DB access.
"""
from __future__ import annotations

import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = ROOT / "prisma" / "schema.prisma"
MIGRATION = ROOT / "prisma" / "migrations" / "0_baseline" / "migration.sql"

ON_DELETE_MAP = {
    "Restrict": "RESTRICT",
    "Cascade": "CASCADE",
    "SetNull": "SET NULL",
    "NoAction": "NO ACTION",
}
ON_UPDATE_MAP = ON_DELETE_MAP.copy()


@dataclass
class Field:
    name: str
    type_base: str
    optional: bool
    is_list: bool
    is_object_relation: bool
    column: str
    is_id: bool = False
    is_unique: bool = False
    default: str | None = None
    db_type: str | None = None
    fk_ref_model: str | None = None
    fk_ref_field: str | None = None
    on_delete: str | None = None
    on_update: str | None = None


@dataclass
class Model:
    name: str
    table: str
    fields: list[Field] = field(default_factory=list)
    indexes: list[list[str]] = field(default_factory=list)
    uniques: list[list[str]] = field(default_factory=list)
    composite_id: list[str] | None = None


@dataclass
class Enum:
    name: str
    values: list[str]


def strip_comments(text: str) -> str:
    lines = []
    for line in text.splitlines():
        if line.strip().startswith("//"):
            continue
        lines.append(re.sub(r"//.*$", "", line))
    return "\n".join(lines)


def parse_schema(text: str) -> tuple[dict[str, Model], dict[str, Enum]]:
    text = strip_comments(text)
    enums: dict[str, Enum] = {}
    models: dict[str, Model] = {}

    for m in re.finditer(r"enum\s+(\w+)\s*\{([^}]*)\}", text, re.S):
        values = [v.strip() for v in re.findall(r"^\s*(\w+)\s*$", m.group(2), re.M)]
        enums[m.group(1)] = Enum(name=m.group(1), values=values)

    model_names = set(re.findall(r"model\s+(\w+)\s*\{", text))

    for m in re.finditer(r"model\s+(\w+)\s*\{([^}]*)\}", text, re.S):
        name = m.group(1)
        body = m.group(2)
        table = re.search(r'@@map\("([^"]+)"\)', body)
        table_name = table.group(1) if table else name
        model = Model(name=name, table=table_name)

        for line in [ln.strip() for ln in body.splitlines() if ln.strip()]:
            if line.startswith("@@"):
                if (idx := re.search(r"@@index\(\[([^\]]+)\]", line)):
                    model.indexes.append([c.strip() for c in idx.group(1).split(",")])
                if (uni := re.search(r"@@unique\(\[([^\]]+)\]", line)):
                    model.uniques.append([c.strip() for c in uni.group(1).split(",")])
                if (cid := re.search(r"@@id\(\[([^\]]+)\]", line)):
                    model.composite_id = [c.strip() for c in cid.group(1).split(",")]
                continue

            fm = re.match(r"(\w+)\s+([\w\?\[\]]+)(.*)", line)
            if not fm:
                continue
            fname, ftype, rest = fm.group(1), fm.group(2), fm.group(3)
            optional = ftype.endswith("?")
            is_list = "[]" in ftype
            type_base = ftype.replace("?", "").replace("[]", "")

            rel = re.search(r"@relation\(([^)]*)\)", rest)
            rel_body = rel.group(1) if rel else ""
            has_relation_fields = bool(re.search(r"fields:\s*\[", rel_body))
            # Prisma puts fields:/references: on the object side; DB columns are the *Id fields.
            is_object_relation = type_base in model_names and (
                has_relation_fields or is_list or not fname.endswith("Id")
            )

            mapped = re.search(r'@map\("([^"]+)"\)', rest)
            column = mapped.group(1) if mapped else fname

            fk_ref_model = fk_ref_field = on_delete = on_update = None

            default = None
            if (dm := re.search(r"@default\(([^)]+)\)", rest)):
                default = dm.group(1)

            db_type = None
            if (dbm := re.search(r"@db\.(\w+(?:\([^)]*\))?)", rest)):
                db_type = dbm.group(1)

            model.fields.append(
                Field(
                    name=fname,
                    type_base=type_base,
                    optional=optional,
                    is_list=is_list,
                    is_object_relation=is_object_relation,
                    column=column,
                    is_id="@id" in rest,
                    is_unique="@unique" in rest,
                    default=default,
                    db_type=db_type,
                    fk_ref_model=fk_ref_model,
                    fk_ref_field=fk_ref_field,
                    on_delete=on_delete,
                    on_update=on_update,
                )
            )
        models[name] = model
    return models, enums


def col_name(model: Model, field_name: str) -> str:
    f = next((x for x in model.fields if x.name == field_name), None)
    return f.column if f else field_name


def parse_sql(text: str) -> dict:
    enums: dict[str, list[str]] = {}
    tables: dict[str, dict] = {}
    fks: list[dict] = []
    indexes: list[dict] = []
    uniques: list[dict] = []

    for m in re.finditer(r'CREATE TYPE "([^"]+)" AS ENUM \(([^)]+)\);', text):
        enums[m.group(1)] = [v.strip().strip("'") for v in m.group(2).split(",")]

    for m in re.finditer(r'CREATE TABLE "([^"]+)" \((.*?)\n\);', text, re.S):
        tname, body = m.group(1), m.group(2)
        cols: dict[str, str] = {}
        pk: list[str] = []
        inline_uniques: list[list[str]] = []

        for raw in body.split(",\n"):
            line = raw.strip()
            if not line:
                continue
            if line.startswith("CONSTRAINT "):
                if "PRIMARY KEY" in line:
                    pk = re.findall(r'"([^"]+)"', line.split("PRIMARY KEY", 1)[1])
                elif "UNIQUE" in line and "FOREIGN KEY" not in line:
                    um = re.search(r"UNIQUE \(([^)]+)\)", line)
                    if um:
                        inline_uniques.append(re.findall(r'"([^"]+)"', um.group(1)))
                continue
            cm = re.match(r'"([^"]+)"\s+(.+)', line)
            if cm:
                cols[cm.group(1)] = cm.group(2).strip()

        tables[tname] = {"columns": cols, "pk": pk, "inline_uniques": inline_uniques}

    for m in re.finditer(
        r'ALTER TABLE "([^"]+)" ADD CONSTRAINT "[^"]+" FOREIGN KEY \("([^"]+)"\) REFERENCES "([^"]+)"\("([^"]+)"\) ON DELETE (\w+(?:\s+\w+)?) ON UPDATE (\w+);',
        text,
    ):
        fks.append(
            {
                "table": m.group(1),
                "column": m.group(2),
                "ref_table": m.group(3),
                "ref_column": m.group(4),
                "on_delete": m.group(5).upper().replace("  ", " "),
                "on_update": m.group(6).upper(),
            }
        )

    for m in re.finditer(r'CREATE UNIQUE INDEX "[^"]+" ON "([^"]+)"\(([^)]+)\);', text):
        uniques.append(
            {
                "table": m.group(1),
                "columns": [c.strip().strip('"') for c in m.group(2).split(",")],
            }
        )
    for m in re.finditer(r'CREATE INDEX "[^"]+" ON "([^"]+)"\(([^)]+)\);', text):
        indexes.append(
            {
                "table": m.group(1),
                "columns": [c.strip().strip('"') for c in m.group(2).split(",")],
            }
        )

    return {"enums": enums, "tables": tables, "fks": fks, "indexes": indexes, "uniques": uniques}


def scalar_fields(model: Model) -> list[Field]:
    return [f for f in model.fields if not f.is_object_relation]


def build_fk_expectations(models: dict[str, Model], schema_text: str) -> list[dict]:
    expectations: list[dict] = []
    model_names = set(models.keys())
    for model in models.values():
        body_m = re.search(rf"model\s+{model.name}\s*\{{([^}}]*)\}}", schema_text, re.S)
        if not body_m:
            continue
        for line in [ln.strip() for ln in body_m.group(1).splitlines() if ln.strip() and not ln.strip().startswith("//")]:
            if line.startswith("@@"):
                continue
            fm = re.match(r"(\w+)\s+([\w\?\[\]]+)(.*)", line)
            if not fm:
                continue
            fname, ftype, rest = fm.group(1), fm.group(2), fm.group(3)
            type_base = ftype.replace("?", "").replace("[]", "")
            if type_base not in model_names:
                continue
            rel = re.search(r"@relation\(([^)]*)\)", rest)
            if not rel or not re.search(r"fields:\s*\[", rel.group(1)):
                continue
            rbody = rel.group(1)
            fk_cols = [c.strip() for c in re.search(r"fields:\s*\[([^\]]+)\]", rbody).group(1).split(",")]
            ref_cols = [c.strip() for c in re.search(r"references:\s*\[([^\]]+)\]", rbody).group(1).split(",")]
            odm = re.search(r"onDelete:\s*(\w+)", rbody)
            oum = re.search(r"onUpdate:\s*(\w+)", rbody)
            on_delete = odm.group(1) if odm else "Restrict"
            on_update = oum.group(1) if oum else "Cascade"
            ref_model = models[type_base]
            for fk_name, ref_name in zip(fk_cols, ref_cols):
                fk_field = next((x for x in model.fields if x.name == fk_name), None)
                ref_field = next((x for x in ref_model.fields if x.name == ref_name), None)
                expectations.append(
                    {
                        "table": model.table,
                        "column": fk_field.column if fk_field else fk_name,
                        "ref_table": ref_model.table,
                        "ref_column": ref_field.column if ref_field else ref_name,
                        "on_delete": ON_DELETE_MAP.get(on_delete, on_delete.upper()),
                        "on_update": ON_UPDATE_MAP.get(on_update, on_update.upper()),
                    }
                )
    return expectations


def main() -> int:
    schema_text = SCHEMA.read_text(encoding="utf-8")
    sql_text = MIGRATION.read_text(encoding="utf-8")
    models, schema_enums = parse_schema(schema_text)
    sql = parse_sql(sql_text)
    model_by_name = models

    missing: list[str] = []
    warnings: list[str] = []
    unsupported: list[str] = []

    expected_tables = {m.table for m in models.values()}
    actual_tables = set(sql["tables"])

    for t in sorted(expected_tables - actual_tables):
        missing.append(f"TABLE: {t}")
    for t in sorted(actual_tables - expected_tables):
        warnings.append(f"EXTRA TABLE in SQL: {t}")

    for ename, einfo in schema_enums.items():
        if ename not in sql["enums"]:
            missing.append(f"ENUM: {ename}")
        elif sql["enums"][ename] != einfo.values:
            missing.append(f"ENUM values mismatch: {ename}")

    for model in models.values():
        if model.table not in sql["tables"]:
            continue
        cols = sql["tables"][model.table]["columns"]

        for f in scalar_fields(model):
            if f.column not in cols:
                missing.append(f"COLUMN: {model.table}.{f.column} (model {model.name}.{f.name})")
                continue
            cdef = cols[f.column]
            if not f.optional and "NOT NULL" not in cdef and not f.is_id and f.name not in (model.composite_id or []):
                if f.column not in sql["tables"][model.table]["pk"]:
                    warnings.append(f"NULLABILITY: {model.table}.{f.column} expected NOT NULL")

            if f.db_type and "Uuid" in f.db_type and "UUID" not in cdef:
                warnings.append(f"TYPE: {model.table}.{f.column} expected UUID")
            if f.db_type and f.db_type.startswith("Decimal") and "DECIMAL" not in cdef:
                warnings.append(f"TYPE: {model.table}.{f.column} expected DECIMAL")

            if f.default == "now()" and "CURRENT_TIMESTAMP" not in cdef:
                warnings.append(f"DEFAULT: {model.table}.{f.column} expected CURRENT_TIMESTAMP")
            if f.default in ("true", "false") and f.default not in cdef.lower():
                warnings.append(f"DEFAULT: {model.table}.{f.column} expected {f.default}")
            if f.default and f.default.startswith('"') and f.default.strip('"') not in cdef:
                warnings.append(f"DEFAULT: {model.table}.{f.column} schema={f.default}")
            if f.default and f.default in schema_enums and f"'{f.default}'" not in cdef:
                warnings.append(f"DEFAULT enum: {model.table}.{f.column}={f.default}")

        if model.composite_id:
            pk = sql["tables"][model.table]["pk"]
            expected_pk = [col_name(model, n) for n in model.composite_id]
            if sorted(pk) != sorted(expected_pk):
                missing.append(f"COMPOSITE PK: {model.table} sql={pk} schema={expected_pk}")

        for f in scalar_fields(model):
            if f.is_unique:
                found = any(u["table"] == model.table and u["columns"] == [f.column] for u in sql["uniques"])
                if not found:
                    missing.append(f"@unique: {model.table}.{f.column}")

        for ucols in model.uniques:
            mapped = [col_name(model, c) for c in ucols]
            found = any(u["table"] == model.table and u["columns"] == mapped for u in sql["uniques"])
            if not found:
                missing.append(f"@@unique: {model.table} {mapped}")

        for icols in model.indexes:
            mapped = [col_name(model, c) for c in icols]
            found = any(i["table"] == model.table and i["columns"] == mapped for i in sql["indexes"])
            if not found:
                missing.append(f"@@index: {model.table} {mapped}")

    fk_expected = build_fk_expectations(models, schema_text)
    for exp in fk_expected:
        match = [
            fk
            for fk in sql["fks"]
            if fk["table"] == exp["table"]
            and fk["column"] == exp["column"]
            and fk["ref_table"] == exp["ref_table"]
            and fk["ref_column"] == exp["ref_column"]
        ]
        if not match:
            missing.append(
                f"FK: {exp['table']}.{exp['column']} -> {exp['ref_table']}.{exp['ref_column']}"
            )
        else:
            fk = match[0]
            if fk["on_delete"] != exp["on_delete"]:
                warnings.append(
                    f"onDelete {exp['table']}.{exp['column']}: schema={exp['on_delete']} sql={fk['on_delete']}"
                )
            if fk["on_update"] != exp["on_update"]:
                warnings.append(
                    f"onUpdate {exp['table']}.{exp['column']}: schema={exp['on_update']} sql={fk['on_update']}"
                )

    if "CREATE EXTENSION" in sql_text:
        unsupported.append("CREATE EXTENSION present in baseline SQL")

  # Report
    print("=" * 72)
    print("PHASE 2 — BASELINE MIGRATION AUDIT REPORT")
    print("=" * 72)
    print(f"Migration: prisma/migrations/0_baseline/migration.sql")
    print(f"Generated: prisma migrate diff --from-empty --to-schema prisma/schema.prisma")
    print(f"Size: {len(sql_text):,} bytes / {len(sql_text.splitlines()):,} lines")
    print()
    print("SUMMARY COUNTS")
    print("-" * 40)
    print(f"Total tables (schema):           {len(expected_tables)}")
    print(f"Total tables (SQL CREATE TABLE): {len(actual_tables)}")
    print(f"Total enums (schema):            {len(schema_enums)}")
    print(f"Total enums (SQL CREATE TYPE):   {len(sql['enums'])}")
    print(f"Total models (schema):           {len(models)}")
    print(f"Total indexes (SQL):             {len(sql['indexes'])}")
    print(f"Total unique constraints (SQL):  {len(sql['uniques'])}")
    print(f"Total FK constraints (SQL):      {len(sql['fks'])}")
    print(f"Scalar FK relations (schema):    {len(fk_expected)}")
    print()
    print("CRITICAL TABLES (previously missing from history)")
    print("-" * 40)
    for t in ["products", "customers", "suppliers", "inventory", "company_settings", "users", "audit_logs"]:
        status = "PRESENT" if t in actual_tables else "MISSING"
        print(f"  [{status}] {t}")
    print()
    if missing:
        print(f"MISSING OBJECTS ({len(missing)})")
        for x in missing:
            print(f"  - {x}")
    else:
        print("MISSING OBJECTS: none")
    print()
    if warnings:
        print(f"WARNINGS ({len(warnings)})")
        for x in warnings[:50]:
            print(f"  - {x}")
        if len(warnings) > 50:
            print(f"  ... and {len(warnings) - 50} more")
    else:
        print("WARNINGS: none")
    print()
    if unsupported:
        print(f"UNSUPPORTED SQL ({len(unsupported)})")
        for x in unsupported:
            print(f"  - {x}")
    else:
        print("UNSUPPORTED SQL: none")
    print()
    print(f"AUDIT VERDICT: {'PASS' if not missing else 'FAIL'}")
    print("=" * 72)
    return 1 if missing else 0


if __name__ == "__main__":
    sys.exit(main())
