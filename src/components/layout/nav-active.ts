import type { NavigationArea, NavigationSection } from "@/constants/navigation.types";

export function isNavItemActive(
  pathname: string,
  href: string,
  allHrefs: readonly string[],
): boolean {
  return findBestMatch(pathname, allHrefs) === href;
}

function findBestMatch(pathname: string, allHrefs: readonly string[]): string | null {
  const matches = allHrefs.filter(
    (candidate) =>
      pathname === candidate ||
      (candidate !== "/" && pathname.startsWith(`${candidate}/`)),
  );

  if (matches.length === 0) {
    return null;
  }

  return matches.reduce((longest, current) =>
    current.length > longest.length ? current : longest,
  );
}

export type ActiveNavigation = {
  area: NavigationArea;
  section: NavigationSection;
};

/**
 * Which area and section the current page belongs to. The longest matching
 * destination wins, so /rental-orders/calendar is Calendar, not Orders.
 */
export function findActiveNavigation(
  pathname: string,
  areas: readonly NavigationArea[],
): ActiveNavigation | null {
  const allHrefs = areas.flatMap((area) => area.sections.map((s) => s.href));
  const best = findBestMatch(pathname, allHrefs);

  if (best === null) {
    return null;
  }

  for (const area of areas) {
    const section = area.sections.find((s) => s.href === best);
    if (section) {
      return { area, section };
    }
  }

  return null;
}

/**
 * Section tabs are shown on an area's main pages (the lists), not on a
 * single record or a form, where the page has its own back link.
 */
export function shouldShowSectionTabs(
  pathname: string,
  active: ActiveNavigation | null,
): boolean {
  if (active === null || active.area.sections.length < 2) {
    return false;
  }

  return active.area.sections.some((section) => section.href === pathname);
}
