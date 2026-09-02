-- Phase 61 — F-09: enforce repairs.returnInspectionItemId → return_inspection_items.id
--
-- Pre-migration orphan audit (must return 0 before apply):
-- SELECT COUNT(*) FROM repairs r
-- LEFT JOIN return_inspection_items rii ON rii.id = r."returnInspectionItemId"
-- WHERE rii.id IS NULL;

ALTER TABLE "repairs" ADD CONSTRAINT "repairs_returnInspectionItemId_fkey" FOREIGN KEY ("returnInspectionItemId") REFERENCES "return_inspection_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
