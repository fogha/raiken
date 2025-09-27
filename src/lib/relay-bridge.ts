// Cloud relay bridge for enterprise/strict network environments

interface RelayConnection {
  sessionId: string;
  connected: boolean;
  ws: WebSocket | null;
  lastPing?: number;
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
  private readonly PING_INTERVAL = 30000; // 30 seconds
  private readonly TIMEOUT_MS = 8000;
  private pingTimer: NodeJS.Timeout | null = null;
  private pendingRequests = new Map<string, (result: any) => void>();

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
    if (this.connection?.connected) {
      return true;
    }

    return new Promise((resolve) => {
      try {
        const sessionId = this.getOrCreateSessionId();
        const wsUrl = `${this.RELAY_URL}?role=web&session=${encodeURIComponent(sessionId)}`;
        
        console.log('🌐 Connecting to relay bridge...', wsUrl);
        
        const ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          console.log('✓ Connected to relay bridge');
          this.connection = {
            sessionId,
            connected: true,
            ws,
            lastPing: Date.now()
          };
          
          this.startPingTimer();
          resolve(true);
        };

        ws.onmessage = (event) => {
          try {
            const message: RelayMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.warn('Invalid relay message:', event.data);
          }
        };

        ws.onclose = () => {
          console.log('🔄 Relay connection closed');
          this.connection = null;
          this.stopPingTimer();
          resolve(false);
        };

        ws.onerror = (error) => {
          console.error('❌ Relay connection error:', error);
          this.connection = null;
          this.stopPingTimer();
          resolve(false);
        };

        // Timeout for connection
        setTimeout(() => {
          if (!this.connection?.connected) {
            ws.close();
            resolve(false);
          }
        }, 5000);

      } catch (error) {
        console.error('Failed to create relay connection:', error);
        resolve(false);
      }
    });
  }

  private handleMessage(message: RelayMessage): void {
    if (message.type === 'pong') {
      if (this.connection) {
        this.connection.lastPing = Date.now();
      }
      return;
    }

    if (message.id && this.pendingRequests.has(message.id)) {
      const resolve = this.pendingRequests.get(message.id)!;
      this.pendingRequests.delete(message.id);
      resolve(message);
    }
  }

  private startPingTimer(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
    }

    this.pingTimer = setInterval(() => {
      if (this.connection?.ws && this.connection.connected) {
        const pingMessage: RelayMessage = {
          id: this.generateId(),
          type: 'ping'
        };
        
        this.connection.ws.send(JSON.stringify(pingMessage));
        
        // Check if we haven't received a pong in too long
        const timeSinceLastPing = Date.now() - (this.connection.lastPing || 0);
        if (timeSinceLastPing > this.PING_INTERVAL * 2) {
          console.warn('🔄 Relay connection seems stale, reconnecting...');
          this.disconnect();
        }
      }
    }, this.PING_INTERVAL);
  }

  private stopPingTimer(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  async rpc(method: string, params: any): Promise<any> {
    if (!this.connection?.connected) {
      const connected = await this.connect();
      if (!connected) {
        throw new Error('Failed to connect to relay');
      }
    }

    return new Promise((resolve, reject) => {
      const id = this.generateId();
      const message: RelayMessage = {
        id,
        type: 'rpc',
        method,
        params
      };

      this.pendingRequests.set(id, resolve);
      
      // Set timeout
      setTimeout(() => {
        if (this.pendingRequests.delete(id)) {
          reject(new Error('Relay request timeout'));
        }
      }, this.TIMEOUT_MS);

      if (this.connection?.ws) {
        this.connection.ws.send(JSON.stringify(message));
      } else {
        reject(new Error('No relay connection'));
      }
    });
  }

  disconnect(): void {
    this.stopPingTimer();
    
    if (this.connection?.ws) {
      this.connection.ws.close();
    }
    
    this.connection = null;
    this.pendingRequests.clear();
  }

  isConnected(): boolean {
    return this.connection?.connected ?? false;
  }

  getSessionId(): string | null {
    return this.connection?.sessionId || null;
  }
}

// Singleton instance
export const relayBridge = new RelayBridgeService();
