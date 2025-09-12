/**
 * Application Constants
 */

// Browser constants
export const BROWSER_TYPES = ['chromium', 'firefox', 'webkit'] as const;
export const VIEWPORT_PRESETS = {
  DESKTOP: { width: 1920, height: 1080 },
  LAPTOP: { width: 1366, height: 768 },
  TABLET: { width: 768, height: 1024 },
  MOBILE: { width: 375, height: 667 },
} as const;

// Test constants
export const TEST_FILE_EXTENSIONS = ['.spec.ts', '.test.ts', '.spec.js', '.test.js'] as const;
export const TEST_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  PASSED: 'passed',
  FAILED: 'failed',
  SKIPPED: 'skipped',
} as const;

// UI constants
export const SIDEBAR_WIDTH = {
  COLLAPSED: 60,
  EXPANDED: 300,
} as const;

export const STATUS_BAR_HEIGHT = 24;

export const EDITOR_THEMES = {
  LIGHT: 'vs',
  DARK: 'vs-dark',
  HIGH_CONTRAST: 'hc-black',
} as const;

// API constants
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

export const MIME_TYPES = {
  JSON: 'application/json',
  TEXT: 'text/plain',
  HTML: 'text/html',
  JAVASCRIPT: 'application/javascript',
  TYPESCRIPT: 'application/typescript',
} as const;

// Storage keys
export const STORAGE_KEYS = {
  CONFIG: 'config',
  THEME: 'theme',
  SIDEBAR_STATE: 'sidebar-state',
  EDITOR_PREFERENCES: 'editor-preferences',
  RECENT_PROJECTS: 'recent-projects',
  TEST_HISTORY: 'test-history',
} as const;

// Event names
export const EVENTS = {
  DOM_TREE_UPDATE: 'raiken:dom-tree-update',
  STATUS_CHANGE: 'raiken:status-change',
  TEST_COMPLETE: 'raiken:test-complete',
  BROWSER_READY: 'raiken:browser-ready',
} as const;

// File paths
export const PATHS = {
  GENERATED_TESTS: 'generated-tests',
  TEST_RESULTS: 'test-results',
  SCREENSHOTS: 'screenshots',
  REPORTS: 'reports',
} as const;
