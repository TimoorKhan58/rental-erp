"use client";

import { ConfirmModal } from "@/components/design-system/modal";
import { useActivateUser, useDeactivateUser } from "../hooks";
import type { UserResponse } from "../types";

type ToggleUserStatusDialogProps = {
  user: UserResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ToggleUserStatusDialog({
  user,
  open,
  onOpenChange,
}: ToggleUserStatusDialogProps) {
  const activateMutation = useActivateUser();
  const deactivateMutation = useDeactivateUser();

  if (!user) {
    return null;
  }

  const nextActive = !user.isActive;
  const isLoading = activateMutation.isPending || deactivateMutation.isPending;

  const handleConfirm = async () => {
    if (nextActive) {
      await activateMutation.mutateAsync(user.id);
    } else {
      await deactivateMutation.mutateAsync(user.id);
    }
    onOpenChange(false);
  };

  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      title={nextActive ? "Activate user" : "Deactivate user"}
      description={
        nextActive
          ? `Activate "${user.name}"? They will be able to sign in again.`
          : `Deactivate "${user.name}"? They will be signed out and unable to sign in.`
      }
      confirmLabel={nextActive ? "Activate" : "Deactivate"}
      onConfirm={() => void handleConfirm()}
      isLoading={isLoading}
    />
  );
}
