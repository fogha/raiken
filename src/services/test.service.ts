/**
 * Test Service - High-level test operations
 */

import { apiService } from './api.service';
import { 
  TestGenerateRequest,
  TestExecuteRequest,
  TestSaveRequest,
  TestDeleteRequest,
  ApiResponse
} from '@/types';

export class TestService {
  /**
   * Generate test script using AI
   */
  async generateTest(options: Omit<TestGenerateRequest, 'action'>): Promise<ApiResponse<{ testScript: string }>> {
    return apiService.post('/tests', {
      action: 'generate',
      ...options,
    });
  }

  /**
   * Execute test script
   */
  async executeTest(options: Omit<TestExecuteRequest, 'action'>): Promise<ApiResponse> {
    return apiService.post('/tests', {
      action: 'execute',
      ...options,
    });
  }

  /**
   * Save test script
   */
  async saveTest(options: Omit<TestSaveRequest, 'action'>): Promise<ApiResponse<{ filePath: string }>> {
    return apiService.post('/tests', {
      action: 'save',
      ...options,
    });
  }

  /**
   * List all test files
   */
  async listTests(): Promise<ApiResponse> {
    return apiService.get('/tests', { action: 'list' });
  }

  /**
   * Delete test file
   */
  async deleteTest(testPath: string): Promise<ApiResponse> {
    return apiService.delete(`/tests?path=${encodeURIComponent(testPath)}`);
  }

  /**
   * Get test reports
   */
  async getReports(): Promise<ApiResponse> {
    return apiService.get('/tests', { action: 'reports' });
  }
}

export const testService = new TestService();
