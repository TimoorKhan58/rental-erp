"use client";

import type { ReactNode } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type DrawerSide = "left" | "right";
export type DrawerWidth = "sm" | "md" | "lg" | "xl" | "full";

const widthClasses: Record<DrawerWidth, string> = {
  sm: "data-[side=left]:sm:max-w-sm data-[side=right]:sm:max-w-sm",
  md: "data-[side=left]:sm:max-w-md data-[side=right]:sm:max-w-md",
  lg: "data-[side=left]:sm:max-w-lg data-[side=right]:sm:max-w-lg",
  xl: "data-[side=left]:sm:max-w-xl data-[side=right]:sm:max-w-xl",
  full: "data-[side=left]:w-full data-[side=right]:w-full data-[side=left]:sm:max-w-full data-[side=right]:sm:max-w-full",
};

/**
 * AppDrawer — enterprise drawer with width presets and responsive behavior.
 *
 * @example
 * <AppDrawer open={open} onOpenChange={setOpen} title="Filters" side="right" width="md">
 *   ...
 * </AppDrawer>
 */
type AppDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  side?: DrawerSide;
  width?: DrawerWidth;
  className?: string;
};

export function AppDrawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  side = "right",
  width = "md",
  className,
}: AppDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        className={cn("flex w-full flex-col", widthClasses[width], className)}
      >
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4">{children}</div>
        {footer ? <SheetFooter>{footer}</SheetFooter> : null}
      </SheetContent>
    </Sheet>
  );
}

export {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
};
