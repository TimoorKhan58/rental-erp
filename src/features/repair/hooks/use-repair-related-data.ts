import { useQuery } from "@tanstack/react-query";
import { PERMISSIONS } from "@/shared/application/authorization/permissions";
import { queryKeys } from "@/lib/query";
import { getCurrentUserPermissions } from "@/features/customer/services";
import { getAuditLogs } from "@/features/audit/services";
import { getInventoryList } from "@/features/inventory/services/inventory.service";
import { getMaintenances } from "@/features/maintenance/services";
import { getStockMovements } from "@/features/stock-movement/services/stock-movement.service";
import type { RepairResponse } from "../types";

export function useRepairRelatedData(repair: RepairResponse | undefined) {
  const permissions = useQuery({
    queryKey: queryKeys.permissions.me(),
    queryFn: getCurrentUserPermissions,
    staleTime: 5 * 60_000,
  });

  const permissionSet = permissions.data?.permissions ?? [];
  const canReadAudit = permissionSet.includes(PERMISSIONS.audit.read);
  const canReadMovements = permissionSet.includes(PERMISSIONS.stockMovements.read);
  const canReadMaintenance = permissionSet.includes(PERMISSIONS.maintenances.read);
  const canReadInventory = permissionSet.includes(PERMISSIONS.inventory.read);

  const auditLogs = useQuery({
    queryKey: queryKeys.audit.list({
      entityType: "Repair",
      entityId: repair?.id,
      pageSize: 8,
      sortBy: "createdAt",
      sortOrder: "desc",
    }),
    queryFn: () =>
      getAuditLogs({
        entityType: "Repair",
        entityId: repair!.id,
        pageSize: 8,
        sortBy: "createdAt",
        sortOrder: "desc",
      }),
    enabled: Boolean(repair?.id) && canReadAudit,
    staleTime: 60_000,
  });

  const inventory = useQuery({
    queryKey: queryKeys.inventory.list({
      productId: repair?.productId,
      warehouseId: repair?.warehouseId,
      pageSize: 1,
    }),
    queryFn: () =>
      getInventoryList({
        productId: repair!.productId,
        warehouseId: repair!.warehouseId,
        pageSize: 1,
      }),
    enabled: Boolean(repair?.productId && repair?.warehouseId) && canReadInventory,
    staleTime: 60_000,
  });

  const stockMovements = useQuery({
    queryKey: queryKeys.stockMovements.list({
      productId: repair?.productId,
      warehouseId: repair?.warehouseId,
      pageSize: 100,
      sortBy: "createdAt",
      sortOrder: "desc",
    }),
    queryFn: () =>
      getStockMovements({
        productId: repair!.productId,
        warehouseId: repair!.warehouseId,
        pageSize: 100,
        sortBy: "createdAt",
        sortOrder: "desc",
      }),
    enabled: Boolean(repair?.productId && repair?.warehouseId) && canReadMovements,
    staleTime: 60_000,
  });

  const maintenances = useQuery({
    queryKey: queryKeys.maintenances.list({
      productId: repair?.productId,
      warehouseId: repair?.warehouseId,
      pageSize: 5,
      sortOrder: "desc",
    }),
    queryFn: () =>
      getMaintenances({
        productId: repair!.productId,
        warehouseId: repair!.warehouseId,
        pageSize: 5,
        sortOrder: "desc",
      }),
    enabled: Boolean(repair?.productId && repair?.warehouseId) && canReadMaintenance,
    staleTime: 60_000,
  });

  const relatedMovements = (stockMovements.data?.items ?? []).filter(
    (movement) => movement.referenceType === "REPAIR" && movement.referenceId === repair?.id,
  );

  return {
    permissions: {
      canReadAudit,
      canReadMovements,
      canReadMaintenance,
      canReadInventory,
    },
    auditLogs: auditLogs.data?.items ?? [],
    auditTotal: auditLogs.data?.meta.total ?? 0,
    inventoryRecord: inventory.data?.items[0],
    stockMovements: relatedMovements,
    maintenances: maintenances.data?.items ?? [],
    isLoading:
      auditLogs.isLoading ||
      inventory.isLoading ||
      stockMovements.isLoading ||
      maintenances.isLoading,
  };
}
