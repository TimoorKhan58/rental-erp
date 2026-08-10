import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PERMISSIONS } from "@/shared/application/authorization/permissions";
import { queryKeys } from "@/lib/query";
import { useAppMutation } from "@/lib/query";
import { getCurrentUserPermissions } from "@/features/customer/services";
import type {
  CatalogEntityResponse,
  CatalogListParams,
  CatalogListResponse,
  CatalogTab,
} from "../types";
import {
  createAttribute,
  createBrand,
  createCategory,
  createTag,
  createUnit,
  deleteAttribute,
  deleteBrand,
  deleteCategory,
  deleteTag,
  deleteUnit,
  getAttributes,
  getBrands,
  getCategories,
  getTags,
  getUnits,
  updateAttribute,
  updateBrand,
  updateCategory,
  updateTag,
  updateUnit,
} from "../services";

export function useCatalogPermissions() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.permissions.me(),
    queryFn: getCurrentUserPermissions,
    staleTime: 5 * 60_000,
  });

  const permissions = data?.permissions ?? [];

  return {
    isLoading,
    canRead: permissions.includes(PERMISSIONS.catalog.read),
    canCreate: permissions.includes(PERMISSIONS.catalog.create),
    canUpdate: permissions.includes(PERMISSIONS.catalog.update),
    canDelete: permissions.includes(PERMISSIONS.catalog.delete),
  };
}

function invalidateCatalogAndProduct(
  queryClient: ReturnType<typeof useQueryClient>,
  tab: CatalogTab,
) {
  const tasks = [
    queryClient.invalidateQueries({ queryKey: queryKeys.catalog.all }),
  ];

  if (tab === "categories") {
    tasks.push(
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.catalog.categories(),
      }),
    );
  }
  if (tab === "brands") {
    tasks.push(
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.catalog.brands(),
      }),
    );
  }
  if (tab === "units") {
    tasks.push(
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.catalog.units(),
      }),
    );
  }

  return Promise.all(tasks);
}

export function useCatalogItems(tab: CatalogTab, params: CatalogListParams) {
  return useQuery({
    queryKey: queryKeys.catalog[tab].list(params),
    queryFn: async (): Promise<CatalogListResponse<CatalogEntityResponse>> => {
      switch (tab) {
        case "categories":
          return getCategories(params);
        case "brands":
          return getBrands(params);
        case "units":
          return getUnits(params);
        case "attributes":
          return getAttributes(params);
        case "tags":
          return getTags(params);
      }
    },
  });
}

export function useCreateCatalogItem(tab: CatalogTab) {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      switch (tab) {
        case "categories":
          return createCategory(payload as Parameters<typeof createCategory>[0]);
        case "brands":
          return createBrand(payload as Parameters<typeof createBrand>[0]);
        case "units":
          return createUnit(payload as Parameters<typeof createUnit>[0]);
        case "attributes":
          return createAttribute(payload as Parameters<typeof createAttribute>[0]);
        case "tags":
          return createTag(payload as Parameters<typeof createTag>[0]);
      }
    },
    showSuccessToast: true,
    successMessage: "Created successfully.",
    onSuccess: async () => {
      await invalidateCatalogAndProduct(queryClient, tab);
    },
  });
}

export function useUpdateCatalogItem(tab: CatalogTab) {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: Record<string, unknown>;
    }) => {
      switch (tab) {
        case "categories":
          return updateCategory(id, payload);
        case "brands":
          return updateBrand(id, payload);
        case "units":
          return updateUnit(id, payload);
        case "attributes":
          return updateAttribute(id, payload);
        case "tags":
          return updateTag(id, payload);
      }
    },
    showSuccessToast: true,
    successMessage: "Updated successfully.",
    onSuccess: async () => {
      await invalidateCatalogAndProduct(queryClient, tab);
    },
  });
}

export function useDeleteCatalogItem(tab: CatalogTab) {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: async (id: string) => {
      switch (tab) {
        case "categories":
          return deleteCategory(id);
        case "brands":
          return deleteBrand(id);
        case "units":
          return deleteUnit(id);
        case "attributes":
          return deleteAttribute(id);
        case "tags":
          return deleteTag(id);
      }
    },
    showSuccessToast: true,
    successMessage: "Deleted successfully.",
    onSuccess: async () => {
      await invalidateCatalogAndProduct(queryClient, tab);
    },
  });
}

export function useToggleCatalogActive(tab: CatalogTab) {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const payload = { isActive };
      switch (tab) {
        case "categories":
          return updateCategory(id, payload);
        case "brands":
          return updateBrand(id, payload);
        case "units":
          return updateUnit(id, payload);
        case "attributes":
          return updateAttribute(id, payload);
        case "tags":
          return updateTag(id, payload);
      }
    },
    showSuccessToast: true,
    successMessage: "Status updated.",
    onSuccess: async () => {
      await invalidateCatalogAndProduct(queryClient, tab);
    },
  });
}
