import { useQuery } from "@tanstack/react-query";
import { PERMISSIONS } from "@/shared/application/authorization/permissions";
import { queryKeys } from "@/lib/query";
import { getCurrentUserPermissions } from "@/features/customer/services";
import type { ListAuditLogsParams } from "../types";
import { getAuditLog, getAuditLogs } from "../services";

export function useAuditPermissions() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.permissions.me(),
    queryFn: getCurrentUserPermissions,
    staleTime: 5 * 60_000,
  });

  const permissions = data?.permissions ?? [];

  return {
    isLoading,
    canRead: permissions.includes(PERMISSIONS.audit.read),
  };
}

export function useAuditLogs(params: ListAuditLogsParams) {
  return useQuery({
    queryKey: queryKeys.audit.list(params),
    queryFn: () => getAuditLogs(params),
  });
}

export function useAuditLog(id: string) {
  return useQuery({
    queryKey: queryKeys.audit.detail(id),
    queryFn: () => getAuditLog(id),
    enabled: Boolean(id),
  });
}
