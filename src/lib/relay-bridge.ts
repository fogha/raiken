interface RelayConnection {
  sessionId: string;
  connected: boolean;
  ws: WebSocket | null;
  lastPing?: number;
  url?: string;
}

interface RelayMessage {
  id: string;
  type: 'rpc' | 'ping' | 'pong';
  method?: string;
  params?: any;
  result?: any;
  error?: string;
}

class RelayBridgeService {
  private connection: RelayConnection | null = null;
  private readonly RELAY_URL = process.env.NEXT_PUBLIC_RELAY_URL || 'ws://84.46.245.248:3001/bridge';
  private readonly PING_INTERVAL = 30000;
  private readonly TIMEOUT_MS = 10000; // Increased to 10s for WebSocket
  private readonly ENABLE_RELAY = process.env.NEXT_PUBLIC_ENABLE_RELAY_BRIDGE === 'true';
  private pingTimer: NodeJS.Timeout | null = null;
  private pendingRequests = new Map<string, { resolve: (result: any) => void; reject: (error: any) => void }>();

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  private getOrCreateSessionId(): string {
    if (typeof window === 'undefined') return this.generateId();
    
    let sessionId = localStorage.getItem('raiken_relay_session');
    if (!sessionId) {
      sessionId = this.generateId();
      localStorage.setItem('raiken_relay_session', sessionId);
    }
    return sessionId;
  }

  async connect(): Promise<boolean> {
    if (!this.ENABLE_RELAY) {
      console.log('[Raiken Bridge] Relay bridge is disabled (NEXT_PUBLIC_ENABLE_RELAY_BRIDGE not set)');
      return false;
    }

    if (this.connection?.connected) {
      return true;
    }

    return new Promise((resolve) => {
      try {
        const sessionId = this.getOrCreateSessionId();
        const wsUrl = `${this.RELAY_URL}?role=web&session=${encodeURIComponent(sessionId)}`;
        
        const ws = new WebSocket(wsUrl);
        
        this.connection = {
          sessionId,
          connected: false,
          ws,
          url: wsUrl
        };

        const connectionTimeout = setTimeout(() => {
          if (!this.connection?.connected) {
            ws.close();
            resolve(false);
          }
        }, this.TIMEOUT_MS);

        ws.onopen = () => {
          clearTimeout(connectionTimeout);
          if (this.connection) {
            this.connection.connected = true;
            this.startPingTimer();
          }
          resolve(true);
        };

        ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        ws.onclose = () => {
          clearTimeout(connectionTimeout);
          this.handleDisconnection();
          resolve(false);
        };

        ws.onerror = () => {
          clearTimeout(connectionTimeout);
          this.handleDisconnection();
          resolve(false);
        };

      } catch {
        resolve(false);
      }
    });
  }

  private handleMessage(data: string): void {
    try {
      const message: RelayMessage = JSON.parse(data);
      
      if (message.type === 'ping') {
        this.sendMessage({ id: message.id, type: 'pong' });
        return;
      }

      if (message.type === 'pong' && this.connection) {
        this.connection.lastPing = Date.now();
        return;
      }

      if (message.type === 'rpc') {
        const pending = this.pendingRequests.get(message.id);
        if (pending) {
          this.pendingRequests.delete(message.id);
          
          if (message.error) {
            pending.reject(new Error(message.error));
          } else {
            pending.resolve(message.result);
          }
        }
      }
    } catch {
      // Ignore malformed messages
    }
  }

  private handleDisconnection(): void {
    if (this.connection) {
      this.connection.connected = false;
    }
    
    this.stopPingTimer();
    
    // Reject all pending requests
    this.pendingRequests.forEach((pending, id) => {
      pending.reject(new Error('Connection lost'));
    });
    this.pendingRequests.clear();
  }

  private sendMessage(message: RelayMessage): void {
    if (this.connection?.ws?.readyState === WebSocket.OPEN) {
      this.connection.ws.send(JSON.stringify(message));
    }
  }

  private startPingTimer(): void {
    this.pingTimer = setInterval(() => {
      if (this.connection?.connected) {
        this.sendMessage({
          id: this.generateId(),
          type: 'ping'
        });
      }
    }, this.PING_INTERVAL);
  }

  private stopPingTimer(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  async sendRPC(method: string, params: any): Promise<any> {
    if (!this.connection?.connected) {
      throw new Error('Not connected to relay server');
    }

    return new Promise((resolve, reject) => {
      const id = this.generateId();
      
      this.pendingRequests.set(id, { resolve, reject });
      
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error('RPC timeout'));
      }, this.TIMEOUT_MS);

      this.pendingRequests.set(id, {
        resolve: (result) => {
          clearTimeout(timeout);
          resolve(result);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        }
      });

      this.sendMessage({
        id,
        type: 'rpc',
        method,
        params
      });
    });
  }

  getStatus(): { connected: boolean; sessionId?: string; url?: string } {
    return {
      connected: this.connection?.connected ?? false,
      sessionId: this.connection?.sessionId,
      url: this.connection?.url
    };
  }

  disconnect(): void {
    this.stopPingTimer();
    
    if (this.connection?.ws) {
      this.connection.ws.close();
    }
    
    this.connection = null;
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('raiken_relay_session');
    }
    
    this.pendingRequests.forEach((pending) => {
      pending.reject(new Error('Disconnected'));
    });
    this.pendingRequests.clear();
  }
}

export const relayBridgeService = new RelayBridgeService();