import { describe, expect, it } from "vitest";
import { ROUTES } from "@/config/routes";
import { ALL_NAVIGATION_AREAS } from "@/constants/navigation";
import {
  findActiveNavigation,
  isNavItemActive,
  shouldShowSectionTabs,
} from "./nav-active";

describe("findActiveNavigation", () => {
  const cases: [string, string, string][] = [
    ["/dashboard", "home", "Today"],
    ["/rental-orders", "orders", "All orders"],
    ["/rental-orders/abc/edit", "orders", "All orders"],
    ["/rental-orders/calendar", "calendar", "Calendar"],
    ["/dispatches/new", "orders", "Going out"],
    ["/returns", "orders", "Coming back"],
    ["/products/abc", "stock", "Items"],
    ["/procurements", "stock", "Purchases"],
    ["/external-rentals", "stock", "Hire-ins"],
    ["/rental-invoices", "money", "Invoices"],
    ["/accounting/trial-balance", "money", "Accounting"],
    ["/reports/profit-loss", "reports", "Reports"],
    ["/users/new", "settings", "Staff and logins"],
    ["/settings/company", "settings", "Company"],
  ];

  it.each(cases)("%s belongs to %s › %s", (path, areaId, sectionLabel) => {
    const active = findActiveNavigation(path, ALL_NAVIGATION_AREAS);
    expect(active?.area.id).toBe(areaId);
    expect(active?.section.label).toBe(sectionLabel);
  });

  it("returns null for pages outside the menu", () => {
    expect(findActiveNavigation("/platform", ALL_NAVIGATION_AREAS)).toBeNull();
  });

  it("shows section tabs on an area's list pages only", () => {
    const at = (path: string) =>
      shouldShowSectionTabs(path, findActiveNavigation(path, ALL_NAVIGATION_AREAS));
    expect(at("/rental-orders")).toBe(true);
    expect(at("/dispatches")).toBe(true);
    expect(at("/rental-orders/abc")).toBe(false);
    expect(at("/dispatches/new")).toBe(false);
    // One-section areas have nothing to switch to.
    expect(at("/customers")).toBe(false);
    expect(at("/rental-orders/calendar")).toBe(false);
  });
});

const hrefs = [
  ROUTES.dashboard,
  ROUTES.rentalOrders,
  ROUTES.rentalOrdersCalendar,
  ROUTES.dispatches,
  ROUTES.reports,
  ROUTES.settings,
  ROUTES.users,
] as const;

describe("isNavItemActive", () => {
  it("matches exact list routes", () => {
    expect(isNavItemActive("/rental-orders", ROUTES.rentalOrders, hrefs)).toBe(
      true,
    );
    expect(isNavItemActive("/rental-orders", ROUTES.dispatches, hrefs)).toBe(
      false,
    );
  });

  it("keeps the parent active on create, detail, and edit", () => {
    expect(isNavItemActive("/rental-orders/new", ROUTES.rentalOrders, hrefs)).toBe(
      true,
    );
    expect(
      isNavItemActive("/rental-orders/abc/edit", ROUTES.rentalOrders, hrefs),
    ).toBe(true);
  });

  it("prefers the longest matching destination", () => {
    expect(
      isNavItemActive(
        "/rental-orders/calendar",
        ROUTES.rentalOrdersCalendar,
        hrefs,
      ),
    ).toBe(true);
    expect(
      isNavItemActive("/rental-orders/calendar", ROUTES.rentalOrders, hrefs),
    ).toBe(false);
  });

  it("does not activate settings from an unrelated path", () => {
    expect(isNavItemActive("/users", ROUTES.settings, hrefs)).toBe(false);
    expect(isNavItemActive("/settings/profile", ROUTES.settings, hrefs)).toBe(
      true,
    );
    expect(isNavItemActive("/reports/dispatches", ROUTES.dispatches, hrefs)).toBe(
      false,
    );
    expect(isNavItemActive("/reports/dispatches", ROUTES.reports, hrefs)).toBe(
      true,
    );
  });
});
