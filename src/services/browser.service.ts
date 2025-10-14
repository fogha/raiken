import { apiService } from './api.service';
import { 
  BrowserInitializeRequest,
  BrowserNavigateRequest,
  BrowserScreenshotRequest,
  ApiResponse
} from '@/types';

export class BrowserService {
  private readonly endpoint = '/browser';

  async initialize(options: Omit<BrowserInitializeRequest, 'action'>): Promise<ApiResponse> {
    return apiService.post(this.endpoint, {
      action: 'initialize',
      ...options,
    });
  }

  async navigate(options: Omit<BrowserNavigateRequest, 'action'>): Promise<ApiResponse> {
    return apiService.post(this.endpoint, {
      action: 'navigate',
      ...options,
    });
  }

  async extractDOM(scriptId?: string): Promise<ApiResponse> {
    return apiService.post(this.endpoint, {
      action: 'extract-dom',
      scriptId,
    });
  }

  async takeScreenshot(options: Omit<BrowserScreenshotRequest, 'action'>): Promise<ApiResponse> {
    return apiService.post(this.endpoint, {
      action: 'take-screenshot',
      ...options,
    });
  }

  async executeTest(script: string, config?: any): Promise<ApiResponse> {
    return apiService.post(this.endpoint, {
      action: 'execute-test',
      script,
      config,
    });
  }

  async close(scriptId?: string): Promise<ApiResponse> {
    return apiService.post(this.endpoint, {
      action: 'close',
      scriptId,
    });
  }

  async getStatus(scriptId?: string): Promise<ApiResponse> {
    return apiService.get(`${this.endpoint}/status`, scriptId ? { scriptId } : undefined);
  }

  async listSessions(): Promise<ApiResponse> {
    return apiService.get(`${this.endpoint}/sessions`);
  }
}

export const browserService = new BrowserService();