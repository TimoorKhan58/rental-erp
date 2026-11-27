import type { LucideIcon } from "lucide-react";

export type NavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export type NavigationGroup = {
  label: string;
  items: NavigationItem[];
};

/** One tab along the top of an area (e.g. "Going out" inside Orders). */
export type NavigationSection = {
  label: string;
  href: string;
};

/**
 * One main menu entry (UI redesign, 7 areas). Its old menu pages live on as
 * sections, shown as tabs along the top. Web addresses do not change.
 */
export type NavigationArea = {
  id: string;
  label: string;
  icon: LucideIcon;
  sections: NavigationSection[];
};
