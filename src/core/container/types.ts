export type InjectionToken<T> = symbol & { __brand: T };

export interface IContainer {
  register<T>(token: InjectionToken<T>, factory: () => T): void;
  registerSingleton<T>(token: InjectionToken<T>, factory: () => T): void;
  resolve<T>(token: InjectionToken<T>): T;
}
