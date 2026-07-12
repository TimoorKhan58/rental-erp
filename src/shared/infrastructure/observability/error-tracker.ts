import { observabilityConfig } from "@/shared/config/observability.config";
import { createAppLogger } from "@/shared/infrastructure/logging/create-app-logger";

import {
  noopErrorTracker,
  type ErrorTrackerContext,
  type IErrorTracker,
} from "./error-tracker.interface";

/**
 * Logs exceptions at error level with redacted context.
 * When ERROR_TRACKER_PROVIDER is configured, this is the integration point
 * to attach a vendor SDK without changing business modules.
 */
class LoggingErrorTracker implements IErrorTracker {
  private readonly logger = createAppLogger({
    bindings: { component: "error-tracker" },
  });

  captureException(error: unknown, context?: ErrorTrackerContext): void {
    this.logger.error("Unhandled or reported exception", error, {
      provider: observabilityConfig.errorTracker.provider,
      ...context,
    });

    // Vendor SDK hook — intentionally not imported.
    // Operators wire Sentry/Datadog/etc. here or via instrumentation.ts.
    void observabilityConfig.errorTracker.dsn;
  }

  captureMessage(
    message: string,
    level: "info" | "warning" | "error" = "error",
    context?: ErrorTrackerContext,
  ): void {
    const meta = {
      provider: observabilityConfig.errorTracker.provider,
      ...context,
    };

    if (level === "info") {
      this.logger.info(message, meta);
      return;
    }

    if (level === "warning") {
      this.logger.warn(message, meta);
      return;
    }

    this.logger.error(message, undefined, meta);
  }
}

const globalForTracker = globalThis as typeof globalThis & {
  __rentalErpErrorTracker?: IErrorTracker;
};

export function getErrorTracker(): IErrorTracker {
  if (observabilityConfig.errorTracker.provider === "none") {
    return noopErrorTracker;
  }

  if (!globalForTracker.__rentalErpErrorTracker) {
    globalForTracker.__rentalErpErrorTracker = new LoggingErrorTracker();
  }

  return globalForTracker.__rentalErpErrorTracker;
}

export function reportRouteError(
  error: unknown,
  context?: ErrorTrackerContext,
): void {
  getErrorTracker().captureException(error, context);
}
