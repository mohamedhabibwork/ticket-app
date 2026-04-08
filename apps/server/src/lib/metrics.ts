import { logger } from "./logger";

export interface MetricValue {
  value: number;
  timestamp: number;
  labels?: Record<string, string>;
}

export interface CounterMetric extends MetricValue {
  type: "counter";
}

export interface GaugeMetric extends MetricValue {
  type: "gauge";
}

export interface HistogramMetric extends MetricValue {
  type: "histogram";
  count: number;
  sum: number;
}

export type Metric = CounterMetric | GaugeMetric | HistogramMetric;

export interface MetricsStore {
  counters: Map<string, MetricValue[]>;
  gauges: Map<string, MetricValue[]>;
  histograms: Map<string, HistogramMetric[]>;
}

class InMemoryMetricsStore implements MetricsStore {
  counters = new Map<string, MetricValue[]>();
  gauges = new Map<string, MetricValue[]>();
  histograms = new Map<string, HistogramMetric[]>();
}

export const metricsStore = new InMemoryMetricsStore();

export interface MetricsCollector {
  incrementCounter(name: string, value?: number, labels?: Record<string, string>): void;
  setGauge(name: string, value: number, labels?: Record<string, string>): void;
  recordHistogram(name: string, value: number, labels?: Record<string, string>): void;
  getMetrics(): {
    counters: Map<string, MetricValue[]>;
    gauges: Map<string, MetricValue[]>;
    histograms: Map<string, HistogramMetric[]>;
  };
  getSnapshot(): Record<string, unknown>;
}

class MetricsCollectorImpl implements MetricsCollector {
  private store: MetricsStore;

  constructor(store: MetricsStore) {
    this.store = store;
  }

  incrementCounter(name: string, value: number = 1, labels?: Record<string, string>): void {
    const key = this.buildKey(name, labels);
    const entry: CounterMetric = {
      type: "counter",
      value,
      timestamp: Date.now(),
      labels,
    };

    const existing = this.store.counters.get(key) || [];
    existing.push(entry);
    this.store.counters.set(key, this.trimEntries(existing));

    logger.debug("Counter incremented", { name, value, labels });
  }

  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.buildKey(name, labels);
    const entry: GaugeMetric = {
      type: "gauge",
      value,
      timestamp: Date.now(),
      labels,
    };

    const existing = this.store.gauges.get(key) || [];
    existing.push(entry);
    this.store.gauges.set(key, this.trimEntries(existing));

    logger.debug("Gauge set", { name, value, labels });
  }

  recordHistogram(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.buildKey(name, labels);
    const now = Date.now();

    const existing = this.store.histograms.get(key) || [];
    const lastEntry = existing[existing.length - 1];

    let updatedEntry: HistogramMetric;

    if (lastEntry && now - lastEntry.timestamp < 60000) {
      lastEntry.value = value;
      lastEntry.count++;
      lastEntry.sum += value;
      lastEntry.timestamp = now;
      updatedEntry = lastEntry;
    } else {
      updatedEntry = {
        type: "histogram",
        value,
        count: 1,
        sum: value,
        timestamp: now,
        labels,
      };
      existing.push(updatedEntry);
    }

    this.store.histograms.set(key, this.trimEntries(existing) as HistogramMetric[]);

    logger.debug("Histogram recorded", { name, value, labels });
  }

  getMetrics() {
    return {
      counters: new Map(this.store.counters),
      gauges: new Map(this.store.gauges),
      histograms: new Map(this.store.histograms),
    };
  }

  getSnapshot(): Record<string, unknown> {
    const snapshot: Record<string, unknown> = {};

    for (const [key, values] of this.store.counters) {
      const total = values.reduce((sum, v) => sum + v.value, 0);
      snapshot[`counter_${key}`] = { total, values };
    }

    for (const [key, values] of this.store.gauges) {
      const latest = values[values.length - 1];
      snapshot[`gauge_${key}`] = { current: latest?.value, values };
    }

    for (const [key, values] of this.store.histograms) {
      const latest = values[values.length - 1];
      snapshot[`histogram_${key}`] = {
        count: latest?.count,
        sum: latest?.sum,
        avg: latest?.count ? latest.sum / latest.count : 0,
      };
    }

    return snapshot;
  }

  private buildKey(name: string, labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) {
      return name;
    }
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(",");
    return `${name}{${labelStr}}`;
  }

  private trimEntries<T extends MetricValue>(entries: T[]): T[] {
    const cutoff = Date.now() - 3600000;
    return entries.filter((e) => e.timestamp > cutoff);
  }
}

export const metrics = new MetricsCollectorImpl(metricsStore);

export const REQUEST_COUNT = "http_requests_total";
export const REQUEST_DURATION = "http_request_duration_seconds";
export const ACTIVE_REQUESTS = "http_active_requests";
export const DB_QUERY_COUNT = "db_queries_total";
export const DB_QUERY_DURATION = "db_query_duration_seconds";
export const RATE_LIMIT_HITS = "rate_limit_hits_total";
export const AUTH_FAILURES = "auth_failures_total";
export const TICKETS_CREATED = "tickets_created_total";
export const TICKET_RESPONSE_TIME = "ticket_response_time_seconds";

export function recordHttpRequest(
  method: string,
  path: string,
  status: number,
  durationMs: number
): void {
  const labels = { method, path, status: String(status) };

  metrics.incrementCounter(REQUEST_COUNT, 1, labels);
  metrics.recordHistogram(REQUEST_DURATION, durationMs / 1000, labels);

  if (durationMs > 1000) {
    metrics.incrementCounter("http_slow_requests_total", 1, labels);
  }
}

export function recordDbQuery(queryType: string, table: string, durationMs: number): void {
  const labels = { query_type: queryType, table };

  metrics.incrementCounter(DB_QUERY_COUNT, 1, labels);
  metrics.recordHistogram(DB_QUERY_DURATION, durationMs / 1000, labels);
}

export function getMetricsEndpoint(): string {
  const snapshot = metrics.getSnapshot();
  return JSON.stringify(snapshot, null, 2);
}
