import type { RepositoryOperationMeta } from "../repository-types";
import type { RepositoryObservationContext } from "./repository-observation-context";
import type { RepositoryMetricsObservation } from "./repository-metrics.interface";

export interface RepositoryObservationMeta extends RepositoryOperationMeta {
  durationMs?: number;
  success?: boolean;
  repositoryName?: string;
  requestId?: string;
  userId?: string;
  route?: string;
  httpMethod?: string;
  inTransaction?: boolean;
}

export function buildRepositoryObservationMeta(
  observationContext: RepositoryObservationContext | undefined,
  operationMeta: RepositoryOperationMeta | undefined,
  repositoryName?: string,
): RepositoryObservationMeta {
  return {
    repositoryName,
    requestId: observationContext?.requestId,
    userId: observationContext?.userId,
    route: observationContext?.route,
    httpMethod: observationContext?.httpMethod,
    inTransaction: observationContext?.inTransaction,
    ...operationMeta,
  };
}

export function toRepositoryMetricsObservation(
  meta: RepositoryObservationMeta,
  durationMs: number,
  success: boolean,
): RepositoryMetricsObservation {
  return {
    operation: meta.operation ?? "unknown",
    durationMs,
    success,
    model: meta.model,
    repositoryName: meta.repositoryName,
    requestId: meta.requestId,
    userId: meta.userId,
    route: meta.route,
    inTransaction: meta.inTransaction,
  };
}

export function measureDurationMs(startedAt: number): number {
  return Math.round(performance.now() - startedAt);
}
