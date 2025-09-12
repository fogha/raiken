/**
 * Browser Service - High-level browser operations
 */

import { apiService } from './api.service';
import { 
  BrowserInitializeRequest,
  BrowserNavigateRequest,
  BrowserScreenshotRequest,
  ApiResponse
} from '@/types';

export class BrowserService {
  /**
   * Initialize browser instance
   */
  async initialize(options: Omit<BrowserInitializeRequest, 'action'>): Promise<ApiResponse> {
    return apiService.post('/browser', {
      action: 'initialize',
      ...options,
    });
  }

  /**
   * Navigate to URL
   */
  async navigate(options: Omit<BrowserNavigateRequest, 'action'>): Promise<ApiResponse> {
    return apiService.post('/browser', {
      action: 'navigate',
      ...options,
    });
  }

  /**
   * Extract DOM tree
   */
  async extractDOM(scriptId?: string): Promise<ApiResponse> {
    return apiService.post('/browser', {
      action: 'extract-dom',
      scriptId,
    });
  }

  /**
   * Take screenshot
   */
  async takeScreenshot(options: Omit<BrowserScreenshotRequest, 'action'>): Promise<ApiResponse> {
    return apiService.post('/browser', {
      action: 'take-screenshot',
      ...options,
    });
  }

  /**
   * Execute test script
   */
  async executeTest(script: string, config?: any): Promise<ApiResponse> {
    return apiService.post('/browser', {
      action: 'execute-test',
      script,
      config,
    });
  }

  /**
   * Close browser
   */
  async close(scriptId?: string): Promise<ApiResponse> {
    return apiService.post('/browser', {
      action: 'close',
      scriptId,
    });
  }
}

export const browserService = new BrowserService();
