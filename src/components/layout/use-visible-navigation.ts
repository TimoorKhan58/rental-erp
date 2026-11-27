"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  NAVIGATION_AREAS,
  NAVIGATION_GROUPS,
  SETTINGS_AREA,
} from "@/constants/navigation";
import {
  filterNavigationAreas,
  filterNavigationGroups,
} from "@/constants/navigation-access";
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

  const { areas, settingsArea, groups } = useMemo(() => {
    if (!ready) {
      return {
        areas: NAVIGATION_AREAS,
        settingsArea: SETTINGS_AREA,
        groups: NAVIGATION_GROUPS,
      };
    }

    return {
      areas: filterNavigationAreas(NAVIGATION_AREAS, permissions),
      settingsArea: filterNavigationAreas([SETTINGS_AREA], permissions)[0] ?? null,
      groups: filterNavigationGroups(NAVIGATION_GROUPS, permissions),
    };
  }, [permissions, ready]);

  return {
    areas,
    settingsArea,
    groups,
    permissions,
    ready,
    isLoading,
  };
}
