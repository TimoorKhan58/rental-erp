import {
  QueryClient,
  type DefaultOptions,
  type QueryClientConfig,
} from "@tanstack/react-query";
import { ApiClientError } from "@/lib/api";

const defaultQueryOptions: DefaultOptions = {
  queries: {
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: (failureCount, error) => {
      if (error instanceof ApiClientError) {
        if (error.status === 401 || error.status === 403 || error.status === 404) {
          return false;
        }
      }

      return failureCount < 2;
    },
    refetchOnWindowFocus: false,
  },
  mutations: {
    retry: false,
  },
};

export function createQueryClient(config?: QueryClientConfig): QueryClient {
  return new QueryClient({
    ...config,
    defaultOptions: {
      ...defaultQueryOptions,
      ...config?.defaultOptions,
      queries: {
        ...defaultQueryOptions.queries,
        ...config?.defaultOptions?.queries,
      },
      mutations: {
        ...defaultQueryOptions.mutations,
        ...config?.defaultOptions?.mutations,
      },
    },
  });
}

export const queryClient = createQueryClient();
