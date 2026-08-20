import { useQuery } from "@tanstack/react-query";
import { PERMISSIONS } from "@/shared/application/authorization/permissions";
import { queryKeys } from "@/lib/query";
import { getCurrentUserPermissions } from "@/features/customer/services";
import { getAuditLogs } from "@/features/audit/services";
import { getInventory } from "@/features/inventory/services/inventory.service";
import { getStockMovements } from "@/features/stock-movement/services/stock-movement.service";
import type { MaintenanceResponse } from "../types";

export function useMaintenanceRelatedData(maintenance: MaintenanceResponse | undefined) {
  const permissions = useQuery({
    queryKey: queryKeys.permissions.me(),
    queryFn: getCurrentUserPermissions,
    staleTime: 5 * 60_000,
  });

  const permissionSet = permissions.data?.permissions ?? [];
  const canReadAudit = permissionSet.includes(PERMISSIONS.audit.read);
  const canReadMovements = permissionSet.includes(PERMISSIONS.stockMovements.read);
  const canReadInventory = permissionSet.includes(PERMISSIONS.inventory.read);

  const auditLogs = useQuery({
    queryKey: queryKeys.audit.list({
      entityType: "Maintenance",
      entityId: maintenance?.id,
      pageSize: 8,
      sortBy: "createdAt",
      sortOrder: "desc",
    }),
    queryFn: () =>
      getAuditLogs({
        entityType: "Maintenance",
        entityId: maintenance!.id,
        pageSize: 8,
        sortBy: "createdAt",
        sortOrder: "desc",
      }),
    enabled: Boolean(maintenance?.id) && canReadAudit,
    staleTime: 60_000,
  });

  const inventory = useQuery({
    queryKey: queryKeys.inventory.detail(maintenance?.inventoryId ?? ""),
    queryFn: () => getInventory(maintenance!.inventoryId),
    enabled: Boolean(maintenance?.inventoryId) && canReadInventory,
    staleTime: 60_000,
  });

  const stockMovements = useQuery({
    queryKey: queryKeys.stockMovements.list({
      inventoryId: maintenance?.inventoryId,
      pageSize: 100,
      sortBy: "createdAt",
      sortOrder: "desc",
    }),
    queryFn: () =>
      getStockMovements({
        inventoryId: maintenance!.inventoryId,
        pageSize: 100,
        sortBy: "createdAt",
        sortOrder: "desc",
      }),
    enabled: Boolean(maintenance?.inventoryId) && canReadMovements,
    staleTime: 60_000,
  });

  const relatedMovements = (stockMovements.data?.items ?? []).filter(
    (movement) =>
      movement.referenceType === "MAINTENANCE" && movement.referenceId === maintenance?.id,
  );

  return {
    permissions: {
      canReadAudit,
      canReadMovements,
      canReadInventory,
    },
    auditLogs: auditLogs.data?.items ?? [],
    auditTotal: auditLogs.data?.meta.total ?? 0,
    inventoryRecord: inventory.data,
    stockMovements: relatedMovements,
    isLoading: auditLogs.isLoading || inventory.isLoading || stockMovements.isLoading,
  };
}
