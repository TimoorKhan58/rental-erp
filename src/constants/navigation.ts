import { ROUTES } from "@/config/routes";
import type { NavigationItem } from "./navigation.types";
import {
  BarChart3,
  Box,
  Building2,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
  Truck,
  Undo2,
  Users,
  Warehouse,
  Wrench,
  Settings2,
  FileText,
  BookOpen,
  ScrollText,
  Bell,
} from "lucide-react";

export type { NavigationItem } from "./navigation.types";

/** Primary application navigation items. */
export const NAVIGATION_ITEMS: NavigationItem[] = [
  { label: "Dashboard", href: ROUTES.dashboard, icon: LayoutDashboard },
  { label: "Customers", href: ROUTES.customers, icon: Users },
  { label: "Suppliers", href: ROUTES.suppliers, icon: Building2 },
  { label: "Warehouses", href: ROUTES.warehouses, icon: Warehouse },
  { label: "Products", href: ROUTES.products, icon: Box },
  { label: "Inventory", href: ROUTES.inventory, icon: Package },
  { label: "Procurement", href: ROUTES.procurements, icon: ShoppingCart },
  { label: "Rental Orders", href: ROUTES.rentalOrders, icon: ClipboardList },
  { label: "Deliveries", href: ROUTES.dispatches, icon: Truck },
  { label: "Returns", href: ROUTES.returns, icon: Undo2 },
  { label: "Repairs", href: ROUTES.repairs, icon: Wrench },
  { label: "Maintenance", href: ROUTES.maintenance, icon: Settings2 },
  { label: "Rental Invoices", href: ROUTES.rentalInvoices, icon: FileText },
  { label: "Payments", href: ROUTES.payments, icon: CreditCard },
  { label: "Accounting", href: ROUTES.accounting, icon: BookOpen },
  { label: "Reports", href: ROUTES.reports, icon: BarChart3 },
  { label: "Audit", href: ROUTES.audit, icon: ScrollText },
  { label: "Notifications", href: ROUTES.notifications, icon: Bell },
  { label: "Settings", href: ROUTES.settings, icon: Settings },
];
