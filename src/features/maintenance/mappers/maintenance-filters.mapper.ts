import type { MaintenanceServiceType } from "../types";

export function matchesScheduledDateRange(
  scheduledDate: string,
  from?: string,
  to?: string,
): boolean {
  if (!from && !to) {
    return true;
  }

  const timestamp = new Date(scheduledDate).getTime();

  if (from && timestamp < new Date(from).getTime()) {
    return false;
  }

  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);

    if (timestamp > end.getTime()) {
      return false;
    }
  }

  return true;
}

export function matchesTechnicianFilter(
  technician: string | null,
  filter?: string,
): boolean {
  if (!filter) {
    return true;
  }

  const normalizedFilter = filter.trim().toLowerCase();

  if (!normalizedFilter) {
    return true;
  }

  return (technician ?? "").toLowerCase().includes(normalizedFilter);
}

export function matchesServiceTypeFilter(
  serviceType: MaintenanceServiceType,
  filter?: MaintenanceServiceType,
): boolean {
  if (!filter) {
    return true;
  }

  return serviceType === filter;
}
