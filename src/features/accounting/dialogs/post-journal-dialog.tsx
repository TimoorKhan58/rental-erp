"use client";

import { ConfirmModal } from "@/components/design-system/modal";
import { usePostJournalEntry } from "../hooks";
import type { JournalEntryResponse } from "../types";

type PostJournalDialogProps = {
  journal: JournalEntryResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PostJournalDialog({
  journal,
  open,
  onOpenChange,
}: PostJournalDialogProps) {
  const postMutation = usePostJournalEntry();

  if (!journal) {
    return null;
  }

  const handleConfirm = async () => {
    await postMutation.mutateAsync(journal.id);
    onOpenChange(false);
  };

  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      title="Post journal entry"
      description={`Post "${journal.journalNumber}"? Posted entries will affect financial reports and account balances.`}
      confirmLabel="Post journal"
      onConfirm={() => void handleConfirm()}
      isLoading={postMutation.isPending}
    />
  );
}
