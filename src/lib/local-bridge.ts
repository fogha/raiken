interface LocalBridgeConnection {
  url: string;
  token: string;
  projectInfo: any;
  connected: boolean;
  lastHealthCheck?: number;
}

interface BridgeHealthInfo {
  status: string;
  project: string;
  type: string;
  testDir: string;
  timestamp: string;
}

class LocalBridgeService {
  private connection: LocalBridgeConnection | null = null;
  private readonly DEFAULT_PORTS = [3460, 3456, 3459, 3457, 3458];
  private readonly TIMEOUT_MS = 3000;
  private readonly HEALTH_CHECK_INTERVAL = 30000;
  private readonly OPERATION_TIMEOUT_MS = 8000;
  private healthCheckTimer: NodeJS.Timeout | null = null;

  private timeout<T>(promise: Promise<T>, ms = this.TIMEOUT_MS): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timeout')), ms);
      promise
        .then(value => { clearTimeout(timer); resolve(value); })
        .catch(error => { clearTimeout(timer); reject(error); });
    });
  }

  async detectLocalCLI(): Promise<LocalBridgeConnection | null> {
    // Return existing connection if it's still valid
    if (this.connection?.connected) {
      return this.connection;
    }

    for (const port of this.DEFAULT_PORTS) {
      const connection = await this.tryPort(port);
      if (connection) {
        this.connection = connection;
        this.startHealthChecks();
        return connection;
      }
    }
    
    return null;
  }

  private async tryPort(port: number): Promise<LocalBridgeConnection | null> {
    try {
      const url = `http://127.0.0.1:${port}`;
      
      const healthData = await this.getHealthInfo(url);
      if (!healthData) return null;
      
      const projectInfo = await this.getProjectInfo(url);
      if (!projectInfo?.authToken) return null;
      
      const isAuthenticated = await this.testAuthentication(url, projectInfo.authToken);
      if (!isAuthenticated) return null;
      
      return {
        url,
        token: projectInfo.authToken,
        projectInfo,
        connected: true,
        lastHealthCheck: Date.now()
      };
      
    } catch {
      return null;
    }
  }

  private async getHealthInfo(url: string): Promise<BridgeHealthInfo | null> {
    try {
      const response = await this.timeout(
        fetch(`${url}/api/health`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        })
      );
      
      if (!response.ok) return null;
      
      const healthData: BridgeHealthInfo = await response.json();
      return healthData.status === 'ok' && healthData.project ? healthData : null;
    } catch {
      return null;
    }
  }

  private async getProjectInfo(url: string): Promise<any> {
    try {
      const response = await this.timeout(
        fetch(`${url}/api/project-info`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        })
      );
      
      return response.ok ? await response.json() : null;
    } catch {
      return null;
    }
  }

  private async testAuthentication(url: string, token: string): Promise<boolean> {
    try {
      const response = await this.timeout(
        fetch(`${url}/api/test-files`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        })
      );
      
      return response.ok;
    } catch {
      return false;
    }
  }

  private startHealthChecks(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    let consecutiveFailures = 0;
    const MAX_CONSECUTIVE_FAILURES = 3;

    this.healthCheckTimer = setInterval(async () => {
      if (this.connection) {
        try {
          const response = await this.timeout(
            fetch(`${this.connection.url}/api/health`, {
              method: 'GET',
              headers: { 'Accept': 'application/json' }
            }),
            3000
          );

          if (response.ok) {
            this.connection.lastHealthCheck = Date.now();
            this.connection.connected = true;
            consecutiveFailures = 0;
          } else {
            throw new Error(`Health check failed: ${response.status}`);
          }
        } catch (error) {
          consecutiveFailures++;

          if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
            this.connection.connected = false;
            consecutiveFailures = 0;

            const backoffDelay = Math.min(2000 * Math.pow(2, consecutiveFailures), 30000);
            setTimeout(() => this.detectLocalCLI(), backoffDelay);
          }
        }
      }
    }, this.HEALTH_CHECK_INTERVAL);
  }

  getConnection(): LocalBridgeConnection | null {
    return this.connection;
  }

  isConnected(): boolean {
    return this.connection?.connected ?? false;
  }

  async makeRequest<T = any>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    if (!this.connection?.connected) {
      return { success: false, error: 'No active connection to local CLI' };
    }

    try {
      const url = `${this.connection.url}${endpoint}`;
      const response = await this.timeout(
        fetch(url, {
          ...options,
          headers: {
            'Authorization': `Bearer ${this.connection.token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...options.headers
          }
        })
      );

      if (!response.ok) {
        return { 
          success: false, 
          error: `Request failed: ${response.status} ${response.statusText}` 
        };
      }

      const data = await response.json();
      return { success: true, data };

    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async executeTestRemotely(
    testPath: string, 
    config: any
  ): Promise<{ success: boolean; output?: string; error?: string; reportId?: string }> {
    try {
      const result = await this.timeout(
        this.makeRequest('/api/execute-test', {
          method: 'POST',
          body: JSON.stringify({ testPath, config })
        }),
        this.OPERATION_TIMEOUT_MS
      );

      if (!result.success) {
        return { success: false, error: result.error };
      }

      return result.data;
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Test execution timeout' 
      };
    }
  }

  async getTestFiles(): Promise<{ success: boolean; files?: any[]; error?: string }> {
    const result = await this.makeRequest('/api/test-files');
    
    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, files: result.data?.files || [] };
  }

  async saveTestFile(
    content: string, 
    filename: string, 
    tabId?: string
  ): Promise<{ success: boolean; path?: string; error?: string }> {
    const result = await this.makeRequest('/api/save-test', {
      method: 'POST',
      body: JSON.stringify({ content, filename, tabId })
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, path: result.data?.path };
  }

  async deleteTestFile(testPath: string): Promise<{ success: boolean; error?: string }> {
    const result = await this.makeRequest('/api/delete-test', {
      method: 'DELETE',
      body: JSON.stringify({ testPath })
    });

    return { success: result.success, error: result.error };
  }

  async getReports(): Promise<{ success: boolean; reports?: any[]; error?: string }> {
    const result = await this.makeRequest('/api/reports');
    
    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, reports: result.data?.reports || [] };
  }

  async deleteReport(reportId: string): Promise<{ success: boolean; error?: string }> {
    const result = await this.makeRequest(`/api/reports/${reportId}`, {
      method: 'DELETE'
    });

    return { success: result.success, error: result.error };
  }

  disconnect(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
    
    this.connection = null;
  }
}

export const localBridgeService = new LocalBridgeService();