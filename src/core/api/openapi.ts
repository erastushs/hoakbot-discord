import type { APIEndpoint, APIHttpMethod, APIOperationMetadata } from './types.js';

export interface OpenAPIEndpointMetadata extends APIOperationMetadata {
  method: APIHttpMethod;
  path: string;
  auth: string;
}

export class OpenAPIMetadataRegistry {
  private readonly operations = new Map<string, OpenAPIEndpointMetadata>();

  register(endpoint: APIEndpoint, fullPath = endpoint.path): void {
    const metadata: OpenAPIEndpointMetadata = {
      ...endpoint.metadata,
      method: endpoint.method,
      path: fullPath,
      auth: endpoint.auth,
    };

    if (this.operations.has(metadata.operationId)) {
      throw new Error(`Duplicate API operation id "${metadata.operationId}".`);
    }

    this.operations.set(metadata.operationId, metadata);
  }

  get(operationId: string): OpenAPIEndpointMetadata | undefined {
    return this.operations.get(operationId);
  }

  getAll(): OpenAPIEndpointMetadata[] {
    return [...this.operations.values()];
  }

  getByTag(tag: string): OpenAPIEndpointMetadata[] {
    return this.getAll().filter((operation) => operation.tags.includes(tag));
  }
}
