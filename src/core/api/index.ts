export { APIAuthorizationService, UserGuildOwnershipChecker } from './authorization.js';
export { APIError, apiError, toAPIErrorResponse } from './errors.js';
export { createAuthEndpoints } from './auth.endpoints.js';
export { MemoryAuthProvider } from './memory-auth.provider.js';
export { createModuleConfigEndpoints } from './module-config.endpoints.js';
export { OpenAPIMetadataRegistry } from './openapi.js';
export { APIRouter } from './router.js';
export { createSessionAuthMiddleware, readCookie } from './session-auth.middleware.js';
export { createAPIHttpServer } from './server.js';
export { fail, noContent, ok, paginated } from './responses.js';
export { validateRequest, validateSchema, validationMiddleware } from './validation.js';
export {
  getModuleParamsSchema,
  getSettingsParamsSchema,
  paginationQuerySchema,
  patchSettingsBodySchema,
  patchSettingsParamsSchema,
} from './contract.schemas.js';
export type {
  APIAuthorizationRequest,
  GuildOwnershipChecker,
} from './authorization.js';
export type { AuthEndpointDependencies } from './auth.endpoints.js';
export type { SessionAuthMiddlewareDependencies } from './session-auth.middleware.js';
export type {
  AuthProvider,
  GuildMembership,
  Identity,
  Session,
  UserContext,
} from './auth.types.js';
export type {
  GetManifestsResponse,
  GetMetadataRequest,
  GetMetadataResponse,
  GetModulesResponse,
  GetSettingsRequest,
  GetSettingsResponse,
  PatchSettingsRequest,
  PatchSettingsResponse,
  SettingMetadataContract,
  SettingValueContract,
} from './contracts.js';
export type { ModuleConfigEndpointDependencies } from './module-config.endpoints.js';
export type { OpenAPIEndpointMetadata } from './openapi.js';
export type { APIHttpServer, APIHttpServerOptions } from './server.js';
export type {
  APIAuthLevel,
  APIEndpoint,
  APIErrorBody,
  APIErrorCode,
  APIErrorResponse,
  APIHandler,
  APIHttpMethod,
  APIMiddleware,
  APINext,
  APIOperationMetadata,
  APIPaginationMeta,
  APIRegisteredRoute,
  APIRequest,
  APIRequestContext,
  APIResponse,
  APIRateLimit,
  APISuccessResponse,
} from './types.js';
export type { APIFieldValidationError, APIValidationResult } from './validation.js';
