export interface RepositoryMetricsObservation {
  operation: string;
  durationMs: number;
  success: boolean;
  model?: string;
  repositoryName?: string;
  requestId?: string;
  userId?: string;
  route?: string;
  inTransaction?: boolean;
}

export interface IRepositoryMetrics {
  recordObservation(observation: RepositoryMetricsObservation): void;
}

export const noopRepositoryMetrics: IRepositoryMetrics = {
  recordObservation(): void {
    // Intentionally empty — default when no metrics backend is configured.
  },
};
