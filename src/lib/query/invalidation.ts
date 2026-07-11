import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { queryKeys } from "./keys";

export function invalidateQueries(
  client: QueryClient,
  queryKey: QueryKey,
): Promise<void> {
  return client.invalidateQueries({ queryKey });
}

export function invalidateResourceLists(
  client: QueryClient,
  resource: string,
): Promise<void> {
  return client.invalidateQueries({
    queryKey: [...queryKeys.lists(), resource],
  });
}

export function invalidateResourceDetail(
  client: QueryClient,
  resource: string,
  id: string,
): Promise<void> {
  return client.invalidateQueries({
    queryKey: queryKeys.detail(resource, id),
  });
}

export function removeResourceDetail(
  client: QueryClient,
  resource: string,
  id: string,
): void {
  client.removeQueries({
    queryKey: queryKeys.detail(resource, id),
  });
}

export function resetAllQueries(client: QueryClient): void {
  client.clear();
}
