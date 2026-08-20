import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { PERMISSIONS } from "@/shared/application/authorization/permissions";
import { queryKeys } from "@/lib/query";
import { getCurrentUserPermissions } from "@/features/customer/services";
import { getAuditLogs } from "@/features/audit/services";
import { getInventoryList } from "@/features/inventory/services/inventory.service";
import { getStockMovements } from "@/features/stock-movement/services/stock-movement.service";
import type { RentalOrderResponse } from "@/features/rental-order/types";
import type { ReturnResponse } from "../types";

export function useReturnRelatedData(
  returnRecord: ReturnResponse | undefined,
  rentalOrder: RentalOrderResponse | undefined,
) {
  const permissions = useQuery({
    queryKey: queryKeys.permissions.me(),
    queryFn: getCurrentUserPermissions,
    staleTime: 5 * 60_000,
  });

  const permissionSet = permissions.data?.permissions ?? [];
  const canReadAudit = permissionSet.includes(PERMISSIONS.audit.read);
  const canReadMovements = permissionSet.includes(PERMISSIONS.stockMovements.read);
  const canReadInventory = permissionSet.includes(PERMISSIONS.inventory.read);

  const warehouseId = rentalOrder?.warehouseId;
  const productIds = useMemo(() => {
    if (!rentalOrder) {
      return new Set<string>();
    }

    const ids = new Set<string>();

    for (const item of returnRecord?.items ?? []) {
      const rentalOrderItem = rentalOrder.items.find(
        (orderItem) => orderItem.id === item.rentalOrderItemId,
      );

      if (rentalOrderItem) {
        ids.add(rentalOrderItem.productId);
      }
    }

    return ids;
  }, [rentalOrder, returnRecord?.items]);

  const auditLogs = useQuery({
    queryKey: queryKeys.audit.list({
      entityType: "Return",
      entityId: returnRecord?.id,
      pageSize: 8,
      sortBy: "createdAt",
      sortOrder: "desc",
    }),
    queryFn: () =>
      getAuditLogs({
        entityType: "Return",
        entityId: returnRecord!.id,
        pageSize: 8,
        sortBy: "createdAt",
        sortOrder: "desc",
      }),
    enabled: Boolean(returnRecord?.id) && canReadAudit,
    staleTime: 60_000,
  });

  const stockMovements = useQuery({
    queryKey: queryKeys.stockMovements.list({
      warehouseId,
      pageSize: 100,
      sortBy: "createdAt",
      sortOrder: "desc",
    }),
    queryFn: () =>
      getStockMovements({
        warehouseId: warehouseId!,
        pageSize: 100,
        sortBy: "createdAt",
        sortOrder: "desc",
      }),
    enabled: Boolean(warehouseId) && canReadMovements && returnRecord?.status === "COMPLETED",
    staleTime: 60_000,
  });

  const inventory = useQuery({
    queryKey: queryKeys.inventory.list({
      warehouseId,
      pageSize: 100,
    }),
    queryFn: () =>
      getInventoryList({
        warehouseId: warehouseId!,
        pageSize: 100,
      }),
    enabled: Boolean(warehouseId) && canReadInventory,
    staleTime: 60_000,
  });

  const relatedMovements = useMemo(
    () =>
      (stockMovements.data?.items ?? []).filter(
        (movement) =>
          movement.referenceType === "RENTAL_ORDER" &&
          movement.referenceId === returnRecord?.rentalOrderId &&
          productIds.has(movement.productId),
      ),
    [productIds, returnRecord?.rentalOrderId, stockMovements.data?.items],
  );

  const inventoryRecords = useMemo(
    () =>
      (inventory.data?.items ?? []).filter((record) => productIds.has(record.productId)),
    [inventory.data?.items, productIds],
  );

  return {
    permissions: {
      canReadAudit,
      canReadMovements,
      canReadInventory,
    },
    auditLogs: auditLogs.data?.items ?? [],
    auditTotal: auditLogs.data?.meta.total ?? 0,
    stockMovements: relatedMovements,
    inventoryRecords,
    isLoading: auditLogs.isLoading || stockMovements.isLoading || inventory.isLoading,
  };
}
