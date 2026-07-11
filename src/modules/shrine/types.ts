export type ShrineUsageTier = 'veryhigh' | 'high' | 'medium' | 'low' | 'unknown';

export interface ShrinePerk {
  id: number;
  name: string;
  character: string;
  shards: number;
  bloodpoints: number;
  image: string;
  usageTier: ShrineUsageTier;
}

export interface ShrineRotation {
  week: number;
  start: Date;
  end: Date;
  perks: ShrinePerk[];
}

export interface ShrineClientOptions {
  baseUrl: string;
  retries: number;
  retryDelayMs: number;
  timeoutMs: number;
}
