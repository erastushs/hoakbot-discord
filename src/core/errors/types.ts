export class DatabaseConnectionError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'DatabaseConnectionError';
    this.cause = cause;
  }
}

export class DatabaseQueryError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'DatabaseQueryError';
    this.cause = cause;
  }
}

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}
