# Historical ADR-005: API Convention & REST Design

> Archived by Release Phase R3. Current API compatibility is governed by `docs/ARCHITECTURE.md` and `docs/adr/ADR-013-Dashboard.md`.

**Status:** Accepted  
**Applies to:** v3.0 Milestone 6  
**Dependencies:** ADR-001, ADR-002, ADR-004  

## Context

The platform needs a consistent API that all clients (dashboard, CLI, future mobile app, future SDK) consume. Modules register endpoints, and the API layer provides auth, validation, rate limiting, and consistent response formatting.

## Decision

### URL Structure

```
/api/v1/
├── auth/                  # Authentication
│   ├── login              # GET → Discord OAuth2 redirect
│   ├── callback           # GET ← Discord OAuth2 callback
│   ├── logout             # POST → destroy session
│   └── session            # GET → current user info
├── guilds/                # Guild-scoped
│   ├── :guildId
│   │   ├── modules        # GET → enabled modules for guild
│   │   ├── settings       # GET → all settings values
│   │   ├── settings/:key  # GET / PUT → one setting
│   │   ├── permissions    # GET / PUT → permission overrides
│   │   └── audit          # GET → config change history
│   └── (no guildId)       # GET → user's guilds
├── modules/               # Module metadata (no guild context)
│   ├── :moduleId
│   │   ├── settings       # GET → setting metadata
│   │   ├── permissions    # GET → permission actions
│   │   └── manifest       # GET → full manifest
│   └── (no moduleId)      # GET → all modules
├── system/                # System
│   ├── health             # GET → health report
│   ├── version            # GET → version info
│   └── metrics            # GET → metrics snapshot
└── ws                     # WebSocket endpoint
```

### Response Format

```typescript
// Success
{
  "success": true,
  "data": T,
  "meta"?: { page: number; total: number; pageSize: number }
}

// Error
{
  "success": false,
  "error": {
    "code": "SETTING_VALIDATION_ERROR",
    "message": "Volume must be between 0 and 100",
    "details"?: Record<string, unknown>
  }
}
```

### Auth Levels

```typescript
type APIAuthLevel = 'public' | 'authenticated' | 'guild_member' | 'guild_admin' | 'bot_owner';
```

### Module Endpoint Registration

Modules register endpoints in `<name>.api.ts`:

```typescript
interface IAPIEndpoint {
  module: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;                          // relative to /api/v1
  handler: (req: IAPIRequest, ctx: IAPIContext) => Promise<IAPIResponse>;
  auth: APIAuthLevel;
  params?: z.ZodTypeAny;                 // path params
  query?: z.ZodTypeAny;                  // query string
  body?: z.ZodTypeAny;                   // request body
  rateLimit?: { window: number; max: number };
}
```

### Server Architecture

The API server runs in the same process as the bot (embedded Express/Fastify). Routes are populated from the API registry after all modules have registered their endpoints. The server starts after module initialization completes.

## Consequences

**Positive:**
- Consistent contract for all clients
- Modules self-register endpoints without modifying the server
- Auth, validation, and rate limiting are middleware, not per-endpoint code
- Standard error format enables type-safe client SDK generation

**Negative:**
- Embedded server shares the bot's event loop (mitigated by keeping handlers light)
- Discord OAuth2 adds session management complexity

## Related

- ADR-003: Config Provider (used by settings endpoints)
- ADR-004: Permission Model (auth checks reference permissions)
- ADR-008: Dashboard Architecture
