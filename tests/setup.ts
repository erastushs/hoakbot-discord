import { vi } from 'vitest';

vi.mock('../src/core/logger/logger.service.js', () => ({
  createLogger: vi.fn(() => ({
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn(() => ({
      trace: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      fatal: vi.fn(),
    })),
  })),
}));

const mockMetrics = {
  counter: vi.fn(() => ({ increment: vi.fn() })),
  gauge: vi.fn(() => ({ set: vi.fn(), increment: vi.fn() })),
  timer: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
  snapshot: vi.fn(() => ({})),
};

vi.mock('../src/core/metrics/metrics.service.js', () => ({
  MetricsService: vi.fn(() => mockMetrics),
  createMetricsService: vi.fn(() => mockMetrics),
}));

const mockEventBus = {
  emit: vi.fn(),
  subscribe: vi.fn(() => vi.fn()),
  publish: vi.fn(),
};

vi.mock('../src/core/event-bus/event-bus.js', () => ({
  EventBus: vi.fn(() => mockEventBus),
}));

export { mockMetrics, mockEventBus };
