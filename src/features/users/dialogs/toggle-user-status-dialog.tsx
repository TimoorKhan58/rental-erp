"use client";

import { ConfirmModal } from "@/components/design-system/modal";
import { useToggleUserStatus } from "../hooks";
import type { IdentityUserResponse } from "../types";

type ToggleUserStatusDialogProps = {
  user: IdentityUserResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ToggleUserStatusDialog({
  user,
  open,
  onOpenChange,
}: ToggleUserStatusDialogProps) {
  const toggleMutation = useToggleUserStatus();

  if (!user) {
    return null;
  }

  const nextActive = !user.isActive;

  const handleConfirm = async () => {
    await toggleMutation.mutateAsync({ id: user.id, isActive: nextActive });
    onOpenChange(false);
  };

  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      title={nextActive ? "Enable user" : "Disable user"}
      description={
        nextActive
          ? `Enable "${user.name}"? They will be able to sign in again.`
          : `Disable "${user.name}"? Their active sessions will be revoked and they will not be able to use protected APIs.`
      }
      confirmLabel={nextActive ? "Enable" : "Disable"}
      onConfirm={() => void handleConfirm()}
      isLoading={toggleMutation.isPending}
    />
  );
}
