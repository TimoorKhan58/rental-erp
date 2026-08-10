import type { AssetStatus } from "../types";

export function canEditAsset(status: AssetStatus): boolean {
  return status !== "DISPOSED";
}

export function canTransferAsset(status: AssetStatus): boolean {
  return status === "ACTIVE";
}

export function canDisposeAsset(status: AssetStatus): boolean {
  return status === "ACTIVE";
}

export function canAddMaintenance(status: AssetStatus): boolean {
  return status !== "DISPOSED";
}

export const STATUS_LABELS: Record<AssetStatus, string> = {
  ACTIVE: "Active",
  UNDER_MAINTENANCE: "Under maintenance",
  TRANSFERRED: "Transferred",
  DISPOSED: "Disposed",
};
