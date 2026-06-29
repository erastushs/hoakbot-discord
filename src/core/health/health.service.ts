import type { HealthCheck, HealthReport, HealthStatus, IHealthService, SubsystemHealth } from './types.js';
import type { ILogger } from '../logger/logger.service.js';

export class HealthService implements IHealthService {
  private readonly checks: HealthCheck[] = [];
  private readonly startTime = Date.now();

  constructor(private readonly logger: ILogger) {}

  registerCheck(check: HealthCheck): void {
    this.checks.push(check);
  }

  async runAll(): Promise<HealthReport> {
    const subsystems: Record<string, SubsystemHealth> = {};

    for (const check of this.checks) {
      try {
        const result = await check.execute();
        subsystems[check.name] = result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        subsystems[check.name] = { status: 'unhealthy', message };
      }
    }

    const overall = this.computeOverallStatus(subsystems);
    const uptime = Math.round((Date.now() - this.startTime) / 1000);

    this.logHealthSummary(overall, subsystems);

    return {
      status: overall,
      timestamp: Date.now(),
      uptime,
      subsystems,
    };
  }

  private computeOverallStatus(subsystems: Record<string, SubsystemHealth>): HealthStatus {
    const statuses = Object.values(subsystems).map((s) => s.status);
    if (statuses.some((s) => s === 'unhealthy')) return 'unhealthy';
    if (statuses.some((s) => s === 'degraded')) return 'degraded';
    return 'healthy';
  }

  private logHealthSummary(overall: HealthStatus, subsystems: Record<string, SubsystemHealth>): void {
    const unhealthy = Object.entries(subsystems).filter(([, s]) => s.status === 'unhealthy');
    const degraded = Object.entries(subsystems).filter(([, s]) => s.status === 'degraded');

    if (unhealthy.length > 0) {
      this.logger.error({ unhealthy: unhealthy.map(([n]) => n) }, 'Health check: unhealthy subsystems detected');
    }
    if (degraded.length > 0) {
      this.logger.warn({ degraded: degraded.map(([n]) => n) }, 'Health check: degraded subsystems detected');
    }
    if (unhealthy.length === 0 && degraded.length === 0) {
      this.logger.info(
        { status: overall, subsystemCount: Object.keys(subsystems).length },
        'Health check: all systems healthy',
      );
    }
  }
}
