export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface SubsystemHealth {
  status: HealthStatus;
  latencyMs?: number;
  message?: string;
  metadata?: Record<string, unknown>;
}

export interface HealthReport {
  status: HealthStatus;
  timestamp: number;
  uptime: number;
  subsystems: Record<string, SubsystemHealth>;
}

export interface HealthCheck {
  name: string;
  execute(): Promise<SubsystemHealth>;
}

export interface IHealthService {
  registerCheck(check: HealthCheck): void;
  runAll(): Promise<HealthReport>;
}
