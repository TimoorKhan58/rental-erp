export interface ErrorTrackerContext {
  requestId?: string;
  correlationId?: string;
  tenantId?: string;
  userId?: string;
  route?: string;
  httpMethod?: string;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
}

/**
 * Vendor-neutral error tracking integration point.
 * Implementations may forward to Sentry, Datadog, New Relic, Azure, etc.
 * Default is a no-op — no vendor SDK is required.
 */
export interface IErrorTracker {
  captureException(error: unknown, context?: ErrorTrackerContext): void;
  captureMessage(
    message: string,
    level?: "info" | "warning" | "error",
    context?: ErrorTrackerContext,
  ): void;
}

export const noopErrorTracker: IErrorTracker = {
  captureException(): void {
    // Intentionally empty — vendor SDKs are optional.
  },
  captureMessage(): void {
    // Intentionally empty.
  },
};
