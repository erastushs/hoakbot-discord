export const CANVAS_FONT_FAMILY = '"Noto Sans", "Noto Sans CJK JP", "Noto Color Emoji", sans-serif';

export function canvasFont(size: number, weight: number | 'bold' | 'normal' = 'bold'): string {
  return `${weight} ${size}px ${CANVAS_FONT_FAMILY}`;
}
