"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AppButton } from "@/components/design-system/button";

type MarkAllReadDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending?: boolean;
};

export function MarkAllReadDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending = false,
}: MarkAllReadDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark all as read?</DialogTitle>
          <DialogDescription>
            This will mark every unread notification in your inbox as read.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <AppButton
            variant="outline"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </AppButton>
          <AppButton
            disabled={isPending}
            loading={isPending}
            onClick={onConfirm}
          >
            Mark all read
          </AppButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
