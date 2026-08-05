import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query";
import { getRoles } from "../services";

export function useRoles(enabled = true) {
  return useQuery({
    queryKey: queryKeys.users.roles(),
    queryFn: getRoles,
    staleTime: 5 * 60_000,
    enabled,
  });
}
