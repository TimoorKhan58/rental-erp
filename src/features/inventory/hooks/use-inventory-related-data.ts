import { useQuery } from "@tanstack/react-query";
import { PERMISSIONS } from "@/shared/application/authorization/permissions";
import { queryKeys } from "@/lib/query";
import { getCurrentUserPermissions } from "@/features/customer/services";
import { getAuditLogs } from "@/features/audit/services";
import { getMaintenances } from "@/features/maintenance/services";
import { getRepairs } from "@/features/repair/services";
import { getStockMovements } from "@/features/stock-movement/services/stock-movement.service";
import type { InventoryResponse } from "../types";

export function useInventoryRelatedData(inventory: InventoryResponse | undefined) {
  const permissions = useQuery({
    queryKey: queryKeys.permissions.me(),
    queryFn: getCurrentUserPermissions,
    staleTime: 5 * 60_000,
  });

  const permissionSet = permissions.data?.permissions ?? [];
  const canReadMovements = permissionSet.includes(PERMISSIONS.stockMovements.read);
  const canReadMaintenance = permissionSet.includes(PERMISSIONS.maintenances.read);
  const canReadRepairs = permissionSet.includes(PERMISSIONS.repairs.read);
  const canReadAudit = permissionSet.includes(PERMISSIONS.audit.read);

  const stockMovements = useQuery({
    queryKey: queryKeys.stockMovements.list({
      inventoryId: inventory?.id,
      pageSize: 20,
      sortBy: "createdAt",
      sortOrder: "desc",
    }),
    queryFn: () =>
      getStockMovements({
        inventoryId: inventory!.id,
        pageSize: 20,
        sortBy: "createdAt",
        sortOrder: "desc",
      }),
    enabled: Boolean(inventory?.id) && canReadMovements,
    staleTime: 60_000,
  });

  const maintenances = useQuery({
    queryKey: queryKeys.maintenances.list({
      inventoryId: inventory?.id,
      pageSize: 5,
      sortOrder: "desc",
    }),
    queryFn: () =>
      getMaintenances({
        inventoryId: inventory!.id,
        pageSize: 5,
        sortOrder: "desc",
      }),
    enabled: Boolean(inventory?.id) && canReadMaintenance,
    staleTime: 60_000,
  });

  const repairs = useQuery({
    queryKey: queryKeys.repairs.list({
      productId: inventory?.productId,
      warehouseId: inventory?.warehouseId,
      pageSize: 5,
      sortOrder: "desc",
    }),
    queryFn: () =>
      getRepairs({
        productId: inventory!.productId,
        warehouseId: inventory!.warehouseId,
        pageSize: 5,
        sortOrder: "desc",
      }),
    enabled: Boolean(inventory?.productId && inventory?.warehouseId) && canReadRepairs,
    staleTime: 60_000,
  });

  const auditLogs = useQuery({
    queryKey: queryKeys.audit.list({
      entityType: "Inventory",
      entityId: inventory?.id,
      pageSize: 5,
      sortBy: "createdAt",
      sortOrder: "desc",
    }),
    queryFn: () =>
      getAuditLogs({
        entityType: "Inventory",
        entityId: inventory!.id,
        pageSize: 5,
        sortBy: "createdAt",
        sortOrder: "desc",
      }),
    enabled: Boolean(inventory?.id) && canReadAudit,
    staleTime: 60_000,
  });

  return {
    permissions: {
      canReadMovements,
      canReadMaintenance,
      canReadRepairs,
      canReadAudit,
    },
    stockMovements: stockMovements.data?.items ?? [],
    stockMovementTotal: stockMovements.data?.meta.total ?? 0,
    maintenances: maintenances.data?.items ?? [],
    repairs: repairs.data?.items ?? [],
    auditLogs: auditLogs.data?.items ?? [],
    isLoading:
      stockMovements.isLoading ||
      maintenances.isLoading ||
      repairs.isLoading ||
      auditLogs.isLoading,
  };
}
