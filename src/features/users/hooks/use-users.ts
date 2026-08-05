import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query";
import type { ListUsersParams } from "../types";
import { getUser, getUsers } from "../services";

export function useUsers(params: ListUsersParams, enabled = true) {
  return useQuery({
    queryKey: queryKeys.users.list(params),
    queryFn: () => getUsers(params),
    enabled,
  });
}

export function useUser(id: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.users.detail(id),
    queryFn: () => getUser(id),
    enabled: Boolean(id) && enabled,
  });
}
