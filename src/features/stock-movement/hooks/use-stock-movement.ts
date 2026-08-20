import { useQuery } from "@tanstack/react-query";
import { PERMISSIONS } from "@/shared/application/authorization/permissions";
import { queryKeys } from "@/lib/query";
import { getCurrentUserPermissions } from "@/features/customer/services";
import type { ListStockMovementsParams } from "../types/stock-movement.types";
import { getStockMovement, getStockMovements } from "../services/stock-movement.service";

export function useStockMovementPermissions() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.permissions.me(),
    queryFn: getCurrentUserPermissions,
    staleTime: 5 * 60_000,
  });

  const permissions = data?.permissions ?? [];

  return {
    isLoading,
    canRead: permissions.includes(PERMISSIONS.stockMovements.read),
  };
}

export function useStockMovements(params: ListStockMovementsParams) {
  return useQuery({
    queryKey: queryKeys.stockMovements.list(params),
    queryFn: () => getStockMovements(params),
  });
}

export function useStockMovement(id: string) {
  return useQuery({
    queryKey: queryKeys.stockMovements.detail(id),
    queryFn: () => getStockMovement(id),
    enabled: Boolean(id),
  });
}
