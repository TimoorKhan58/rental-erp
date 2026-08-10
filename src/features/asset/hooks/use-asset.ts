import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PERMISSIONS } from "@/shared/application/authorization/permissions";
import { queryKeys } from "@/lib/query";
import { useAppMutation } from "@/lib/query";
import { getCurrentUserPermissions } from "@/features/customer/services";
import { getSuppliers } from "@/features/supplier/services";
import { getWarehouses } from "@/features/warehouse/services";
import { getUsers } from "@/features/users/services";
import type { ListAssetsParams } from "../types";
import {
  computeAssetStatusCounts,
  computeAssetSummary,
} from "../mappers/asset-summary.mapper";
import {
  addAssetMaintenance,
  createAsset,
  createAssetCategory,
  disposeAsset,
  getAsset,
  getAssetCategories,
  getAssets,
  transferAsset,
  updateAsset,
} from "../services";

type LookupOption = { id: string; label: string };

export function useAssetPermissions() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.permissions.me(),
    queryFn: getCurrentUserPermissions,
    staleTime: 5 * 60_000,
  });

  const permissions = data?.permissions ?? [];

  return {
    isLoading,
    canRead: permissions.includes(PERMISSIONS.assets.read),
    canCreate: permissions.includes(PERMISSIONS.assets.create),
    canUpdate: permissions.includes(PERMISSIONS.assets.update),
    canTransfer: permissions.includes(PERMISSIONS.assets.transfer),
    canDispose: permissions.includes(PERMISSIONS.assets.dispose),
    canMaintenance: permissions.includes(PERMISSIONS.assets.maintenance),
    canCreateCategory: permissions.includes(PERMISSIONS.assetCategories.create),
  };
}

export function useAssetFilterOptions() {
  const categories = useQuery({
    queryKey: queryKeys.assetCategories.list({ pageSize: 100, isActive: true }),
    queryFn: () => getAssetCategories({ pageSize: 100, isActive: true }),
    staleTime: 5 * 60_000,
  });

  const warehouses = useQuery({
    queryKey: queryKeys.warehouses.list({ pageSize: 100, isActive: true }),
    queryFn: () => getWarehouses({ pageSize: 100, isActive: true }),
    staleTime: 5 * 60_000,
  });

  const suppliers = useQuery({
    queryKey: queryKeys.suppliers.list({ pageSize: 100, isActive: true }),
    queryFn: () => getSuppliers({ pageSize: 100, isActive: true }),
    staleTime: 5 * 60_000,
  });

  const users = useQuery({
    queryKey: queryKeys.users.list({ pageSize: 100 }),
    queryFn: () => getUsers({ pageSize: 100 }),
    staleTime: 5 * 60_000,
  });

  const categoryOptions: LookupOption[] = (categories.data?.items ?? []).map(
    (item) => ({ id: item.id, label: item.name }),
  );

  const warehouseOptions: LookupOption[] = (warehouses.data?.items ?? []).map(
    (item) => ({
      id: item.id,
      label: `${item.warehouseCode} — ${item.name}`,
    }),
  );

  const vendorOptions: LookupOption[] = (suppliers.data?.items ?? []).map(
    (item) => ({
      id: item.id,
      label: `${item.supplierCode} — ${item.name}`,
    }),
  );

  const employeeOptions: LookupOption[] = (users.data?.items ?? []).map(
    (item) => ({
      id: item.id,
      label: item.name || item.email,
    }),
  );

  return {
    categoryOptions,
    warehouseOptions,
    vendorOptions,
    employeeOptions,
    categoryLabelById: new Map(categoryOptions.map((i) => [i.id, i.label])),
    warehouseLabelById: new Map(warehouseOptions.map((i) => [i.id, i.label])),
    vendorLabelById: new Map(vendorOptions.map((i) => [i.id, i.label])),
    employeeLabelById: new Map(employeeOptions.map((i) => [i.id, i.label])),
    isLoading:
      categories.isLoading ||
      warehouses.isLoading ||
      suppliers.isLoading ||
      users.isLoading,
  };
}

export function useAssetSummaryStats() {
  const listQuery = useQuery({
    queryKey: queryKeys.assets.list({ pageSize: 100 }),
    queryFn: () => getAssets({ pageSize: 100 }),
    staleTime: 60_000,
  });

  const stats = useMemo(() => {
    if (!listQuery.data) return undefined;
    return computeAssetSummary(listQuery.data.items);
  }, [listQuery.data]);

  const statusCounts = useMemo(() => {
    if (!listQuery.data) return undefined;
    return computeAssetStatusCounts(listQuery.data.items);
  }, [listQuery.data]);

  return { stats, statusCounts, isLoading: listQuery.isLoading };
}

export function useAssets(params: ListAssetsParams) {
  return useQuery({
    queryKey: queryKeys.assets.list(params),
    queryFn: () => getAssets(params),
  });
}

export function useAsset(id: string) {
  return useQuery({
    queryKey: queryKeys.assets.detail(id),
    queryFn: () => getAsset(id),
    enabled: Boolean(id),
  });
}

function invalidateAssetQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  id?: string,
) {
  const tasks = [
    queryClient.invalidateQueries({ queryKey: queryKeys.assets.lists() }),
  ];
  if (id) {
    tasks.push(
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.detail(id) }),
    );
  }
  return Promise.all(tasks);
}

export function useCreateAsset() {
  const queryClient = useQueryClient();
  return useAppMutation({
    mutationFn: createAsset,
    showSuccessToast: true,
    successMessage: "Asset created successfully.",
    onSuccess: async () => {
      await invalidateAssetQueries(queryClient);
    },
  });
}

export function useUpdateAsset() {
  const queryClient = useQueryClient();
  return useAppMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Parameters<typeof updateAsset>[1];
    }) => updateAsset(id, payload),
    showSuccessToast: true,
    successMessage: "Asset updated successfully.",
    onSuccess: async (data) => {
      await invalidateAssetQueries(queryClient, data.id);
    },
  });
}

export function useTransferAsset() {
  const queryClient = useQueryClient();
  return useAppMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Parameters<typeof transferAsset>[1];
    }) => transferAsset(id, payload),
    showSuccessToast: true,
    successMessage: "Asset transferred successfully.",
    onSuccess: async (data) => {
      await invalidateAssetQueries(queryClient, data.id);
    },
  });
}

export function useDisposeAsset() {
  const queryClient = useQueryClient();
  return useAppMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Parameters<typeof disposeAsset>[1];
    }) => disposeAsset(id, payload),
    showSuccessToast: true,
    successMessage: "Asset disposed.",
    onSuccess: async (data) => {
      await invalidateAssetQueries(queryClient, data.id);
    },
  });
}

export function useAddAssetMaintenance() {
  const queryClient = useQueryClient();
  return useAppMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Parameters<typeof addAssetMaintenance>[1];
    }) => addAssetMaintenance(id, payload),
    showSuccessToast: true,
    successMessage: "Maintenance record added.",
    onSuccess: async (data) => {
      await invalidateAssetQueries(queryClient, data.id);
    },
  });
}

export function useCreateAssetCategory() {
  const queryClient = useQueryClient();
  return useAppMutation({
    mutationFn: createAssetCategory,
    showSuccessToast: true,
    successMessage: "Asset category created.",
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.assetCategories.lists(),
      });
    },
  });
}
