# API Convention Specification

## Base URL

All API routes are prefixed with `/api/v1`.

## Authentication

### Discord OAuth2 Flow

1. Client redirects to `GET /api/v1/auth/login?redirect=/dashboard`
2. Server redirects to Discord OAuth2 authorize URL with `identify guilds` scopes
3. Discord redirects back to `GET /api/v1/auth/callback?code=...&state=...`
4. Server exchanges code for access token, fetches user info
5. Server creates session (signed cookie, httpOnly, secure, sameSite=lax)
6. Server redirects to the original `redirect` URL

### Session Cookie

- Name: `hoak_session`
- Signed with a random secret from `SESSION_SECRET` env var
- Expires: 7 days
- Contains: `{ userId, username, avatar, accessToken, expiresAt }`

### Auth Middleware

The auth middleware extracts the session cookie and attaches `req.user` to the request. Route-level auth guards check `req.user` against the endpoint's required `APIAuthLevel`.

## Request/Response Format

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "pageSize": 50,
    "total": 142
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "volume": "Must be between 0 and 100"
    }
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTH_REQUIRED` | 401 | No session |
| `AUTH_EXPIRED` | 401 | Session expired |
| `FORBIDDEN` | 403 | Not authorized |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 422 | Request validation failed |
| `RATE_LIMITED` | 429 | Rate limit exceeded |
| `CONFLICT` | 409 | Version conflict |
| `INTERNAL_ERROR` | 500 | Server error |

## Pagination

Paginated endpoints accept `?page=1&pageSize=50` query parameters. Default page size is 50, max is 200. Responses include the `meta` block.

## Rate Limiting

- Authenticated: 200 req/min per user
- Unauthenticated: 20 req/min per IP
- Settings writes: 30 req/min per guild
- Rate limit headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## Standard Routes Summary

| Method | Path | Auth Level | Description |
|--------|------|-----------|-------------|
| GET | `/api/v1/auth/login` | public | OAuth2 login |
| GET | `/api/v1/auth/callback` | public | OAuth2 callback |
| POST | `/api/v1/auth/logout` | authenticated | Destroy session |
| GET | `/api/v1/auth/session` | authenticated | Current user |
| GET | `/api/v1/guilds` | authenticated | User's guilds |
| GET | `/api/v1/guilds/:id` | guild_member | Guild details |
| GET | `/api/v1/guilds/:id/modules` | guild_member | Enabled modules |
| GET | `/api/v1/guilds/:id/settings` | guild_member | All settings values |
| GET | `/api/v1/guilds/:id/settings/:key` | guild_member | One setting value |
| PUT | `/api/v1/guilds/:id/settings/:key` | guild_admin | Update setting |
| PATCH | `/api/v1/guilds/:id/settings` | guild_admin | Bulk update |
| GET | `/api/v1/guilds/:id/audit` | guild_admin | Config change history |
| GET | `/api/v1/modules` | public | All module manifests |
| GET | `/api/v1/modules/:id` | public | Module manifest |
| GET | `/api/v1/modules/:id/settings` | public | Setting metadata |
| GET | `/api/v1/modules/:id/permissions` | public | Permission actions |
| GET | `/api/v1/system/health` | public | Health report |
| GET | `/api/v1/system/version` | public | Version info |
| GET | `/api/v1/system/metrics` | bot_owner | Metrics snapshot |
