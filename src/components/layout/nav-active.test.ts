import { describe, expect, it } from "vitest";
import { ROUTES } from "@/config/routes";
import { isNavItemActive } from "./nav-active";

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
