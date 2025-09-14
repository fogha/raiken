// Local bridge service for communicating with CLI package

interface LocalBridgeConnection {
  url: string;
  token: string;
  projectInfo: any;
  connected: boolean;
}

class LocalBridgeService {
  private connection: LocalBridgeConnection | null = null;
  private readonly DEFAULT_PORTS = [3460, 3456, 3459, 3457, 3458];

  async detectLocalCLI(): Promise<LocalBridgeConnection | null> {
    console.log('🔍 Detecting local Raiken CLI...');
    
    for (const port of this.DEFAULT_PORTS) {
      try {
        const url = `http://localhost:${port}`;
        const response = await fetch(`${url}/api/health`, {
          method: 'GET',
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log(`✓ Found Raiken CLI at ${url}`, data);
          
          // Get detailed project info and auth token
          const projectResponse = await fetch(`${url}/api/project-info`);
          const projectInfo = await projectResponse.json();
          
          this.connection = {
            url,
            token: projectInfo.authToken,
            projectInfo,
            connected: true
          };
          
          return this.connection;
        }
      } catch (error) {
        // Port not available or CLI not running, continue searching
        continue;
      }
    }
    
    console.log('❌ No local Raiken CLI detected');
    return null;
  }

  async saveTestToLocal(testCode: string, filename: string, tabId?: string): Promise<{ success: boolean; path?: string; error?: string }> {
    if (!this.connection) {
      const detected = await this.detectLocalCLI();
      if (!detected) {
        return { 
          success: false, 
          error: 'No local Raiken CLI detected. Run "raiken remote" in your project directory.' 
        };
      }
    }

    // Additional null check for TypeScript
    if (!this.connection) {
      return { 
        success: false, 
        error: 'Connection not established' 
      };
    }

    try {
      const response = await fetch(`${this.connection.url}/api/v1/tests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.connection.token}`
        },
        body: JSON.stringify({
          action: 'save',
          content: testCode,
          filename,
          tabId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return { success: true, path: result.path };
    } catch (error) {
      console.error('Failed to save test to local CLI:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async executeTestRemotely(testPath: string, config: any): Promise<{ success: boolean; output?: string; error?: string }> {
    if (!this.connection) {
      return { success: false, error: 'No local CLI connection' };
    }

    try {
      const response = await fetch(`${this.connection.url}/api/execute-test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.connection.token}`
        },
        body: JSON.stringify({ testPath, config })
      });

      const result = await response.json();
      return result;
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getLocalTestFiles(): Promise<{ success: boolean; files?: any[]; error?: string }> {
    if (!this.connection) {
      return { success: false, error: 'No local CLI connection' };
    }

    try {
      const response = await fetch(`${this.connection.url}/api/test-files`, {
        headers: {
          'Authorization': `Bearer ${this.connection.token}`
        }
      });

      const data = await response.json();
      return { success: true, files: data.files };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  getConnectionInfo(): LocalBridgeConnection | null {
    return this.connection;
  }

  isConnected(): boolean {
    return this.connection?.connected ?? false;
  }

  disconnect(): void {
    this.connection = null;
  }
}

// Singleton instance
export const localBridge = new LocalBridgeService(); 