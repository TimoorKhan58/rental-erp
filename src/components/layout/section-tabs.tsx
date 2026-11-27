"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { findActiveNavigation, shouldShowSectionTabs } from "./nav-active";
import { useVisibleNavigation } from "./use-visible-navigation";

/**
 * Tabs along the top of an area, e.g. "All orders · Going out · Coming
 * back" inside Orders (UI redesign). Shown on the area's list pages only.
 */
export function SectionTabs() {
  const pathname = usePathname();
  const { areas, settingsArea } = useVisibleNavigation();
  const all = settingsArea ? [...areas, settingsArea] : areas;
  const active = findActiveNavigation(pathname, all);

  if (!active || !shouldShowSectionTabs(pathname, active)) {
    return null;
  }

  return (
    <div className="border-b border-border bg-card">
      <nav
        aria-label={`${active.area.label} sections`}
        className="flex gap-1 overflow-x-auto px-4 sm:px-5 md:px-6 xl:px-8 [scrollbar-width:none]"
      >
        {active.area.sections.map((section) => {
          const current = section.href === active.section.href;
          return (
            <Link
              key={section.href}
              href={section.href}
              aria-current={current ? "page" : undefined}
              className={cn(
                "-mb-px inline-flex h-11 shrink-0 items-center whitespace-nowrap border-b-2 px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                current
                  ? "border-primary font-semibold text-foreground"
                  : "border-transparent font-medium text-muted-foreground hover:text-foreground",
              )}
            >
              {section.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
