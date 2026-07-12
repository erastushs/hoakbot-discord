export interface DashboardStateEvent {
  guildId: string;
  moduleIds: readonly string[];
}

export class DashboardStateEvents {
  private readonly subscribers = new Set<(event: DashboardStateEvent) => void>();

  subscribe(handler: (event: DashboardStateEvent) => void): () => void {
    this.subscribers.add(handler);
    return () => this.subscribers.delete(handler);
  }

  publish(event: DashboardStateEvent): void {
    for (const subscriber of this.subscribers) subscriber(event);
  }
}
