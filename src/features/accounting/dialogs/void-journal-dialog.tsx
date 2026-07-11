"use client";

import { ConfirmModal } from "@/components/design-system/modal";
import { useVoidJournalEntry } from "../hooks";
import type { JournalEntryResponse } from "../types";

type VoidJournalDialogProps = {
  journal: JournalEntryResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVoided?: () => void;
};

export function VoidJournalDialog({
  journal,
  open,
  onOpenChange,
  onVoided,
}: VoidJournalDialogProps) {
  const voidMutation = useVoidJournalEntry();

  if (!journal) {
    return null;
  }

  const handleConfirm = async () => {
    await voidMutation.mutateAsync(journal.id);
    onOpenChange(false);
    onVoided?.();
  };

  const description =
    journal.status === "POSTED"
      ? `Void "${journal.journalNumber}"? This will reverse the posted journal entry.`
      : `Void "${journal.journalNumber}"? This will cancel the draft journal entry.`;

  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      title="Void journal entry"
      description={description}
      confirmLabel="Void journal"
      onConfirm={() => void handleConfirm()}
      isLoading={voidMutation.isPending}
    />
  );
}
