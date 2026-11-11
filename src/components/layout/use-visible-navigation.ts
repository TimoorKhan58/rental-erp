"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { NAVIGATION_GROUPS } from "@/constants/navigation";
import { filterNavigationGroups } from "@/constants/navigation-access";
import { getCurrentUserPermissions } from "@/features/customer/services";
import { queryKeys } from "@/lib/query";

export function useVisibleNavigation() {
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.permissions.me(),
    queryFn: getCurrentUserPermissions,
    staleTime: 5 * 60_000,
  });

  const permissions = useMemo(() => data?.permissions ?? [], [data?.permissions]);
  const ready = !isLoading && !isError && data !== undefined;

  const groups = useMemo(() => {
    if (!ready) {
      return NAVIGATION_GROUPS;
    }

    return filterNavigationGroups(NAVIGATION_GROUPS, permissions);
  }, [permissions, ready]);

  return {
    groups,
    permissions,
    ready,
    isLoading,
  };
}
