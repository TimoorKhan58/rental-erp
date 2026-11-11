"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/config/routes";
import { useSettingsPermissions } from "../hooks";

const LINKS = [
  { label: "Overview", href: ROUTES.settings, requires: "any" as const },
  { label: "Profile", href: ROUTES.settingsProfile, requires: "profile" as const },
  { label: "Company", href: ROUTES.settingsCompany, requires: "settings" as const },
  { label: "Preferences", href: ROUTES.settingsPreferences, requires: "settings" as const },
  { label: "Security", href: ROUTES.settingsSecurity, requires: "settings" as const },
] as const;

export function SettingsSubNav() {
  const pathname = usePathname();
  const { canReadProfile, canReadSettings } = useSettingsPermissions();

  const visibleLinks = LINKS.filter((link) => {
    if (link.requires === "profile") {
      return canReadProfile;
    }
    if (link.requires === "settings") {
      return canReadSettings;
    }
    return canReadProfile || canReadSettings;
  });

  if (visibleLinks.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Settings sections" className="mb-6 flex flex-wrap gap-2">
      {visibleLinks.map((link) => {
        const isActive =
          link.href === ROUTES.settings
            ? pathname === ROUTES.settings
            : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
