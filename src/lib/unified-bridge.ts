import { localBridgeService } from './local-bridge';
import { relayBridgeService } from './relay-bridge';

export type BridgeMode = 'local' | 'relay' | 'none';

export interface BridgeStatus {
  mode: BridgeMode;
  connected: boolean;
  url?: string;
  token?: string;
  projectName?: string;
  sessionId?: string;
  lastHealthCheck?: number;
  projectInfo?: {
    name: string;
    type: string;
    testDir: string;
    [key: string]: any;
  };
}

interface BridgeRPC {
  mode: BridgeMode;
  rpc: (method: string, params: any) => Promise<any>;
}

class UnifiedBridgeService {
  private currentMode: BridgeMode = 'none';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private cachedBridge: BridgeRPC | null = null;
  private lastBridgeCheck = 0;
  private readonly BRIDGE_CACHE_TTL = 5000; // 5 seconds

  async getBridge(): Promise<BridgeRPC | null> {
    if (this.cachedBridge && (Date.now() - this.lastBridgeCheck) < this.BRIDGE_CACHE_TTL) {
      return this.cachedBridge;
    }

    if (this.currentMode === 'none' || !localBridgeService.isConnected()) {
      const localBridge = await this.tryLocalBridge();
      if (localBridge) {
        this.cachedBridge = localBridge;
        this.lastBridgeCheck = Date.now();
        return localBridge;
      }
    } else if (this.currentMode === 'local' && localBridgeService.isConnected()) {
      const localBridge = {
        mode: 'local' as const,
        rpc: this.createLocalRPC()
      };
      this.cachedBridge = localBridge;
      this.lastBridgeCheck = Date.now();
      return localBridge;
    }

    const relayBridge = await this.tryRelayBridge();
    if (relayBridge) {
      this.cachedBridge = relayBridge;
      this.lastBridgeCheck = Date.now();
      return relayBridge;
    }

    this.cachedBridge = null;
    return null;
  }

  private async tryLocalBridge(): Promise<BridgeRPC | null> {
    try {
      const connection = await localBridgeService.detectLocalCLI();
      if (connection) {
        this.currentMode = 'local';
        this.reconnectAttempts = 0;
        
        return {
          mode: 'local',
          rpc: this.createLocalRPC()
        };
      }
    } catch {
      // Local bridge failed, try relay
    }
    
    return null;
  }

  private async tryRelayBridge(): Promise<BridgeRPC | null> {
    try {
      const connection = await relayBridgeService.connect();
      if (connection) {
        this.currentMode = 'relay';
        this.reconnectAttempts = 0;
        
        return {
          mode: 'relay',
          rpc: this.createRelayRPC()
        };
      }
    } catch {
      // Both bridges failed
    }
    
    return null;
  }

  private createLocalRPC() {
    return async (method: string, params: any) => {
      const methodMap: Record<string, () => Promise<any>> = {
        saveTest: () => localBridgeService.saveTestFile(params.content, params.filename, params.tabId),
        executeTest: () => localBridgeService.executeTestRemotely(params.testPath, params.config),
        getTestFiles: () => localBridgeService.getTestFiles(),
        getReports: () => localBridgeService.getReports(),
        deleteReport: () => localBridgeService.deleteReport(params.reportId),
        deleteTest: () => localBridgeService.deleteTestFile(params.testPath)
      };

      const handler = methodMap[method];
      if (!handler) {
        throw new Error(`Unknown method: ${method}`);
      }

      return await handler();
    };
  }

  private createRelayRPC() {
    return async (method: string, params: any) => {
      return await relayBridgeService.sendRPC(method, params);
    };
  }

  getStatus(): BridgeStatus {
    const baseStatus: BridgeStatus = {
      mode: this.currentMode,
      connected: false
    };

    if (this.currentMode === 'local') {
      const connection = localBridgeService.getConnection();
      return {
        ...baseStatus,
        connected: localBridgeService.isConnected(),
        url: connection?.url,
        token: connection?.token,
        projectName: connection?.projectInfo?.project?.name,
        lastHealthCheck: connection?.lastHealthCheck,
        projectInfo: connection?.projectInfo?.project
      };
    }

    if (this.currentMode === 'relay') {
      const status = relayBridgeService.getStatus();
      return {
        ...baseStatus,
        connected: status.connected,
        sessionId: status.sessionId,
        url: status.url
      };
    }

    return baseStatus;
  }

  async reconnect(): Promise<boolean> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return false;
    }

    this.reconnectAttempts++;
    
    const bridge = await this.getBridge();
    if (bridge) {
      this.reconnectAttempts = 0;
      return true;
    }

    this.scheduleReconnect();
    return false;
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnect();
    }, delay);
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.currentMode === 'local') {
      localBridgeService.disconnect();
    } else if (this.currentMode === 'relay') {
      relayBridgeService.disconnect();
    }

    this.currentMode = 'none';
    this.reconnectAttempts = 0;
    this.cachedBridge = null;
    this.lastBridgeCheck = 0;
  }
}

export const unifiedBridgeService = new UnifiedBridgeService();