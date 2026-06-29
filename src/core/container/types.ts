export type InjectionToken<T> = symbol & { __brand: T };

export type Factory<T> = (container: IContainer) => T;

export interface IContainer {
  registerSingleton<T>(token: InjectionToken<T>, factory: Factory<T>): void;
  registerTransient<T>(token: InjectionToken<T>, factory: Factory<T>): void;
  registerFactory<T>(token: InjectionToken<T>, factory: Factory<T>): void;
  resolve<T>(token: InjectionToken<T>): T;
  has(token: InjectionToken<unknown>): boolean;
  clear(): void;
}
