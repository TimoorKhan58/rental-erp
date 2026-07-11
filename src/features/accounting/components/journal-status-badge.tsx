import { SemanticBadge } from "@/components/design-system/badge";
import type { JournalEntryStatus } from "../types";
import { JOURNAL_STATUS_LABELS } from "../mappers";

type JournalStatusBadgeProps = {
  status: JournalEntryStatus;
};

const statusSemantic: Record<
  JournalEntryStatus,
  "draft" | "pending" | "success" | "warning" | "inactive"
> = {
  DRAFT: "draft",
  POSTED: "success",
  VOID: "inactive",
};

export function JournalStatusBadge({ status }: JournalStatusBadgeProps) {
  return (
    <SemanticBadge semantic={statusSemantic[status]}>
      {JOURNAL_STATUS_LABELS[status]}
    </SemanticBadge>
  );
}
