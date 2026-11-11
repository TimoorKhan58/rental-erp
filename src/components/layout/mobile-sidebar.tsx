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
        id="mobile-navigation"
        side="left"
        className="w-[min(20rem,88vw)] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground shadow-none"
      >
        <SheetHeader className="border-b border-sidebar-border px-4 py-3.5 text-left">
          <BrandLogo size="sm" showTagline />
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">
            Main application navigation
          </SheetDescription>
        </SheetHeader>
        <SidebarNav
          onNavigate={closeMobile}
          className="min-h-0 flex-1 overflow-y-auto px-1 py-3"
        />
      </SheetContent>
    </Sheet>
  );
}
