import { describe, expect, it } from "vitest";
import { ROUTES } from "@/config/routes";
import { PERMISSIONS } from "@/shared/application/authorization/permissions";
import { NAVIGATION_GROUPS } from "./navigation";
import {
  canAccessNavHref,
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

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.label).toBe("Overview");
    expect(filtered[0]?.items.map((item) => item.href)).toEqual([
      ROUTES.dashboard,
    ]);
  });
});
