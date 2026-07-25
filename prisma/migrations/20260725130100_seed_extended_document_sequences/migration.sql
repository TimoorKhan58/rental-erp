-- Seed sequences for newly added document types (idempotent).
INSERT INTO "document_sequences" (
    "id",
    "companySettingId",
    "documentType",
    "prefix",
    "startingNumber",
    "currentNumber",
    "paddingLength",
    "createdAt",
    "updatedAt"
)
SELECT
    gen_random_uuid(),
    cs.id,
    v.document_type::"DocumentType",
    v.prefix,
    1,
    1,
    5,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "company_settings" cs
CROSS JOIN (
    VALUES
        ('SUPPLIER', 'SUP-'),
        ('WAREHOUSE', 'WH-'),
        ('PURCHASE_ORDER', 'PO-'),
        ('RETURN', 'RET-'),
        ('MAINTENANCE', 'MNT-')
) AS v(document_type, prefix)
WHERE cs."isActive" = true
  AND NOT EXISTS (
    SELECT 1
    FROM "document_sequences" ds
    WHERE ds."companySettingId" = cs.id
      AND ds."documentType" = v.document_type::"DocumentType"
  );
