import { describe, expect, it } from "vitest";
import { ROUTES } from "@/config/routes";
import { PERMISSIONS } from "@/shared/application/authorization/permissions";
import { NAVIGATION_AREAS, NAVIGATION_GROUPS, SETTINGS_AREA } from "./navigation";
import {
  canAccessNavHref,
  filterNavigationAreas,
  filterNavigationGroups,
  NAV_ITEM_REQUIRED_ANY,
} from "./navigation-access";

describe("navigation access", () => {
  it("maps every sidebar destination", () => {
    const hrefs = NAVIGATION_GROUPS.flatMap((group) =>
      group.items.map((item) => item.href),
    );

    expect(hrefs.every((href) => NAV_ITEM_REQUIRED_ANY[href] !== undefined)).toBe(
      true,
    );
  });

  it("hides accounting and users from a worker-like permission set", () => {
    const worker = [
      PERMISSIONS.dashboard.read,
      PERMISSIONS.rentalOrders.read,
      PERMISSIONS.dispatches.read,
      PERMISSIONS.settings.read,
    ];

    expect(canAccessNavHref(ROUTES.dashboard, worker)).toBe(true);
    expect(canAccessNavHref(ROUTES.rentalOrders, worker)).toBe(true);
    expect(canAccessNavHref(ROUTES.accounting, worker)).toBe(false);
    expect(canAccessNavHref(ROUTES.users, worker)).toBe(false);
    expect(canAccessNavHref(ROUTES.settings, worker)).toBe(true);
  });

  it("shows reports when either report permission is present", () => {
    expect(
      canAccessNavHref(ROUTES.reports, [PERMISSIONS.reports.read]),
    ).toBe(true);
    expect(
      canAccessNavHref(ROUTES.reports, [PERMISSIONS.financialReports.read]),
    ).toBe(true);
  });

  it("drops empty groups after filtering", () => {
    const filtered = filterNavigationGroups(NAVIGATION_GROUPS, [
      PERMISSIONS.dashboard.read,
    ]);

    // Settings is always there: everyone can open their own profile.
    expect(filtered.map((group) => group.label)).toEqual(["Home", "Settings"]);
    expect(filtered[0]?.items.map((item) => item.href)).toEqual([ROUTES.dashboard]);
    expect(filtered[1]?.items.map((item) => item.href)).toEqual([ROUTES.settings]);
  });

  it("has 7 daily areas plus Settings, and keeps every old destination", () => {
    expect(NAVIGATION_AREAS.map((area) => area.label)).toEqual([
      "Home",
      "Orders",
      "Calendar",
      "Stock",
      "Customers",
      "Money",
      "Reports",
    ]);
    const hrefs = [...NAVIGATION_AREAS, SETTINGS_AREA].flatMap((area) =>
      area.sections.map((section) => section.href),
    );
    for (const href of Object.keys(NAV_ITEM_REQUIRED_ANY)) {
      expect(hrefs).toContain(href);
    }
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("hides sections a worker cannot open and drops empty areas", () => {
    const worker = [
      PERMISSIONS.dashboard.read,
      PERMISSIONS.rentalOrders.read,
      PERMISSIONS.dispatches.read,
      PERMISSIONS.returns.read,
    ];
    const areas = filterNavigationAreas(NAVIGATION_AREAS, worker);

    expect(areas.map((area) => area.id)).toEqual(["home", "orders", "calendar"]);
    expect(areas[0]?.sections.map((s) => s.href)).toEqual([ROUTES.dashboard]);
    expect(areas[1]?.sections.map((s) => s.href)).toEqual([
      ROUTES.rentalOrders,
      ROUTES.dispatches,
      ROUTES.returns,
    ]);

    const settings = filterNavigationAreas([SETTINGS_AREA], worker)[0];
    expect(settings?.sections.map((s) => s.href)).toEqual([ROUTES.settings]);
  });
});
