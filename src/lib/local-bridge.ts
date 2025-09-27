// Local bridge service for communicating with CLI package

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
  private readonly TIMEOUT_MS = 1200;
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
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
    console.log('🔍 Detecting local Raiken CLI...');
    
    for (const port of this.DEFAULT_PORTS) {
      try {
        const url = `http://127.0.0.1:${port}`;
        
        // Try health check with timeout
        const healthResponse = await this.timeout(
          fetch(`${url}/api/health`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
          })
        );
        
        if (!healthResponse.ok) continue;
        
        const healthData: BridgeHealthInfo = await healthResponse.json();
        console.log(`✓ Found Raiken CLI at ${url}`, healthData);
        
        // Get detailed project info and auth token with timeout
        const projectResponse = await this.timeout(
          fetch(`${url}/api/project-info`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
          })
        );
        
        if (!projectResponse.ok) {
          console.warn(`⚠️ Health check passed but project-info failed for ${url}`);
          continue;
        }
        
        const projectInfo = await projectResponse.json();
        
        // Validate required fields
        if (!projectInfo.authToken) {
          console.warn(`⚠️ No auth token provided by CLI at ${url}`);
          continue;
        }
        
        // Test authentication
        const authTestResponse = await this.timeout(
          fetch(`${url}/api/test-files`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${projectInfo.authToken}`,
              'Accept': 'application/json'
            }
          })
        );
        
        if (!authTestResponse.ok) {
          console.warn(`⚠️ Authentication test failed for ${url}`);
          continue;
        }
        
        this.connection = {
          url,
          token: projectInfo.authToken,
          projectInfo,
          connected: true,
          lastHealthCheck: Date.now()
        };
        
        // Start periodic health checks
        this.startHealthChecks();
        
        // Store connection info in localStorage for faster reconnection
        if (typeof window !== 'undefined') {
          localStorage.setItem('raiken_bridge_connection', JSON.stringify({
            url,
            token: projectInfo.authToken,
            timestamp: Date.now()
          }));
        }
        
        return this.connection;
        
      } catch (error) {
        // Port not available or CLI not running, continue searching
        if (error instanceof Error && error.message !== 'timeout') {
          console.debug(`Port ${port} check failed:`, error.message);
        }
        continue;
      }
    }
    
    console.log('❌ No local Raiken CLI detected');
    return null;
  }

  private startHealthChecks(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    
    this.healthCheckTimer = setInterval(async () => {
      if (this.connection) {
        try {
          const response = await this.timeout(
            fetch(`${this.connection.url}/api/health`, {
              method: 'GET',
              headers: { 'Accept': 'application/json' }
            }),
            5000 // Shorter timeout for health checks
          );
          
          if (response.ok) {
            this.connection.lastHealthCheck = Date.now();
            this.connection.connected = true;
          } else {
            throw new Error(`Health check failed: ${response.status}`);
          }
        } catch (error) {
          console.warn('🔄 Bridge connection lost, marking as disconnected');
          this.connection.connected = false;
          // Try to reconnect
          setTimeout(() => this.detectLocalCLI(), 2000);
        }
      }
    }, this.HEALTH_CHECK_INTERVAL);
  }

  private stopHealthChecks(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  async tryStoredConnection(): Promise<LocalBridgeConnection | null> {
    if (typeof window === 'undefined') return null;
    
    try {
      const stored = localStorage.getItem('raiken_bridge_connection');
      if (!stored) return null;
      
      const { url, token, timestamp } = JSON.parse(stored);
      
      // Check if stored connection is too old (1 hour)
      if (Date.now() - timestamp > 3600000) {
        localStorage.removeItem('raiken_bridge_connection');
        return null;
      }
      
      // Test the stored connection
      const response = await this.timeout(
        fetch(`${url}/api/health`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        }),
        2000 // Quick test
      );
      
      if (response.ok) {
        // Get fresh project info
        const projectResponse = await this.timeout(
          fetch(`${url}/api/project-info`, {
            headers: { 'Accept': 'application/json' }
          })
        );
        
        if (projectResponse.ok) {
          const projectInfo = await projectResponse.json();
          
          this.connection = {
            url,
            token,
            projectInfo,
            connected: true,
            lastHealthCheck: Date.now()
          };
          
          this.startHealthChecks();
          console.log('✓ Reconnected using stored connection');
          return this.connection;
        }
      }
    } catch (error) {
      // Stored connection failed, remove it
      localStorage.removeItem('raiken_bridge_connection');
    }
    
    return null;
  }

  async ensureConnection(): Promise<LocalBridgeConnection | null> {
    // Try existing connection first
    if (this.connection?.connected) {
      return this.connection;
    }
    
    // Try stored connection
    const stored = await this.tryStoredConnection();
    if (stored) return stored;
    
    // Full detection
    return await this.detectLocalCLI();
  }

  async saveTestToLocal(testCode: string, filename: string, tabId?: string): Promise<{ success: boolean; path?: string; error?: string }> {
    const connection = await this.ensureConnection();
    if (!connection) {
      return { 
        success: false, 
        error: 'No local Raiken CLI detected. Run "raiken start" in your project directory.' 
      };
    }

    // Additional null check for TypeScript
    if (!this.connection) {
      return { 
        success: false, 
        error: 'Connection not established' 
      };
    }

    try {
      // Primary: new bridge endpoint
      let response = await this.timeout(
        fetch(`${connection.url}/api/save-test`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${connection.token}`,
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            content: testCode,
            filename,
            tabId
          })
        })
      );

      // Fallback for older bridge servers
      if (response.status === 404) {
        response = await this.timeout(
          fetch(`${connection.url}/api/v1/tests`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${connection.token}`,
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              action: 'save',
              content: testCode,
              filename,
              tabId
            })
          })
        );
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Test saved to local project:', result);
      
      return { success: true, path: result.path || result.filePath };
    } catch (error) {
      console.error('❌ Failed to save test to local CLI:', error);
      
      // Mark connection as potentially broken
      if (this.connection) {
        this.connection.connected = false;
      }
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async executeTestRemotely(testPath: string, config: any): Promise<{ success: boolean; output?: string; error?: string }> {
    const connection = await this.ensureConnection();
    if (!connection) {
      return { success: false, error: 'No local CLI connection' };
    }

    try {
      const response = await this.timeout(
        fetch(`${connection.url}/api/execute-test`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${connection.token}`,
            'Accept': 'application/json'
          },
          body: JSON.stringify({ testPath, config })
        })
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      // Mark connection as potentially broken
      if (this.connection) {
        this.connection.connected = false;
      }
      
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getLocalTestFiles(): Promise<{ success: boolean; files?: any[]; error?: string }> {
    const connection = await this.ensureConnection();
    if (!connection) {
      return { success: false, error: 'No local CLI connection' };
    }

    try {
      const response = await this.timeout(
        fetch(`${connection.url}/api/test-files`, {
          headers: {
            'Authorization': `Bearer ${connection.token}`,
            'Accept': 'application/json'
          }
        })
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      return { success: true, files: data.files };
    } catch (error) {
      // Mark connection as potentially broken
      if (this.connection) {
        this.connection.connected = false;
      }
      
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getLocalReports(): Promise<{ success: boolean; reports?: any[]; error?: string }> {
    const connection = await this.ensureConnection();
    if (!connection) {
      return { success: false, error: 'No local CLI connection' };
    }

    try {
      const response = await this.timeout(
        fetch(`${connection.url}/api/reports`, {
          headers: {
            'Authorization': `Bearer ${connection.token}`,
            'Accept': 'application/json'
          }
        })
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      return { success: true, reports: data.reports };
    } catch (error) {
      // Mark connection as potentially broken
      if (this.connection) {
        this.connection.connected = false;
      }
      
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async deleteLocalReport(reportId: string): Promise<{ success: boolean; error?: string }> {
    const connection = await this.ensureConnection();
    if (!connection) {
      return { success: false, error: 'No local CLI connection' };
    }

    try {
      const response = await this.timeout(
        fetch(`${connection.url}/api/reports/${reportId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${connection.token}`,
            'Accept': 'application/json'
          }
        })
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      return { success: true };
    } catch (error) {
      // Mark connection as potentially broken
      if (this.connection) {
        this.connection.connected = false;
      }
      
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  getConnectionInfo(): LocalBridgeConnection | null {
    return this.connection;
  }

  isConnected(): boolean {
    return this.connection?.connected ?? false;
  }

  getConnectionStatus(): { 
    connected: boolean; 
    url?: string; 
    projectName?: string; 
    lastHealthCheck?: number;
    timeSinceLastCheck?: number;
  } {
    if (!this.connection) {
      return { connected: false };
    }

    const timeSinceLastCheck = this.connection.lastHealthCheck 
      ? Date.now() - this.connection.lastHealthCheck 
      : undefined;

    return {
      connected: this.connection.connected,
      url: this.connection.url,
      projectName: this.connection.projectInfo?.name,
      lastHealthCheck: this.connection.lastHealthCheck,
      timeSinceLastCheck
    };
  }

  disconnect(): void {
    this.stopHealthChecks();
    this.connection = null;
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('raiken_bridge_connection');
    }
  }

  // Force a fresh connection attempt
  async reconnect(): Promise<LocalBridgeConnection | null> {
    this.disconnect();
    return await this.detectLocalCLI();
  }
}

// Singleton instance
export const localBridge = new LocalBridgeService(); 