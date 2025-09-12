/**
 * API Configuration
 */

export interface ApiConfig {
  endpoints: {
    browser: string;
    tests: string;
    health: string;
  };
  defaults: {
    timeout: number;
    retries: number;
    retryDelay: number;
  };
  headers: {
    contentType: string;
    accept: string;
    userAgent: string;
  };
  cache: {
    defaultTTL: number;
    maxAge: number;
    staleWhileRevalidate: boolean;
  };
}

export const apiConfig: ApiConfig = {
  endpoints: {
    browser: '/api/v1/browser',
    tests: '/api/v1/tests',
    health: '/api/v1/health',
  },
  
  defaults: {
    timeout: 30000,
    retries: 3,
    retryDelay: 1000,
  },
  
  headers: {
    contentType: 'application/json',
    accept: 'application/json',
    userAgent: `Raiken/${process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0'}`,
  },
  
  cache: {
    defaultTTL: 300000, // 5 minutes
    maxAge: 1800000,    // 30 minutes
    staleWhileRevalidate: true,
  },
};

/**
 * Get API endpoint
 */
export function getApiEndpoint(endpoint: keyof ApiConfig['endpoints']): string {
  return apiConfig.endpoints[endpoint];
}

/**
 * Get request configuration
 */
export function getRequestConfig(overrides?: Partial<ApiConfig['defaults']>) {
  return {
    ...apiConfig.defaults,
    ...overrides,
  };
}

/**
 * Get default headers
 */
export function getDefaultHeaders(additionalHeaders?: Record<string, string>) {
  return {
    'Content-Type': apiConfig.headers.contentType,
    'Accept': apiConfig.headers.accept,
    'User-Agent': apiConfig.headers.userAgent,
    ...additionalHeaders,
  };
}
