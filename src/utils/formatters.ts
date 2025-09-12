/**
 * Formatting Utilities
 */

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  return `${hours}h ${minutes}m`;
}

/**
 * Format timestamp in relative format
 */
export function formatRelativeTime(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSeconds < 60) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}

/**
 * Format test name from file path
 */
export function formatTestName(filePath: string): string {
  const fileName = filePath.split('/').pop() || filePath;
  return fileName
    .replace(/\.(spec|test)\.(ts|js)$/, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Format error message for display
 */
export function formatErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return 'An unknown error occurred';
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Format URL for display
 */
export function formatUrl(url: string, maxLength: number = 50): string {
  try {
    const parsed = new URL(url);
    const domain = parsed.hostname;
    const path = parsed.pathname + parsed.search;
    
    if (url.length <= maxLength) return url;
    
    const truncatedPath = truncate(path, maxLength - domain.length - 3);
    return `${domain}${truncatedPath}`;
  } catch {
    return truncate(url, maxLength);
  }
}

/**
 * Format browser type for display
 */
export function formatBrowserType(browserType: string): string {
  switch (browserType.toLowerCase()) {
    case 'chromium':
      return 'Chromium';
    case 'firefox':
      return 'Firefox';
    case 'webkit':
      return 'Safari';
    default:
      return browserType;
  }
}

/**
 * Format test status for display
 */
export function formatTestStatus(status: string): {
  label: string;
  color: string;
  icon: string;
} {
  switch (status.toLowerCase()) {
    case 'passed':
    case 'success':
      return { label: 'Passed', color: 'text-green-600', icon: '✓' };
    case 'failed':
    case 'failure':
    case 'error':
      return { label: 'Failed', color: 'text-red-600', icon: '✗' };
    case 'running':
    case 'executing':
      return { label: 'Running', color: 'text-blue-600', icon: '⟳' };
    case 'pending':
    case 'queued':
      return { label: 'Pending', color: 'text-yellow-600', icon: '⏳' };
    default:
      return { label: 'Unknown', color: 'text-gray-600', icon: '?' };
  }
}
