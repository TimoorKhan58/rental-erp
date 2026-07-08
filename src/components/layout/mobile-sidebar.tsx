"use client";

import { APPLICATION } from "@/constants/application";
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
        <SheetHeader className="border-b border-sidebar-border px-4 py-4 text-left">
          <SheetTitle className="text-sidebar-foreground">
            {APPLICATION.name}
          </SheetTitle>
          <SheetDescription className="sr-only">
            Main application navigation
          </SheetDescription>
        </SheetHeader>
        <SidebarNav onNavigate={closeMobile} className="px-2 py-4" />
      </SheetContent>
    </Sheet>
  );
}
