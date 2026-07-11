import type { Canvas } from '@napi-rs/canvas';

export type Context2D = ReturnType<Canvas['getContext']>;
export type LinearGradient = ReturnType<Context2D['createLinearGradient']>;
export type FillStyle = string | LinearGradient;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
