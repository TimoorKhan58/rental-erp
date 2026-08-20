import { useQuery, useQueries } from "@tanstack/react-query";
import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PERMISSIONS } from "@/shared/application/authorization/permissions";
import { queryKeys } from "@/lib/query";
import { useAppMutation } from "@/lib/query";
import { getCurrentUserPermissions } from "@/features/customer/services";
import { getInventoryList } from "@/features/inventory/services";
import { getProducts } from "@/features/product/services";
import { getWarehouses } from "@/features/warehouse/services";
import type { ListMaintenancesParams } from "../types";
import { MAINTENANCE_SERVICE_TYPES, MAINTENANCE_STATUSES } from "../types";
import { computeMaintenanceSummary } from "../mappers/maintenance-summary.mapper";
import {
  cancelMaintenance,
  completeMaintenance,
  createMaintenance,
  getMaintenance,
  getMaintenances,
  startMaintenance,
  updateMaintenance,
} from "../services";

type LookupOption = {
  id: string;
  label: string;
};

export function useMaintenancePermissions() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.permissions.me(),
    queryFn: getCurrentUserPermissions,
    staleTime: 5 * 60_000,
  });

  const permissions = data?.permissions ?? [];

  return {
    isLoading,
    canRead: permissions.includes(PERMISSIONS.maintenances.read),
    canCreate: permissions.includes(PERMISSIONS.maintenances.create),
    canUpdate: permissions.includes(PERMISSIONS.maintenances.update),
    canStart: permissions.includes(PERMISSIONS.maintenances.start),
    canComplete: permissions.includes(PERMISSIONS.maintenances.complete),
    canCancel: permissions.includes(PERMISSIONS.maintenances.cancel),
  };
}

export function useMaintenanceFilterOptions() {
  const products = useQuery({
    queryKey: queryKeys.products.list({ pageSize: 100, isActive: true }),
    queryFn: () => getProducts({ pageSize: 100, isActive: true }),
    staleTime: 5 * 60_000,
  });

  const warehouses = useQuery({
    queryKey: queryKeys.warehouses.list({ pageSize: 100, isActive: true }),
    queryFn: () => getWarehouses({ pageSize: 100, isActive: true }),
    staleTime: 5 * 60_000,
  });

  const inventory = useQuery({
    queryKey: queryKeys.inventory.list({ pageSize: 100, isActive: true }),
    queryFn: () => getInventoryList({ pageSize: 100, isActive: true }),
    staleTime: 5 * 60_000,
  });

  const productOptions: LookupOption[] = (products.data?.items ?? []).map((item) => ({
    id: item.id,
    label: `${item.productCode} — ${item.name}`,
  }));

  const warehouseOptions: LookupOption[] = (warehouses.data?.items ?? []).map((item) => ({
    id: item.id,
    label: `${item.warehouseCode} — ${item.name}`,
  }));

  const productLabelById = new Map(productOptions.map((item) => [item.id, item.label]));
  const warehouseLabelById = new Map(warehouseOptions.map((item) => [item.id, item.label]));
  const productNameById = new Map(
    (products.data?.items ?? []).map((item) => [item.id, item.name]),
  );
  const warehouseNameById = new Map(
    (warehouses.data?.items ?? []).map((item) => [item.id, item.name]),
  );

  const inventoryOptions = (inventory.data?.items ?? [])
    .filter((item) => item.isActive && item.availableQuantity > 0)
    .map((item) => ({
      id: item.id,
      productId: item.productId,
      warehouseId: item.warehouseId,
      availableQuantity: item.availableQuantity,
      label: `${productLabelById.get(item.productId) ?? item.productId} @ ${
        warehouseLabelById.get(item.warehouseId) ?? item.warehouseId
      } (${item.availableQuantity} available)`,
    }));

  return {
    productOptions,
    warehouseOptions,
    inventoryOptions,
    productLabelById,
    warehouseLabelById,
    productNameById,
    warehouseNameById,
    isLoading: products.isLoading || warehouses.isLoading || inventory.isLoading,
  };
}

