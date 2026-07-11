import { useQuery } from "@tanstack/react-query";
import { PERMISSIONS } from "@/shared/application/authorization/permissions";
import { queryKeys } from "@/lib/query";
import { getCurrentUserPermissions } from "@/features/customer/services";
import { apiGet } from "@/lib/api";
import type { ListProductsParams } from "../types";
import {
  createProduct,
  deleteProduct,
  getProduct,
  getProducts,
  updateProduct,
} from "../services";
import { useAppMutation } from "@/lib/query";
import { useQueryClient } from "@tanstack/react-query";

type CatalogOption = { id: string; name: string };

type CatalogListResponse = {
  items: CatalogOption[];
};

export function useProductPermissions() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.permissions.me(),
    queryFn: getCurrentUserPermissions,
    staleTime: 5 * 60_000,
  });

  const permissions = data?.permissions ?? [];

  return {
    isLoading,
    canRead: permissions.includes(PERMISSIONS.products.read),
    canCreate: permissions.includes(PERMISSIONS.products.create),
    canUpdate: permissions.includes(PERMISSIONS.products.update),
    canDelete: permissions.includes(PERMISSIONS.products.delete),
  };
}

export function useProductCatalogOptions() {
  const categories = useQuery({
    queryKey: queryKeys.products.catalog.categories(),
    queryFn: () =>
      apiGet<CatalogListResponse>("/categories", {
        params: { pageSize: 100, isActive: true },
      }),
    staleTime: 5 * 60_000,
  });

  const brands = useQuery({
    queryKey: queryKeys.products.catalog.brands(),
    queryFn: () =>
      apiGet<CatalogListResponse>("/brands", {
        params: { pageSize: 100, isActive: true },
      }),
    staleTime: 5 * 60_000,
  });

  const units = useQuery({
    queryKey: queryKeys.products.catalog.units(),
    queryFn: () =>
      apiGet<CatalogListResponse>("/units", {
        params: { pageSize: 100, isActive: true },
      }),
    staleTime: 5 * 60_000,
  });

  const toSelectOptions = (items: CatalogOption[] | undefined) =>
    (items ?? []).map((item) => ({ value: item.id, label: item.name }));

  return {
    categoryOptions: toSelectOptions(categories.data?.items),
    brandOptions: toSelectOptions(brands.data?.items),
    unitOptions: toSelectOptions(units.data?.items),
    isLoading: categories.isLoading || brands.isLoading || units.isLoading,
  };
}

export function useProducts(params: ListProductsParams) {
  return useQuery({
    queryKey: queryKeys.products.list(params),
    queryFn: () => getProducts(params),
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: queryKeys.products.detail(id),
    queryFn: () => getProduct(id),
    enabled: Boolean(id),
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: createProduct,
    showSuccessToast: true,
    successMessage: "Product created successfully.",
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateProduct>[1] }) =>
      updateProduct(id, payload),
    showSuccessToast: true,
    successMessage: "Product updated successfully.",
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.products.detail(id) });

      const previous = queryClient.getQueryData(queryKeys.products.detail(id));

      if (previous) {
        queryClient.setQueryData(queryKeys.products.detail(id), {
          ...previous,
          ...payload,
          rentalRate:
            payload.rentalRate !== undefined
              ? String(payload.rentalRate)
              : (previous as { rentalRate: string }).rentalRate,
          replacementCost:
            payload.replacementCost !== undefined
              ? payload.replacementCost === null
                ? null
                : String(payload.replacementCost)
              : (previous as { replacementCost: string | null }).replacementCost,
          updatedAt: new Date().toISOString(),
        });
      }

      return { previous };
    },
    onError: (_error, { id }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.products.detail(id), context.previous);
      }
    },
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(data.id) }),
      ]);
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: deleteProduct,
    showSuccessToast: true,
    successMessage: "Product deleted successfully.",
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() });
    },
  });
}

export function useToggleProductStatus() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateProduct(id, { isActive }),
    showSuccessToast: true,
    successMessage: "Product status updated.",
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(data.id) }),
      ]);
    },
  });
}
