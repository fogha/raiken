import { apiService } from './api.service';
import { 
  TestGenerateRequest,
  TestExecuteRequest,
  TestSaveRequest,
  ApiResponse
} from '@/types';

export class TestService {
  private readonly endpoint = '/tests';

  async generateTest(options: Omit<TestGenerateRequest, 'action'>): Promise<ApiResponse<{ testScript: string }>> {
    return apiService.post(this.endpoint, {
      action: 'generate',
      ...options,
    });
  }

  async executeTest(options: Omit<TestExecuteRequest, 'action'>): Promise<ApiResponse> {
    return apiService.post(this.endpoint, {
      action: 'execute',
      ...options,
    });
  }

  async saveTest(options: Omit<TestSaveRequest, 'action'>): Promise<ApiResponse<{ filePath: string }>> {
    return apiService.post(this.endpoint, {
      action: 'save',
      ...options,
    });
  }

  async listTests(): Promise<ApiResponse> {
    return apiService.get(this.endpoint, { action: 'list' });
  }

  async deleteTest(testPath: string): Promise<ApiResponse> {
    return apiService.delete(`${this.endpoint}?path=${encodeURIComponent(testPath)}`);
  }

  async getReports(): Promise<ApiResponse> {
    return apiService.get(this.endpoint, { action: 'reports' });
  }

  async getTestContent(testPath: string): Promise<ApiResponse<{ content: string }>> {
    return apiService.get(`${this.endpoint}/content`, { path: testPath });
  }

  async updateTest(testPath: string, content: string): Promise<ApiResponse> {
    return apiService.put(`${this.endpoint}/content`, { path: testPath, content });
  }
}

export const testService = new TestService();