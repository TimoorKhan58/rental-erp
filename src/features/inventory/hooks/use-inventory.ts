import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PERMISSIONS } from "@/shared/application/authorization/permissions";
import { queryKeys } from "@/lib/query";
import { useAppMutation } from "@/lib/query";
import { getCurrentUserPermissions } from "@/features/customer/services";
import { getProductReport } from "@/features/financial-report/services";
import { getProducts } from "@/features/product/services";
import { getWarehouses } from "@/features/warehouse/services";
import type { ListInventoryParams, InventorySummaryStats } from "../types";
import type { ProductPricing, ProductRecoveryStats } from "../mappers";
import { computeInventorySummary, computeStockStatusCounts } from "../mappers/inventory-summary.mapper";
import {
  createInventory,
  deleteInventory,
  getInventory,
  getInventoryList,
  updateInventory,
} from "../services";

type LookupOption = {
  id: string;
  label: string;
};

export function useInventoryPermissions() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.permissions.me(),
    queryFn: getCurrentUserPermissions,
    staleTime: 5 * 60_000,
  });

  const permissions = data?.permissions ?? [];

  return {
    isLoading,
    canRead: permissions.includes(PERMISSIONS.inventory.read),
    canCreate: permissions.includes(PERMISSIONS.inventory.create),
    canUpdate: permissions.includes(PERMISSIONS.inventory.update),
    canDelete: permissions.includes(PERMISSIONS.inventory.delete),
    canAdjust: permissions.includes(PERMISSIONS.inventory.adjust),
  };
}

export function useInventoryFilterOptions() {
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
  const productPricingById = new Map<string, ProductPricing>(
    (products.data?.items ?? []).map((item) => [
      item.id,
      {
        replacementCost: item.replacementCost,
        rentalRate: item.rentalRate,
      },
    ]),
  );

  return {
    productOptions,
    warehouseOptions,
    productLabelById,
    warehouseLabelById,
    productNameById,
    warehouseNameById,
    productPricingById,
    isLoading: products.isLoading || warehouses.isLoading,
  };
}

export function useInventoryRecoveryMaps() {
  const { productPricingById, isLoading: isPricingLoading } = useInventoryFilterOptions();

  const permissions = useQuery({
    queryKey: queryKeys.permissions.me(),
    queryFn: getCurrentUserPermissions,
    staleTime: 5 * 60_000,
  });

  const canReadReports = (permissions.data?.permissions ?? []).includes(
    PERMISSIONS.reports.read,
  );

  const productReport = useQuery({
    queryKey: queryKeys.reports.products({ pageSize: 100 }),
    queryFn: () => getProductReport({ pageSize: 100 }),
    staleTime: 5 * 60_000,
    enabled: canReadReports,
  });

  const productRecoveryById = new Map<string, ProductRecoveryStats>(
    (productReport.data?.lines ?? []).map((line) => [
      line.productId,
      {
        revenue: line.revenue,
        quantityOnHand: line.quantityOnHand,
      },
    ]),
  );

  return {
    productPricingById,
    productRecoveryById,
    isLoading:
      isPricingLoading || permissions.isLoading || (canReadReports && productReport.isLoading),
  };
}

export function useInventoryList(params: ListInventoryParams) {
  return useQuery({
    queryKey: queryKeys.inventory.list(params),
    queryFn: () => getInventoryList(params),
  });
}

export function useInventorySummaryStats() {
  const listQuery = useQuery({
    queryKey: queryKeys.inventory.list({ pageSize: 100 }),
    queryFn: () => getInventoryList({ pageSize: 100 }),
    staleTime: 60_000,
  });

  const stats = useMemo<InventorySummaryStats | undefined>(() => {
    if (!listQuery.data) {
      return undefined;
    }

    return computeInventorySummary(listQuery.data.items);
  }, [listQuery.data]);

  const stockStatusCounts = useMemo(() => {
    if (!listQuery.data) {
      return undefined;
    }

    return computeStockStatusCounts(listQuery.data.items);
  }, [listQuery.data]);

  return {
    stats,
    stockStatusCounts,
    isLoading: listQuery.isLoading,
  };
}

export function useInventory(id: string) {
  return useQuery({
    queryKey: queryKeys.inventory.detail(id),
    queryFn: () => getInventory(id),
    enabled: Boolean(id),
  });
}

export function useCreateInventory() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: createInventory,
    showSuccessToast: true,
    successMessage: "Inventory record created successfully.",
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.inventory.lists() });
    },
  });
}

export function useUpdateInventory() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Parameters<typeof updateInventory>[1];
    }) => updateInventory(id, payload),
    showSuccessToast: true,
    successMessage: "Inventory record updated successfully.",
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.inventory.detail(id) });

      const previous = queryClient.getQueryData(queryKeys.inventory.detail(id));

      if (previous) {
        const current = previous as {
          quantityOnHand: number;
          reservedQuantity: number;
          availableQuantity: number;
        };

        const quantityOnHand = payload.quantityOnHand ?? current.quantityOnHand;
        const reservedQuantity = payload.reservedQuantity ?? current.reservedQuantity;

        queryClient.setQueryData(queryKeys.inventory.detail(id), {
          ...previous,
          ...payload,
          availableQuantity: quantityOnHand - reservedQuantity,
          updatedAt: new Date().toISOString(),
        });
      }

      return { previous };
    },
    onError: (_error, { id }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.inventory.detail(id), context.previous);
      }
    },
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory.lists() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory.detail(data.id) }),
      ]);
    },
  });
}

export function useDeleteInventory() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: deleteInventory,
    showSuccessToast: true,
    successMessage: "Inventory record deleted successfully.",
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.inventory.lists() });
    },
  });
}

export function useToggleInventoryStatus() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateInventory(id, { isActive }),
    showSuccessToast: true,
    successMessage: "Inventory status updated.",
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory.lists() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory.detail(data.id) }),
      ]);
    },
  });
}
