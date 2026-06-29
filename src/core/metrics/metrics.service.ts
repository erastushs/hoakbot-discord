import type { ICounter, IGauge, IMetrics, ITimer, MetricsSnapshot } from './types.js';

class Counter implements ICounter {
  private count = 0;

  increment(value = 1): void {
    this.count += value;
  }

  decrement(value = 1): void {
    this.count -= value;
  }

  value(): number {
    return this.count;
  }
}

class Gauge implements IGauge {
  private val = 0;

  set(value: number): void {
    this.val = value;
  }

  value(): number {
    return this.val;
  }
}

class Timer implements ITimer {
  private startTime = 0;
  private elapsed = 0;

  start(): void {
    this.startTime = performance.now();
  }

  stop(): number {
    if (this.startTime > 0) {
      this.elapsed = performance.now() - this.startTime;
      this.startTime = 0;
    }
    return this.elapsed;
  }

  duration(): number {
    if (this.startTime > 0) {
      return performance.now() - this.startTime;
    }
    return this.elapsed;
  }
}

export class MetricsService implements IMetrics {
  private readonly counters = new Map<string, Counter>();
  private readonly gauges = new Map<string, Gauge>();
  private readonly timers = new Map<string, Timer>();
  private readonly startTime = Date.now();

  counter(name: string): ICounter {
    let c = this.counters.get(name);
    if (!c) {
      c = new Counter();
      this.counters.set(name, c);
    }
    return c;
  }

  gauge(name: string): IGauge {
    let g = this.gauges.get(name);
    if (!g) {
      g = new Gauge();
      this.gauges.set(name, g);
    }
    return g;
  }

  timer(name: string): ITimer {
    let t = this.timers.get(name);
    if (!t) {
      t = new Timer();
      this.timers.set(name, t);
    }
    return t;
  }

  snapshot(): MetricsSnapshot {
    const counters: Record<string, number> = {};
    for (const [name, counter] of this.counters) {
      counters[name] = counter.value();
    }

    const gauges: Record<string, number> = {};
    for (const [name, gauge] of this.gauges) {
      gauges[name] = gauge.value();
    }

    const timers: Record<string, { count: number; total: number; avg: number }> = {};
    for (const [name, timer] of this.timers) {
      const elapsed = timer.duration();
      timers[name] = { count: 1, total: elapsed, avg: elapsed };
    }

    return {
      counters,
      gauges,
      timers,
      uptime: Math.round((Date.now() - this.startTime) / 1000),
    };
  }
}
