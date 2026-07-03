export interface PlaceholderInfo {
  key: string;
  description: string;
  example: string;
  category: string;
}

export interface FormatterFn {
  (value: string): string;
}
