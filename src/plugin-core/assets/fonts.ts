import { GlobalFonts } from '@napi-rs/canvas';
import type { AssetDescriptor } from './schema.js';
import type { AssetResolver } from './resolver.js';

export interface FontRegistration {
  readonly descriptor: Extract<AssetDescriptor, { type: 'font' }>;
  dispose(): void;
}

interface ProcessRegistration {
  readonly descriptor: Extract<AssetDescriptor, { type: 'font' }>;
  references: number;
}

const processRegistrations = new Map<string, ProcessRegistration>();

export class AssetFontRegistry {
  private readonly owned = new Map<string, number>();

  constructor(private readonly resolver: AssetResolver) {}

  async register(owner: string, id: string): Promise<FontRegistration> {
    let processEntry = processRegistrations.get(id);
    if (!processEntry) {
      const handle = await this.resolver.resolve(owner, id);
      try {
        if (handle.descriptor.type !== 'font') throw new Error(`Asset is not a font: ${id}`);
        if (!GlobalFonts.register(handle.buffer, handle.descriptor.family)) throw new Error(`Font registration failed: ${id}`);
        processEntry = { references: 0, descriptor: handle.descriptor };
        processRegistrations.set(id, processEntry);
      } finally {
        handle.release();
      }
    } else if (processEntry.descriptor.owner !== owner) {
      throw new Error(`Font is not declared for owner ${owner}: ${id}`);
    }
    processEntry.references += 1;
    this.owned.set(id, (this.owned.get(id) ?? 0) + 1);
    return this.createRegistration(id, processEntry.descriptor);
  }

  dispose(): void {
    for (const [id, count] of this.owned) this.release(id, count);
    this.owned.clear();
  }

  private createRegistration(id: string, descriptor: Extract<AssetDescriptor, { type: 'font' }>): FontRegistration {
    let disposed = false;
    return Object.freeze({ descriptor, dispose: () => { if (disposed) return; disposed = true; const count = this.owned.get(id) ?? 0; if (count <= 1) this.owned.delete(id); else this.owned.set(id, count - 1); this.release(id, 1); } });
  }

  private release(id: string, count: number): void {
    const processEntry = processRegistrations.get(id);
    if (!processEntry) return;
    processEntry.references -= count;
    if (processEntry.references <= 0) processRegistrations.delete(id);
  }
}
