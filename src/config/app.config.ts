/**
 * Application Configuration
 */

export interface AppConfig {
  name: string;
  version: string;
  environment: 'development' | 'production' | 'test';
  baseUrl: string;
  api: {
    baseUrl: string;
    version: string;
    timeout: number;
  };
  storage: {
    prefix: string;
    enablePersistence: boolean;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    enableConsole: boolean;
  };
  features: {
    enableTelemetry: boolean;
    enableErrorReporting: boolean;
    enableBetaFeatures: boolean;
  };
}

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

export const appConfig: AppConfig = {
  name: 'Raiken',
  version: process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0',
  environment: (process.env.NODE_ENV as AppConfig['environment']) || 'development',
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
  
  api: {
    baseUrl: '/api/v1',
    version: 'v1',
    timeout: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '30000'),
  },
  
  storage: {
    prefix: 'raiken',
    enablePersistence: true,
  },
  
  logging: {
    level: isDevelopment ? 'debug' : 'info',
    enableConsole: isDevelopment,
  },
  
  features: {
    enableTelemetry: !isDevelopment && process.env.NEXT_PUBLIC_ENABLE_TELEMETRY === 'true',
    enableErrorReporting: isProduction,
    enableBetaFeatures: isDevelopment || process.env.NEXT_PUBLIC_ENABLE_BETA === 'true',
  },
};

/**
 * Get configuration value with type safety
 */
export function getConfig<K extends keyof AppConfig>(key: K): AppConfig[K] {
  return appConfig[key];
}

/**
 * Check if feature is enabled
 */
export function isFeatureEnabled(feature: keyof AppConfig['features']): boolean {
  return appConfig.features[feature];
}

/**
 * Check environment
 */
export const isDev = appConfig.environment === 'development';
export const isProd = appConfig.environment === 'production';
export const isTest = appConfig.environment === 'test';
