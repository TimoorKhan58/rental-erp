"use client";

import { BrandLogo } from "@/components/shared/brand-logo";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SidebarNav } from "./sidebar-nav";
import { useSidebar } from "./sidebar-context";

export function MobileSidebar() {
  const { mobileOpen, setMobileOpen, closeMobile } = useSidebar();

  return (
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
      <SheetContent
        side="left"
        className="w-72 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
      >
        <SheetHeader className="border-b border-sidebar-border/60 px-4 py-4 text-left">
          <BrandLogo size="sm" showTagline />
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">
            Main application navigation
          </SheetDescription>
        </SheetHeader>
        <SidebarNav onNavigate={closeMobile} className="px-1 py-3" />
      </SheetContent>
    </Sheet>
  );
}
