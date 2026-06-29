import type { IContainer } from '../core/container/types.js';

export interface IModule {
  readonly name: string;
  readonly version: string;
  readonly enabled: boolean;
  register(container: IContainer): void;
  onStart?(): Promise<void>;
  onShutdown?(): Promise<void>;
}
