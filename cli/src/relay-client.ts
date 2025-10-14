// CLI relay client for connecting to cloud relay when direct connection isn't possible

import WebSocket, { RawData } from 'ws';
import chalk from 'chalk';
import { LocalFileSystemAdapter } from './filesystem-adapter';
import { ProjectInfo } from './project-detector';

interface RelayMessage {
  id: string;
  type: 'rpc' | 'ping' | 'pong';
  method?: string;
  params?: any;
  result?: any;
  error?: string;
}

interface RelayClientOptions {
  relayUrl: string;
  sessionId: string;
  projectPath: string;
  projectInfo: ProjectInfo;
}

export class RelayClient {
  private ws: WebSocket | null = null;
  private fsAdapter: LocalFileSystemAdapter;
  private options: RelayClientOptions;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingTimer: NodeJS.Timeout | null = null;
  private isConnected = false;

  constructor(options: RelayClientOptions) {
    this.options = options;
    this.fsAdapter = new LocalFileSystemAdapter(options.projectPath, options.projectInfo);
  }

  async connect(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const wsUrl = `${this.options.relayUrl}?role=cli&session=${encodeURIComponent(this.options.sessionId)}`;
        
        console.log(chalk.blue('Connecting to relay server...'));
        console.log(chalk.gray(`URL: ${wsUrl}`));
        console.log(chalk.gray(`Session: ${this.options.sessionId}`));
        
        this.ws = new WebSocket(wsUrl);

        this.ws.on('open', () => {
          console.log(chalk.green('Connected to relay server'));
          this.isConnected = true;
          this.startPingTimer();
          resolve(true);
        });

        this.ws.on('message', async (data: RawData) => {
          try {
            const message: RelayMessage = JSON.parse(data.toString());
            await this.handleMessage(message);
          } catch (error) {
            console.error(chalk.red('Failed to handle relay message:'), error);
          }
        });

        this.ws.on('close', () => {
          console.log(chalk.yellow('Relay connection closed'));
          this.isConnected = false;
          this.stopPingTimer();
          this.scheduleReconnect();
          resolve(false);
        });

        this.ws.on('error', (error: Error) => {
          console.error(chalk.red('Relay connection error:'), error);
          this.isConnected = false;
          this.stopPingTimer();
          resolve(false);
        });

        // Connection timeout
        setTimeout(() => {
          if (!this.isConnected) {
            this.ws?.close();
            resolve(false);
          }
        }, 10000);

      } catch (error) {
        console.error(chalk.red('Failed to create relay connection:'), error);
        resolve(false);
      }
    });
  }

  private async handleMessage(message: RelayMessage): Promise<void> {
    if (message.type === 'ping') {
      this.sendMessage({
        id: message.id,
        type: 'pong'
      });
      return;
    }

    if (message.type === 'rpc' && message.method) {
      try {
        const result = await this.handleRpcMethod(message.method, message.params);
        this.sendMessage({
          id: message.id,
          type: 'rpc',
          result
        });
      } catch (error) {
        this.sendMessage({
          id: message.id,
          type: 'rpc',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  private async handleRpcMethod(method: string, params: any): Promise<any> {
    const rpcHandlers: Record<string, (params: any) => Promise<any>> = {
      saveTest: async ({ content, filename, tabId }) => {
        const savedPath = await this.fsAdapter.saveTestFile(content, filename, tabId);
        return { success: true, path: savedPath };
      },
      
      executeTest: async ({ testPath, config }) => {
        return await this.fsAdapter.executeTest(testPath, config);
      },
      
      getTestFiles: async () => {
        const testFiles = await this.fsAdapter.getTestFiles();
        return { success: true, files: testFiles };
      },
      
      getReports: async () => {
        const reports = await this.fsAdapter.getReports();
        return { success: true, reports };
      },
      
      deleteReport: async ({ reportId }) => {
        await this.fsAdapter.deleteReport(reportId);
        return { success: true };
      },
      
      deleteTest: async ({ testPath }) => {
        await this.fsAdapter.deleteTestFile(testPath);
        return { success: true };
      },
      
      ping: async () => {
        return { pong: Date.now() };
      }
    };

    const handler = rpcHandlers[method];
    if (!handler) {
      throw new Error(`Unknown RPC method: ${method}`);
    }

    return await handler(params);
  }

  private sendMessage(message: RelayMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private startPingTimer(): void {
    this.pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.sendMessage({
          id: `ping_${Date.now()}`,
          type: 'ping'
        });
      }
    }, 30000);
  }

  private stopPingTimer(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(() => {
      console.log(chalk.blue('Attempting to reconnect to relay...'));
      this.connect();
    }, 5000);
  }

  disconnect(): void {
    this.stopPingTimer();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.fsAdapter.cleanup();
    this.isConnected = false;
  }

  getStatus(): { connected: boolean; sessionId: string } {
    return {
      connected: this.isConnected,
      sessionId: this.options.sessionId
    };
  }
}