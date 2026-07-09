import type { Account } from "@/modules/accounting/domain/account.entity";

export function toAccountAuditValues(
  account: Account,
): Record<string, unknown> {
  const props = account.toProps();

  return {
    id: props.id,
    accountCode: props.accountCode,
    name: props.name,
    accountType: props.accountType,
    description: props.description,
    isActive: props.isActive,
  };
}
