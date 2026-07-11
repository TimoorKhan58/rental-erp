"use client";

import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AppButton } from "@/components/design-system/button";
import { statusIcons } from "@/components/design-system/icons";
import { cn } from "@/lib/utils";

export type ModalSize = "sm" | "md" | "lg" | "xl" | "full";

const sizeClasses: Record<ModalSize, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-2xl",
  full: "h-[calc(100%-2rem)] w-[calc(100%-2rem)] max-w-none sm:max-w-none",
};

type BaseModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  className?: string;
};

/**
 * AppModal — reusable modal shell with size presets.
 */
export function AppModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md",
  className,
}: BaseModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(sizeClasses[size], className)}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {children}
        {footer ? <DialogFooter>{footer}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  );
}

/** ConfirmationModal — standard confirm action dialog. */
export function ConfirmationModal({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  isLoading,
}: Omit<BaseModalProps, "children" | "footer" | "size"> & {
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  isLoading?: boolean;
}) {
  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <AppButton variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            {cancelLabel}
          </AppButton>
          <AppButton onClick={onConfirm} loading={isLoading}>
            {confirmLabel}
          </AppButton>
        </>
      }
    />
  );
}

export { DeleteDialog as DeleteModal } from "@/components/shared/delete-dialog";

/** WarningModal — warning-styled confirmation dialog. */
export function WarningModal(props: Parameters<typeof ConfirmationModal>[0]) {
  const WarningIcon = statusIcons.warning;

  return (
    <AppModal
      open={props.open}
      onOpenChange={props.onOpenChange}
      title={props.title}
      description={
        <div className="flex items-start gap-2">
          <WarningIcon className="mt-0.5 size-4 text-warning" aria-hidden="true" />
          <span>{props.description}</span>
        </div>
      }
      size="sm"
      footer={
        <>
          <AppButton variant="outline" onClick={() => props.onOpenChange(false)}>
            Cancel
          </AppButton>
          <AppButton variant="warning" onClick={props.onConfirm} loading={props.isLoading}>
            {props.confirmLabel ?? "Continue"}
          </AppButton>
        </>
      }
    />
  );
}

/** InfoModal — informational dialog. */
export function InfoModal({
  open,
  onOpenChange,
  title,
  description,
  actionLabel = "Got it",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  actionLabel?: string;
}) {
  const InfoIcon = statusIcons.info;

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={
        <div className="flex items-start gap-2">
          <InfoIcon className="mt-0.5 size-4 text-info" aria-hidden="true" />
          <span>{description}</span>
        </div>
      }
      size="sm"
      footer={
        <AppButton onClick={() => onOpenChange(false)}>{actionLabel}</AppButton>
      }
    />
  );
}

export { ConfirmDialog as ConfirmModal } from "@/components/shared/confirm-dialog";