export function useMaintenanceSummaryStats() {
  const totalQuery = useQuery({
    queryKey: queryKeys.maintenances.list({ pageSize: 1 }),
    queryFn: () => getMaintenances({ pageSize: 1 }),
    staleTime: 60_000,
  });

  const costSampleQuery = useQuery({
    queryKey: queryKeys.maintenances.list({ pageSize: 100, sortBy: "createdAt", sortOrder: "desc" }),
    queryFn: () => getMaintenances({ pageSize: 100, sortBy: "createdAt", sortOrder: "desc" }),
    staleTime: 60_000,
  });

  const statusQueries = useQueries({
    queries: MAINTENANCE_STATUSES.map((status) => ({
      queryKey: queryKeys.maintenances.list({ status, pageSize: 1 }),
      queryFn: () => getMaintenances({ status, pageSize: 1 }),
      staleTime: 60_000,
    })),
  });

  const serviceTypeQueries = useQueries({
    queries: MAINTENANCE_SERVICE_TYPES.map((serviceType) => ({
      queryKey: queryKeys.maintenances.list({ serviceType, pageSize: 1 }),
      queryFn: () => getMaintenances({ serviceType, pageSize: 1 }),
      staleTime: 60_000,
    })),
  });

  const statusCounts = useMemo(() => {
    const counts: Partial<Record<"all" | (typeof MAINTENANCE_STATUSES)[number], number>> = {
      all: totalQuery.data?.meta.total ?? 0,
    };

    MAINTENANCE_STATUSES.forEach((status, index) => {
      counts[status] = statusQueries[index]?.data?.meta.total ?? 0;
    });

    return counts;
  }, [totalQuery.data, statusQueries]);

  const serviceTypeCounts = useMemo(() => {
    const counts: Partial<Record<"all" | (typeof MAINTENANCE_SERVICE_TYPES)[number], number>> = {
      all: totalQuery.data?.meta.total ?? 0,
    };

    MAINTENANCE_SERVICE_TYPES.forEach((serviceType, index) => {
      counts[serviceType] = serviceTypeQueries[index]?.data?.meta.total ?? 0;
    });

    return counts;
  }, [totalQuery.data, serviceTypeQueries]);

  const stats = useMemo(() => {
    if (!totalQuery.data) {
      return undefined;
    }

    const total = totalQuery.data.meta.total;
    const scheduledCount = statusCounts.SCHEDULED ?? 0;
    const inProgressCount = statusCounts.IN_PROGRESS ?? 0;
    const completedCount = statusCounts.COMPLETED ?? 0;
    const cancelledCount = statusCounts.CANCELLED ?? 0;
    const costSample = computeMaintenanceSummary(costSampleQuery.data?.items ?? []);

    return {
      totalRecords: total,
      activeRecords: total - cancelledCount,
      pendingActionCount: scheduledCount + inProgressCount,
      scheduledCount,
      inProgressCount,
      completedCount,
      totalEstimatedCost: costSample.totalEstimatedCost,
    };
  }, [totalQuery.data, costSampleQuery.data, statusCounts]);

  return {
    stats,
    statusCounts,
    serviceTypeCounts,
    isLoading:
      totalQuery.isLoading ||
      costSampleQuery.isLoading ||
      statusQueries.some((query) => query.isLoading) ||
      serviceTypeQueries.some((query) => query.isLoading),
  };
}

export function useMaintenances(params: ListMaintenancesParams) {
  return useQuery({
    queryKey: queryKeys.maintenances.list(params),
    queryFn: () => getMaintenances(params),
  });
}

export function useMaintenance(id: string) {
  return useQuery({
    queryKey: queryKeys.maintenances.detail(id),
    queryFn: () => getMaintenance(id),
    enabled: Boolean(id),
  });
}

export function useCreateMaintenance() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: createMaintenance,
    showSuccessToast: true,
    successMessage: "Maintenance created successfully.",
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.maintenances.lists() });
    },
  });
}

export function useUpdateMaintenance() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Parameters<typeof updateMaintenance>[1];
    }) => updateMaintenance(id, payload),
    showSuccessToast: true,
    successMessage: "Maintenance updated successfully.",
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.maintenances.detail(id) });

      const previous = queryClient.getQueryData(queryKeys.maintenances.detail(id));

      if (previous) {
        queryClient.setQueryData(queryKeys.maintenances.detail(id), {
          ...previous,
          ...payload,
          updatedAt: new Date().toISOString(),
        });
      }

      return { previous };
    },
    onError: (_error, { id }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.maintenances.detail(id), context.previous);
      }
    },
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.maintenances.lists() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.maintenances.detail(data.id) }),
      ]);
    },
  });
}

export function useStartMaintenance() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: startMaintenance,
    showSuccessToast: true,
    successMessage: "Maintenance started.",
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.maintenances.lists() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.maintenances.detail(data.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory.lists() }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.inventory.detail(data.inventoryId),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.stockMovements.lists() }),
      ]);
    },
  });
}

export function useCompleteMaintenance() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: completeMaintenance,
    showSuccessToast: true,
    successMessage: "Maintenance completed successfully.",
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.maintenances.lists() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.maintenances.detail(data.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory.lists() }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.inventory.detail(data.inventoryId),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.stockMovements.lists() }),
      ]);
    },
  });
}

export function useCancelMaintenance() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: cancelMaintenance,
    showSuccessToast: true,
    successMessage: "Maintenance cancelled.",
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.maintenances.lists() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.maintenances.detail(data.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory.lists() }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.inventory.detail(data.inventoryId),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.stockMovements.lists() }),
      ]);
    },
  });
}
