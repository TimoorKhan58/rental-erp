"use client";

import { ConfirmModal } from "@/components/design-system/modal";

type ExportUnavailableDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ExportUnavailableDialog({
  open,
  onOpenChange,
}: ExportUnavailableDialogProps) {
  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      title="Export unavailable"
      description="PDF, Excel, and CSV export endpoints are not available yet. Report data can be viewed and filtered in the UI."
      confirmLabel="Got it"
      onConfirm={() => onOpenChange(false)}
    />
  );
}
