/**
 * In-process Prometheus-compatible metrics registry (Phase 8-007).
 * Process-local — not a substitute for a clustered Prometheus scrapers + aggregation.
 */

export type MetricLabels = Record<string, string>;

interface CounterSeries {
  name: string;
  help: string;
  values: Map<string, number>;
}

interface GaugeSeries {
  name: string;
  help: string;
  values: Map<string, number>;
}

interface HistogramSeries {
  name: string;
  help: string;
  buckets: number[];
  counts: Map<string, number[]>;
  sums: Map<string, number>;
}

function labelsKey(labels: MetricLabels): string {
  const keys = Object.keys(labels).sort();
  return keys.map((key) => `${key}=${labels[key]}`).join(",");
}

function escapeLabelValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/"/g, '\\"');
}

function formatLabels(labels: MetricLabels): string {
  const keys = Object.keys(labels);
  if (keys.length === 0) {
    return "";
  }
  return `{${keys
    .sort()
    .map((key) => `${key}="${escapeLabelValue(labels[key] ?? "")}"`)
    .join(",")}}`;
}

const DEFAULT_LATENCY_BUCKETS = [
  0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10,
];

class PrometheusRegistry {
  private readonly counters = new Map<string, CounterSeries>();
  private readonly gauges = new Map<string, GaugeSeries>();
  private readonly histograms = new Map<string, HistogramSeries>();
  private activeRequests = 0;
  private readonly startedAt = Date.now();
  private eventLoopLagMs = 0;
  private lagTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.ensureCounter(
      "http_requests_total",
      "Total HTTP API responses observed by the application metrics helper",
    );
    this.ensureHistogram(
      "http_request_duration_seconds",
      "HTTP API request duration in seconds",
      DEFAULT_LATENCY_BUCKETS,
    );
    this.ensureCounter(
      "http_request_errors_total",
      "HTTP API responses with status >= 500",
    );
    this.ensureGauge(
      "http_requests_in_flight",
      "In-flight HTTP API requests tracked by the application",
    );
    this.ensureHistogram(
      "db_query_duration_seconds",
      "Repository / database operation duration in seconds",
      DEFAULT_LATENCY_BUCKETS,
    );
    this.ensureCounter(
      "db_queries_total",
      "Total repository operations observed",
    );
    this.startEventLoopSampler();
  }

  observeHttpRequest(input: {
    method: string;
    route: string;
    status: number;
    durationMs?: number;
  }): void {
    const labels = {
      method: input.method.toUpperCase(),
      route: normalizeRouteLabel(input.route),
      status: String(input.status),
    };

    this.incCounter("http_requests_total", labels);

    if (input.status >= 500) {
      this.incCounter("http_request_errors_total", {
        method: labels.method,
        route: labels.route,
      });
    }

    if (input.durationMs !== undefined) {
      this.observeHistogram(
        "http_request_duration_seconds",
        {
          method: labels.method,
          route: labels.route,
        },
        input.durationMs / 1000,
      );
    }
  }

  beginRequest(): void {
    this.activeRequests += 1;
    this.setGauge("http_requests_in_flight", {}, this.activeRequests);
  }

  endRequest(): void {
    this.activeRequests = Math.max(0, this.activeRequests - 1);
    this.setGauge("http_requests_in_flight", {}, this.activeRequests);
  }

  observeDbQuery(input: {
    operation: string;
    success: boolean;
    durationMs: number;
    model?: string;
  }): void {
    const labels = {
      operation: input.operation,
      success: String(input.success),
      ...(input.model ? { model: input.model } : {}),
    };

    this.incCounter("db_queries_total", labels);
    this.observeHistogram(
      "db_query_duration_seconds",
      {
        operation: input.operation,
        ...(input.model ? { model: input.model } : {}),
      },
      input.durationMs / 1000,
    );
  }

  renderPrometheus(): string {
    const lines: string[] = [];

    this.setGauge("process_uptime_seconds", {}, (Date.now() - this.startedAt) / 1000);
    this.setGauge("nodejs_eventloop_lag_seconds", {}, this.eventLoopLagMs / 1000);

    const memory = process.memoryUsage();
    this.setGauge("process_resident_memory_bytes", {}, memory.rss);
    this.setGauge("nodejs_heap_size_used_bytes", {}, memory.heapUsed);
    this.setGauge("nodejs_heap_size_total_bytes", {}, memory.heapTotal);

    const cpu = process.cpuUsage();
    this.setGauge("process_cpu_user_seconds_total", {}, cpu.user / 1e6);
    this.setGauge("process_cpu_system_seconds_total", {}, cpu.system / 1e6);

    for (const series of this.counters.values()) {
      lines.push(`# HELP ${series.name} ${series.help}`);
      lines.push(`# TYPE ${series.name} counter`);
      for (const [key, value] of series.values) {
        const labels = keyToLabels(key);
        lines.push(`${series.name}${formatLabels(labels)} ${value}`);
      }
    }

    for (const series of this.gauges.values()) {
      lines.push(`# HELP ${series.name} ${series.help}`);
      lines.push(`# TYPE ${series.name} gauge`);
      for (const [key, value] of series.values) {
        const labels = keyToLabels(key);
        lines.push(`${series.name}${formatLabels(labels)} ${value}`);
      }
    }

    for (const series of this.histograms.values()) {
      lines.push(`# HELP ${series.name} ${series.help}`);
      lines.push(`# TYPE ${series.name} histogram`);
      for (const [key, counts] of series.counts) {
        const labels = keyToLabels(key);
        let cumulative = 0;
        for (let index = 0; index < series.buckets.length; index += 1) {
          cumulative += counts[index] ?? 0;
          lines.push(
            `${series.name}_bucket${formatLabels({ ...labels, le: String(series.buckets[index]) })} ${cumulative}`,
          );
        }
        cumulative += counts[series.buckets.length] ?? 0;
        lines.push(
          `${series.name}_bucket${formatLabels({ ...labels, le: "+Inf" })} ${cumulative}`,
        );
        const sum = series.sums.get(key) ?? 0;
        lines.push(`${series.name}_sum${formatLabels(labels)} ${sum}`);
        lines.push(`${series.name}_count${formatLabels(labels)} ${cumulative}`);
      }
    }

    return `${lines.join("\n")}\n`;
  }

  private ensureCounter(name: string, help: string): CounterSeries {
    let series = this.counters.get(name);
    if (!series) {
      series = { name, help, values: new Map() };
      this.counters.set(name, series);
    }
    return series;
  }

  private ensureGauge(name: string, help: string): GaugeSeries {
    let series = this.gauges.get(name);
    if (!series) {
      series = { name, help, values: new Map() };
      this.gauges.set(name, series);
    }
    return series;
  }

  private ensureHistogram(
    name: string,
    help: string,
    buckets: number[],
  ): HistogramSeries {
    let series = this.histograms.get(name);
    if (!series) {
      series = {
        name,
        help,
        buckets: [...buckets],
        counts: new Map(),
        sums: new Map(),
      };
      this.histograms.set(name, series);
    }
    return series;
  }

  private incCounter(name: string, labels: MetricLabels, by = 1): void {
    const series = this.ensureCounter(name, name);
    const key = labelsKey(labels);
    series.values.set(key, (series.values.get(key) ?? 0) + by);
  }

  private setGauge(name: string, labels: MetricLabels, value: number): void {
    const helpDefaults: Record<string, string> = {
      process_uptime_seconds: "Process uptime in seconds",
      nodejs_eventloop_lag_seconds: "Approximate event loop lag in seconds",
      process_resident_memory_bytes: "Resident set size in bytes",
      nodejs_heap_size_used_bytes: "V8 heap used in bytes",
      nodejs_heap_size_total_bytes: "V8 heap total in bytes",
      process_cpu_user_seconds_total: "User CPU time in seconds",
      process_cpu_system_seconds_total: "System CPU time in seconds",
      http_requests_in_flight: "In-flight HTTP API requests tracked by the application",
    };
    const series = this.ensureGauge(name, helpDefaults[name] ?? name);
    series.values.set(labelsKey(labels), value);
  }

  private observeHistogram(
    name: string,
    labels: MetricLabels,
    valueSeconds: number,
  ): void {
    const series = this.ensureHistogram(name, name, DEFAULT_LATENCY_BUCKETS);
    const key = labelsKey(labels);
    let counts = series.counts.get(key);
    if (!counts) {
      counts = new Array(series.buckets.length + 1).fill(0);
      series.counts.set(key, counts);
    }

    let bucketIndex = series.buckets.findIndex((bucket) => valueSeconds <= bucket);
    if (bucketIndex === -1) {
      bucketIndex = series.buckets.length;
    }
    counts[bucketIndex] = (counts[bucketIndex] ?? 0) + 1;
    series.sums.set(key, (series.sums.get(key) ?? 0) + valueSeconds);
  }

  private startEventLoopSampler(): void {
    if (this.lagTimer !== null || typeof setInterval === "undefined") {
      return;
    }

    let last = performance.now();
    this.lagTimer = setInterval(() => {
      const now = performance.now();
      const expected = 1000;
      this.eventLoopLagMs = Math.max(0, now - last - expected);
      last = now;
    }, 1000);

    if (typeof this.lagTimer === "object" && "unref" in this.lagTimer) {
      this.lagTimer.unref();
    }
  }
}

function keyToLabels(key: string): MetricLabels {
  if (!key) {
    return {};
  }
  const labels: MetricLabels = {};
  for (const part of key.split(",")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    labels[part.slice(0, eq)] = part.slice(eq + 1);
  }
  return labels;
}

function normalizeRouteLabel(route: string): string {
  const trimmed = route.trim() || "unknown";
  return trimmed.length > 120 ? trimmed.slice(0, 120) : trimmed;
}

const globalForMetrics = globalThis as typeof globalThis & {
  __rentalErpMetrics?: PrometheusRegistry;
};

export function getMetricsRegistry(): PrometheusRegistry {
  if (!globalForMetrics.__rentalErpMetrics) {
    globalForMetrics.__rentalErpMetrics = new PrometheusRegistry();
  }
  return globalForMetrics.__rentalErpMetrics;
}

export function renderPrometheusMetrics(): string {
  return getMetricsRegistry().renderPrometheus();
}
