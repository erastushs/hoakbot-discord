# Validation Strategy Specification

## Overview

Validation happens at every system boundary. No unvalidated data reaches internal code.

## Validation Layers

| Layer | Validator | Scope |
|-------|-----------|-------|
| Environment | Zod `envSchema` | Startup — validates `.env` on boot |
| Config files | Zod `appConfigSchema` | Startup — validates `bot.json` on boot |
| Module manifests | Zod `manifestSchema` | Registration — validates manifest structure |
| Setting values | Per-setting Zod schema | Write — validates value against setting metadata |
| API requests | Zod per-endpoint schema | Request — validates path, query, body |
| Events | TypeScript interface | Publish — compile-time type checking |
| Database | Column constraints + JSONB | Write — database-level validation |

## Zod Schema Strategy

1. **Core schemas** live in `src/core/validation/schemas/`
2. **Module schemas** live in the module directory
3. **Setting validation schemas** are attached to `ISettingMetadata.validation`
4. **API schemas** are attached to `IAPIEndpoint.params`, `.query`, `.body`

## Schema Serialization

Setting validation schemas need to be transmitted to the dashboard for client-side validation. Use `zod-to-json-schema` to convert Zod schemas to JSON Schema for API responses.

```typescript
import { zodToJsonSchema } from 'zod-to-json-schema';

// On the API side:
const setting: ISettingMetadata = {
  key: 'voice.volume',
  type: 'number',
  // ...
  validation: z.number().min(0).max(100),
};

// When returning to dashboard:
const apiResponse = {
  ...setting,
  validationSchema: zodToJsonSchema(setting.validation),
  // validation field is NOT serialized directly
};
```

## Error Format

Validation errors use a consistent format:

```typescript
interface ValidationError {
  path: string[];          // e.g., ["body", "volume"]
  message: string;         // e.g., "Must be between 0 and 100"
  code: string;            // e.g., "too_small"
}
```

## i18n Readiness

Validation messages use parameterized templates for future i18n:

```typescript
// Instead of: "Volume must be between 0 and 100"
// Use: { key: "validation.number.range", params: { min: 0, max: 100, field: "Volume" } }
```

In v3, messages are in English only. The message format supports i18n.
