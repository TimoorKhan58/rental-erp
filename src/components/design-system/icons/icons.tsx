import type { LucideIcon } from "lucide-react";
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  ArchiveIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  BellIcon,
  Building2Icon,
  CheckCircle2Icon,
  ChevronRightIcon,
  CircleIcon,
  ClipboardListIcon,
  ClockIcon,
  CreditCardIcon,
  DownloadIcon,
  EditIcon,
  EyeIcon,
  FileTextIcon,
  FilterIcon,
  HomeIcon,
  InfoIcon,
  LayoutDashboardIcon,
  Loader2Icon,
  LockIcon,
  MoreHorizontalIcon,
  PackageIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  SettingsIcon,
  Trash2Icon,
  TruckIcon,
  Undo2Icon,
  UploadIcon,
  UserIcon,
  UsersIcon,
  WrenchIcon,
  XCircleIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Icon wrapper — consistent sizing and accessibility for Lucide icons.
 *
 * @example
 * <AppIcon icon={SearchIcon} label="Search" />
 */
type AppIconProps = {
  icon: LucideIcon;
  label?: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  decorative?: boolean;
};

const iconSizes = {
  xs: "size-3",
  sm: "size-3.5",
  md: "size-4",
  lg: "size-5",
} as const;

/** Stroke width aligned across Lucide icons in the design system. */
const ICON_STROKE = 1.75;

export function AppIcon({
  icon: Icon,
  label,
  size = "md",
  className,
  decorative = false,
}: AppIconProps) {
  return (
    <Icon
      className={cn("shrink-0", iconSizes[size], className)}
      strokeWidth={ICON_STROKE}
      aria-hidden={decorative || !label}
      aria-label={label}
      role={label && !decorative ? "img" : undefined}
    />
  );
}

/** Navigation icons */
export const navIcons = {
  dashboard: LayoutDashboardIcon,
  home: HomeIcon,
  customers: UsersIcon,
  inventory: PackageIcon,
  orders: ClipboardListIcon,
  deliveries: TruckIcon,
  returns: Undo2Icon,
  repairs: WrenchIcon,
  payments: CreditCardIcon,
  reports: FileTextIcon,
  settings: SettingsIcon,
  chevronRight: ChevronRightIcon,
} as const;

/** Action icons */
export const actionIcons = {
  add: PlusIcon,
  edit: EditIcon,
  delete: Trash2Icon,
  view: EyeIcon,
  search: SearchIcon,
  filter: FilterIcon,
  download: DownloadIcon,
  upload: UploadIcon,
  refresh: RefreshCwIcon,
  more: MoreHorizontalIcon,
  back: ArrowLeftIcon,
  forward: ArrowRightIcon,
  close: XCircleIcon,
} as const;

/** Status icons */
export const statusIcons = {
  success: CheckCircle2Icon,
  warning: AlertTriangleIcon,
  error: AlertCircleIcon,
  info: InfoIcon,
  pending: ClockIcon,
  inactive: CircleIcon,
  loading: Loader2Icon,
  locked: LockIcon,
} as const;

/** Entity icons */
export const entityIcons = {
  user: UserIcon,
  users: UsersIcon,
  company: Building2Icon,
  product: PackageIcon,
  document: FileTextIcon,
  notification: BellIcon,
  archive: ArchiveIcon,
} as const;

export type NavIconName = keyof typeof navIcons;
export type ActionIconName = keyof typeof actionIcons;
export type StatusIconName = keyof typeof statusIcons;
export type EntityIconName = keyof typeof entityIcons;
