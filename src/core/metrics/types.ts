export interface ICounter {
  increment(value?: number): void;
  decrement(value?: number): void;
  value(): number;
}

export interface IGauge {
  set(value: number): void;
  value(): number;
}

export interface ITimer {
  start(): void;
  stop(): number;
  duration(): number;
}

export interface MetricsSnapshot {
  counters: Record<string, number>;
  gauges: Record<string, number>;
  timers: Record<string, { count: number; total: number; avg: number }>;
  uptime: number;
}

export interface IMetrics {
  counter(name: string): ICounter;
  gauge(name: string): IGauge;
  timer(name: string): ITimer;
  snapshot(): MetricsSnapshot;
}
