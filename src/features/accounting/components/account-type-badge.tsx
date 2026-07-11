import { SemanticBadge } from "@/components/design-system/badge";
import type { AccountType } from "../types";
import { ACCOUNT_TYPE_LABELS } from "../mappers";

type AccountTypeBadgeProps = {
  accountType: AccountType;
};

const typeSemantic: Record<
  AccountType,
  "draft" | "pending" | "success" | "warning" | "inactive"
> = {
  ASSET: "success",
  LIABILITY: "warning",
  EQUITY: "pending",
  INCOME: "success",
  EXPENSE: "inactive",
};

export function AccountTypeBadge({ accountType }: AccountTypeBadgeProps) {
  return (
    <SemanticBadge semantic={typeSemantic[accountType]}>
      {ACCOUNT_TYPE_LABELS[accountType]}
    </SemanticBadge>
  );
}
