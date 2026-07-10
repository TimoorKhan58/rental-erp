import type { ExpenseCategory } from "@/modules/expense/domain/expense-category.entity";
import type { AuditValues } from "@/shared/infrastructure/audit/audit-logger.interface";

export function toExpenseCategoryAuditValues(
  category: ExpenseCategory,
): AuditValues {
  const props = category.toProps();

  return {
    id: props.id,
    name: props.name,
    description: props.description,
    isActive: props.isActive,
  };
}
