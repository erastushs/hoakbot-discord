import type { Factory, IContainer, InjectionToken } from './types.js';

interface Registration<T> {
  factory: Factory<T>;
  singleton: boolean;
  instance?: T;
}

export class Container implements IContainer {
  private readonly registrations = new Map<InjectionToken<unknown>, Registration<unknown>>();
  private readonly resolving = new Set<InjectionToken<unknown>>();

  registerSingleton<T>(token: InjectionToken<T>, factory: Factory<T>): void {
    this.register(token, factory, true);
  }

  registerTransient<T>(token: InjectionToken<T>, factory: Factory<T>): void {
    this.register(token, factory, false);
  }

  registerFactory<T>(token: InjectionToken<T>, factory: Factory<T>): void {
    this.register(token, factory, false);
  }

  resolve<T>(token: InjectionToken<T>): T {
    const registration = this.registrations.get(token);
    if (!registration) {
      throw new Error(`No registration found for token: ${String(token)}`);
    }

    if (registration.singleton && registration.instance !== undefined) {
      return registration.instance as T;
    }

    if (this.resolving.has(token)) {
      throw new Error(`Circular dependency detected for token: ${String(token)}`);
    }

    this.resolving.add(token);
    try {
      const instance = registration.factory(this) as T;
      if (registration.singleton) {
        registration.instance = instance;
      }
      return instance;
    } finally {
      this.resolving.delete(token);
    }
  }

  has(token: InjectionToken<unknown>): boolean {
    return this.registrations.has(token);
  }

  clear(): void {
    this.registrations.clear();
    this.resolving.clear();
  }

  private register<T>(token: InjectionToken<T>, factory: Factory<T>, singleton: boolean): void {
    if (this.registrations.has(token)) {
      throw new Error(`Duplicate registration for token: ${String(token)}`);
    }
    this.registrations.set(token, { factory, singleton });
  }
}
