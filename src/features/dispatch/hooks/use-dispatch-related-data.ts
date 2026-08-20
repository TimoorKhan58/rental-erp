import { useQuery } from "@tanstack/react-query";
import { PERMISSIONS } from "@/shared/application/authorization/permissions";
import { queryKeys } from "@/lib/query";
import { getCurrentUserPermissions } from "@/features/customer/services";
import { getAuditLogs } from "@/features/audit/services";
import type { DispatchResponse } from "../types";

export function useDispatchRelatedData(dispatch: DispatchResponse | undefined) {
  const permissions = useQuery({
    queryKey: queryKeys.permissions.me(),
    queryFn: getCurrentUserPermissions,
    staleTime: 5 * 60_000,
  });

  const permissionSet = permissions.data?.permissions ?? [];
  const canReadAudit = permissionSet.includes(PERMISSIONS.audit.read);

  const auditLogs = useQuery({
    queryKey: queryKeys.audit.list({
      entityType: "Dispatch",
      entityId: dispatch?.id,
      pageSize: 8,
      sortBy: "createdAt",
      sortOrder: "desc",
    }),
    queryFn: () =>
      getAuditLogs({
        entityType: "Dispatch",
        entityId: dispatch!.id,
        pageSize: 8,
        sortBy: "createdAt",
        sortOrder: "desc",
      }),
    enabled: Boolean(dispatch?.id) && canReadAudit,
    staleTime: 60_000,
  });

  return {
    permissions: {
      canReadAudit,
    },
    auditLogs: auditLogs.data?.items ?? [],
    auditTotal: auditLogs.data?.meta.total ?? 0,
    isLoading: auditLogs.isLoading,
  };
}
