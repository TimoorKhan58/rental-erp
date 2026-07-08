import type { Prisma } from "@/generated/prisma/client";
import type { ILogger } from "@/shared/infrastructure/logging";

import { withPrismaError } from "../../repository-base";
import type { DbClient } from "../../prisma-types";
import type { RepositoryOperationMeta } from "../repository-types";
import type { RepositoryRunner } from "../repository-runner";
import {
  buildRepositoryObservationMeta,
  measureDurationMs,
  toRepositoryMetricsObservation,
} from "./repository-observation-meta";
import type { RepositoryObservationContext } from "./repository-observation-context";
import type { IRepositoryMetrics } from "./repository-metrics.interface";
import { noopRepositoryMetrics } from "./repository-metrics.interface";

export interface ObservableRepositoryRunnerOptions {
  runner: RepositoryRunner;
  logger?: ILogger;
  metrics?: IRepositoryMetrics;
  observationContext?: RepositoryObservationContext;
  repositoryName?: string;
}

export function createObservableRepositoryRunner(
  options: ObservableRepositoryRunnerOptions,
): RepositoryRunner {
  const metrics = options.metrics ?? noopRepositoryMetrics;

  return {
    get db(): DbClient {
      return options.runner.db;
    },

    async run<T>(
      operation: (db: DbClient) => Promise<T>,
      meta?: RepositoryOperationMeta,
    ): Promise<T> {
      const startedAt = performance.now();
      const observationMeta = buildRepositoryObservationMeta(
        options.observationContext,
        meta,
        options.repositoryName,
      );

      options.logger?.debug("Repository operation started", observationMeta);

      try {
        const result = await withPrismaError(() => operation(options.runner.db));
        const durationMs = measureDurationMs(startedAt);
        const completedMeta = {
          ...observationMeta,
          durationMs,
          success: true,
        };

        options.logger?.debug("Repository operation completed", completedMeta);
        metrics.recordObservation(
          toRepositoryMetricsObservation(observationMeta, durationMs, true),
        );

        return result;
      } catch (error) {
        const durationMs = measureDurationMs(startedAt);
        const failedMeta = {
          ...observationMeta,
          durationMs,
          success: false,
        };

        options.logger?.error(
          "Repository operation failed",
          error,
          failedMeta,
        );
        metrics.recordObservation(
          toRepositoryMetricsObservation(observationMeta, durationMs, false),
        );

        throw error;
      }
    },

    withTransaction(tx: Prisma.TransactionClient): RepositoryRunner {
      return createObservableRepositoryRunner({
        ...options,
        runner: options.runner.withTransaction(tx),
        observationContext: {
          ...options.observationContext,
          inTransaction: true,
        },
      });
    },
  };
}
