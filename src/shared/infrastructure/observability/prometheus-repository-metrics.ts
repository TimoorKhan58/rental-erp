import type {
  IRepositoryMetrics,
  RepositoryMetricsObservation,
} from "@/shared/infrastructure/database/repository/observability/repository-metrics.interface";

import { getMetricsRegistry } from "./prometheus-registry";

/**
 * Bridges repository observability hooks to the in-process Prometheus registry.
 */
export const prometheusRepositoryMetrics: IRepositoryMetrics = {
  recordObservation(observation: RepositoryMetricsObservation): void {
    getMetricsRegistry().observeDbQuery({
      operation: observation.operation,
      success: observation.success,
      durationMs: observation.durationMs,
      model: observation.model,
    });
  },
};
