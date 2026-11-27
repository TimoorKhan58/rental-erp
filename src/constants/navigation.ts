import { ROUTES } from "@/config/routes";
import type {
  NavigationArea,
  NavigationGroup,
  NavigationItem,
} from "./navigation.types";
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  House,
  Package,
  Settings,
  Users,
  Wallet,
} from "lucide-react";

export type {
  NavigationArea,
  NavigationGroup,
  NavigationItem,
  NavigationSection,
} from "./navigation.types";

/**
 * The main menu: 7 areas for daily work, plus Settings at the bottom
 * (UI redesign). Every page that used to be its own menu item is now a
 * section (a tab along the top of its area). Web addresses are unchanged.
 */
export const NAVIGATION_AREAS: NavigationArea[] = [
  {
    id: "home",
    label: "Home",
    icon: House,
    sections: [
      { label: "Today", href: ROUTES.dashboard },
      { label: "Notifications", href: ROUTES.notifications },
    ],
  },
  {
    id: "orders",
    label: "Orders",
    icon: ClipboardList,
    sections: [
      { label: "All orders", href: ROUTES.rentalOrders },
      { label: "Going out", href: ROUTES.dispatches },
      { label: "Coming back", href: ROUTES.returns },
    ],
  },
  {
    id: "calendar",
    label: "Calendar",
    icon: CalendarDays,
    sections: [{ label: "Calendar", href: ROUTES.rentalOrdersCalendar }],
  },
  {
    id: "stock",
    label: "Stock",
    icon: Package,
    sections: [
      { label: "Items", href: ROUTES.products },
      { label: "Stock levels", href: ROUTES.inventory },
      { label: "Warehouses", href: ROUTES.warehouses },
      { label: "Purchases", href: ROUTES.procurements },
      { label: "Suppliers", href: ROUTES.suppliers },
      { label: "Hire-ins", href: ROUTES.externalRentals },
      { label: "Repairs", href: ROUTES.repairs },
      { label: "Upkeep", href: ROUTES.maintenance },
      { label: "Assets", href: ROUTES.assets },
      { label: "Catalog", href: ROUTES.catalog },
    ],
  },
  {
    id: "customers",
    label: "Customers",
    icon: Users,
    sections: [{ label: "Customers", href: ROUTES.customers }],
  },
  {
    id: "money",
    label: "Money",
    icon: Wallet,
    sections: [
      { label: "Invoices", href: ROUTES.rentalInvoices },
      { label: "Payments", href: ROUTES.payments },
      { label: "Expenses", href: ROUTES.expenses },
      { label: "Accounting", href: ROUTES.accounting },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    icon: BarChart3,
    sections: [{ label: "Reports", href: ROUTES.reports }],
  },
];

/** Shown at the bottom of the menu, apart from daily work. */
export const SETTINGS_AREA: NavigationArea = {
  id: "settings",
  label: "Settings",
  icon: Settings,
  sections: [
    { label: "Company", href: ROUTES.settings },
    { label: "Staff and logins", href: ROUTES.users },
    { label: "Activity log", href: ROUTES.audit },
  ],
};

export const ALL_NAVIGATION_AREAS: NavigationArea[] = [
  ...NAVIGATION_AREAS,
  SETTINGS_AREA,
];

/** Every destination in the menu, in order. */
export const NAVIGATION_SECTION_HREFS: string[] = ALL_NAVIGATION_AREAS.flatMap(
  (area) => area.sections.map((section) => section.href),
);

/**
 * Old grouped shape, kept for code that wants a flat list of destinations.
 * One group per area; each item is a section.
 */
export const NAVIGATION_GROUPS: NavigationGroup[] = ALL_NAVIGATION_AREAS.map(
  (area) => ({
    label: area.label,
    items: area.sections.map((section) => ({
      label: section.label,
      href: section.href,
      icon: area.icon,
    })),
  }),
);

export const NAVIGATION_ITEMS: NavigationItem[] = NAVIGATION_GROUPS.flatMap(
  (group) => group.items,
);
