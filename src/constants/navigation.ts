import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  Package,
  Settings,
  Truck,
  Undo2,
  Users,
  Wrench,
} from "lucide-react";

export type NavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

/** Placeholder navigation — routes will be wired in future milestones. */
export const NAVIGATION_ITEMS: NavigationItem[] = [
  { label: "Dashboard", href: "#", icon: LayoutDashboard },
  { label: "Customers", href: "#", icon: Users },
  { label: "Inventory", href: "#", icon: Package },
  { label: "Rental Orders", href: "#", icon: ClipboardList },
  { label: "Deliveries", href: "#", icon: Truck },
  { label: "Returns", href: "#", icon: Undo2 },
  { label: "Repairs", href: "#", icon: Wrench },
  { label: "Payments", href: "#", icon: CreditCard },
  { label: "Reports", href: "#", icon: BarChart3 },
  { label: "Settings", href: "#", icon: Settings },
];
