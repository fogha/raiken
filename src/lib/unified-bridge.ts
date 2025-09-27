// Unified bridge service that tries local first, then falls back to relay

import { localBridge } from './local-bridge';
import { relayBridge } from './relay-bridge';

export type BridgeMode = 'local' | 'relay' | 'none';

interface BridgeStatus {
  mode: BridgeMode;
  connected: boolean;
  url?: string;
  projectName?: string;
  sessionId?: string;
  lastHealthCheck?: number;
}

class UnifiedBridgeService {
  private currentMode: BridgeMode = 'none';
  private fallbackAttempted = false;

  async getBridge(): Promise<{ mode: BridgeMode; rpc: (method: string, params: any) => Promise<any> } | null> {
    // Try local bridge first
    try {
      const localConnection = await localBridge.ensureConnection();
      if (localConnection) {
        this.currentMode = 'local';
        console.log('✓ Using local bridge mode');
        
        return {
          mode: 'local',
          rpc: async (method: string, params: any) => {
            switch (method) {
              case 'saveTest':
                return await localBridge.saveTestToLocal(params.content, params.filename, params.tabId);
              case 'executeTest':
                return await localBridge.executeTestRemotely(params.testPath, params.config);
              case 'getTestFiles':
                return await localBridge.getLocalTestFiles();
              case 'getReports':
                return await localBridge.getLocalReports();
              case 'deleteReport':
                return await localBridge.deleteLocalReport(params.reportId);
              default:
                throw new Error(`Unknown method: ${method}`);
            }
          }
        };
      }
    } catch (error) {
      console.log('⚠️ Local bridge not available:', error instanceof Error ? error.message : error);
    }

    // Fallback to relay bridge
    if (!this.fallbackAttempted) {
      this.fallbackAttempted = true;
      console.log('🌐 Falling back to relay bridge...');
      
      try {
        const connected = await relayBridge.connect();
        if (connected) {
          this.currentMode = 'relay';
          console.log('✓ Using relay bridge mode');
          
          return {
            mode: 'relay',
            rpc: async (method: string, params: any) => {
              return await relayBridge.rpc(method, params);
            }
          };
        }
      } catch (error) {
        console.log('❌ Relay bridge failed:', error instanceof Error ? error.message : error);
      }
    }

    this.currentMode = 'none';
    return null;
  }

  async saveTest(content: string, filename: string, tabId?: string): Promise<{ success: boolean; path?: string; error?: string }> {
    const bridge = await this.getBridge();
    if (!bridge) {
      return {
        success: false,
        error: 'No bridge connection available. Please run "raiken start" in your project directory or check your network connection.'
      };
    }

    try {
      return await bridge.rpc('saveTest', { content, filename, tabId });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async executeTest(testPath: string, config: any): Promise<{ success: boolean; output?: string; error?: string }> {
    const bridge = await this.getBridge();
    if (!bridge) {
      return {
        success: false,
        error: 'No bridge connection available'
      };
    }

    try {
      return await bridge.rpc('executeTest', { testPath, config });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getTestFiles(): Promise<{ success: boolean; files?: any[]; error?: string }> {
    const bridge = await this.getBridge();
    if (!bridge) {
      return {
        success: false,
        error: 'No bridge connection available'
      };
    }

    try {
      return await bridge.rpc('getTestFiles', {});
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getReports(): Promise<{ success: boolean; reports?: any[]; error?: string }> {
    const bridge = await this.getBridge();
    if (!bridge) {
      return {
        success: false,
        error: 'No bridge connection available'
      };
    }

    try {
      return await bridge.rpc('getReports', {});
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  getStatus(): BridgeStatus {
    switch (this.currentMode) {
      case 'local':
        const localStatus = localBridge.getConnectionStatus();
        return {
          mode: 'local',
          connected: localStatus.connected,
          url: localStatus.url,
          projectName: localStatus.projectName,
          lastHealthCheck: localStatus.lastHealthCheck
        };
      
      case 'relay':
        return {
          mode: 'relay',
          connected: relayBridge.isConnected(),
          sessionId: relayBridge.getSessionId() || undefined
        };
      
      default:
        return {
          mode: 'none',
          connected: false
        };
    }
  }

  async reconnect(): Promise<boolean> {
    this.fallbackAttempted = false;
    this.currentMode = 'none';
    
    // Disconnect existing connections
    localBridge.disconnect();
    relayBridge.disconnect();
    
    // Try to establish new connection
    const bridge = await this.getBridge();
    return bridge !== null;
  }

  disconnect(): void {
    localBridge.disconnect();
    relayBridge.disconnect();
    this.currentMode = 'none';
    this.fallbackAttempted = false;
  }
}

// Singleton instance
export const unifiedBridge = new UnifiedBridgeService();
