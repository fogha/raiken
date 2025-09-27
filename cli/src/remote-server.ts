import express, { Request, Response, NextFunction } from 'express';
import chalk from 'chalk';
import detectPort from 'detect-port';
import cors from 'cors';
import path from 'path';
import { ProjectInfo } from './project-detector';
import { LocalFileSystemAdapter } from './filesystem-adapter';
import { RelayClient } from './relay-client';

interface RemoteServerOptions {
  port: number;
  projectPath: string;
  projectInfo: ProjectInfo;
  relayMode?: boolean;
  relayUrl?: string;
  sessionId?: string;
}

export async function startRemoteServer(options: RemoteServerOptions): Promise<void> {
  const { port: requestedPort, projectPath, projectInfo, relayMode, relayUrl, sessionId } = options;

  // If relay mode is requested, start relay client instead
  if (relayMode && relayUrl && sessionId) {
    console.log(chalk.blue('🌐 Starting in relay mode...'));
    
    const relayClient = new RelayClient({
      relayUrl,
      sessionId,
      projectPath,
      projectInfo
    });

    const connected = await relayClient.connect();
    if (connected) {
      console.log(chalk.green('✓ Relay client connected successfully'));
      console.log(chalk.blue(`  Session ID: ${sessionId}`));
      console.log(chalk.cyan('💡 Share this session ID with your web app to connect'));
      
      // Keep the process alive
      process.on('SIGINT', () => {
        console.log(chalk.yellow('\n⚠ Shutting down relay client...'));
        relayClient.disconnect();
        process.exit(0);
      });
      
      return;
    } else {
      console.log(chalk.red('❌ Failed to connect to relay server'));
      console.log(chalk.yellow('🔄 Falling back to local HTTP server mode...'));
    }
  }

  // Find an available port with explicit fallback logic
  let availablePort = await detectPort(requestedPort);
  
  // If the requested port is not available, try sequential ports
  if (availablePort !== requestedPort) {
    console.log(chalk.yellow(`Port ${requestedPort} is busy, trying fallback ports...`));
    
    // Try ports 3460, 3461, 3462, etc.
    const basePort = 3460;
    for (let i = 0; i < 10; i++) {
      const tryPort = basePort + i;
      const testPort = await detectPort(tryPort);
      if (testPort === tryPort) {
        availablePort = tryPort;
        console.log(chalk.green(`✓ Using port ${availablePort}`));
        break;
      }
    }
    
    if (availablePort !== requestedPort) {
      console.log(chalk.yellow(`Using port ${availablePort} (fallback from ${requestedPort})`));
    }
  }

  const app = express();

  // CORS configuration for hosted platform
  const allowedOrigins = [
    'https://raiken.dev',
    'https://app.raiken.dev',
    'https://staging.raiken.dev',
    // Your deployed instance
    'http://84.46.245.248:3000',
    'https://84.46.245.248:3000',
    // Local development
    'http://localhost:3000',
    'http://localhost:3001', 
    'http://localhost:3002',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:3002'
  ];

  // Allow custom origins from environment
  const customOrigins = process.env.RAIKEN_ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [];
  allowedOrigins.push(...customOrigins);

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log(`${chalk.yellow('⚠️ CORS blocked origin:')} ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: false, // We use Bearer tokens, not cookies
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    maxAge: 86400 // Cache preflight for 24 hours
  }));

  // Parse JSON bodies
  app.use(express.json({ limit: '10mb' }));

  // Generate authentication token
  const authToken = generateAuthToken();
  
  // Display token prominently for pairing
  console.log('');
  console.log(chalk.bgBlue.white.bold(' 🔑 BRIDGE CONNECTION TOKEN '));
  console.log('');
  console.log(chalk.cyan(`   ${authToken}`));
  console.log('');
  console.log(chalk.yellow('💡 Copy this token to connect your web app:'));
  console.log(chalk.gray('   1. Open the Raiken web platform'));
  console.log(chalk.gray('   2. Click "Connect Local Bridge"'));
  console.log(chalk.gray('   3. Paste the token above'));
  console.log(chalk.gray('   4. Token expires in 24 hours'));
  console.log('');

  // Request logging
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    console.log(`${chalk.cyan(req.method)} ${chalk.yellow(req.path)} - ${new Date().toISOString()}`);
    next();
  });

  // Auth middleware (exclude health, project-info, and artifacts endpoints)
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    if (req.path === '/health' || req.path === '/project-info' || req.path.startsWith('/artifacts/')) {
      return next();
    }
    
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log(`${chalk.red('❌ Missing or invalid authorization header:')} ${req.method} ${req.path}`);
      return res.status(401).json({ error: 'Authorization header required' });
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    // Validate token format and age
    if (!validateAuthToken(token)) {
      console.log(`${chalk.red('❌ Invalid token format:')} ${req.method} ${req.path}`);
      return res.status(401).json({ error: 'Invalid token format' });
    }
    
    // Check if token matches current session
    if (token !== authToken) {
      console.log(`${chalk.red('❌ Token mismatch:')} ${req.method} ${req.path}`);
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    next();
  });

  // Create filesystem adapter
  const fsAdapter = new LocalFileSystemAdapter(projectPath, projectInfo);

  // Health check endpoint (no auth required)
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      project: projectInfo.name,
      type: projectInfo.type,
      testDir: projectInfo.testDir,
      timestamp: new Date().toISOString()
    });
  });

  // Project info with auth token
  app.get('/api/project-info', (req: Request, res: Response) => {
    res.json({
      ...projectInfo,
      authToken: authToken,
      capabilities: [
        'file-write',
        'file-read',
        'file-delete'
      ]
    });
  });

  // File operations
  app.get('/api/test-files', async (req: Request, res: Response) => {
    try {
      const testFiles = await fsAdapter.getTestFiles();
      res.json({ files: testFiles }); // Match the expected format
    } catch (error) {
      console.error('Failed to load test files:', error);
      res.status(500).json({ error: 'Failed to load test files' });
    }
  });

  app.post('/api/save-test', async (req: Request, res: Response) => {
    try {
      // Handle both formats: {content, filename} and {name, content}
      const { content, filename, name, tabId } = req.body;
      const fileToSave = filename || name || 'generated-test';
      const savedPath = await fsAdapter.saveTestFile(content, fileToSave, tabId);
      res.json({ 
        path: savedPath, 
        filePath: savedPath, // Also include filePath for compatibility
        success: true 
      });
    } catch (error) {
      console.error('Failed to save test file:', error);
      res.status(500).json({ error: 'Failed to save test file' });
    }
  });

  app.delete('/api/delete-test', async (req: Request, res: Response) => {
    try {
      const { testPath } = req.body;
      await fsAdapter.deleteTestFile(testPath);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete test file' });
    }
  });

  // Test execution endpoint
  app.post('/api/execute-test', async (req: Request, res: Response) => {
    try {
      const { testPath, config } = req.body;
      
      if (!testPath) {
        return res.status(400).json({ error: 'testPath is required' });
      }
      
      console.log(`${chalk.green('🧪 Executing test:')} ${testPath}`);
      console.log(`${chalk.gray('   Config:')} ${JSON.stringify(config, null, 2)}`);
      
      // Execute test using the filesystem adapter
      const result = await fsAdapter.executeTest(testPath, config);
      
      res.json(result);
    } catch (error) {
      console.error('Failed to execute test:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to execute test' 
      });
    }
  });

  // Reports endpoints
  app.get('/api/reports', async (req: Request, res: Response) => {
    try {
      const reports = await fsAdapter.getReports();
      res.json({ success: true, reports });
    } catch (error) {
      console.error('Failed to get reports:', error);
      res.status(500).json({ error: 'Failed to get reports' });
    }
  });

  app.delete('/api/reports/:reportId', async (req: Request, res: Response) => {
    try {
      const { reportId } = req.params;
      await fsAdapter.deleteReport(reportId);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to delete report:', error);
      res.status(500).json({ error: 'Failed to delete report' });
    }
  });

  // Serve test artifacts (screenshots, videos, traces)
  app.get('/api/artifacts/*', (req: Request, res: Response) => {
    console.log(`[Artifacts] Request received: ${req.method} ${req.path} ${req.url}`);
    try {
      const artifactPath = req.params[0];
      const fullPath = path.join(projectPath, 'test-results', artifactPath);
      
      // Security check - ensure path is within test-results
      const resolvedPath = path.resolve(fullPath);
      const testResultsPath = path.resolve(projectPath, 'test-results');
      
      if (!resolvedPath.startsWith(testResultsPath)) {
        console.log(`[Artifacts] Access denied: ${resolvedPath} not in ${testResultsPath}`);
        return res.status(403).json({ error: 'Access denied' });
      }
      
      console.log(`[Artifacts] Serving: ${artifactPath} from ${fullPath}`);
      res.sendFile(resolvedPath);
    } catch (error) {
      console.error('[Artifacts] Failed to serve artifact:', error);
      res.status(404).json({ error: 'Artifact not found' });
    }
  });

  // Catch-all for unsupported endpoints
  app.use('*', (req: Request, res: Response) => {
    res.status(404).json({ error: 'Endpoint not found. This is a bridge server for local file operations.' });
  });

  // Start the server
  const server = app.listen(availablePort, () => {
    console.log(chalk.green(`✓ Raiken bridge server running at http://localhost:${availablePort}`));
    console.log(chalk.blue(`  Project: ${projectInfo.name} (${projectInfo.type})`));
    console.log(chalk.blue(`  Test directory: ${projectInfo.testDir}`));
    console.log(chalk.yellow(`  🌐 Hosted platform configuration:`));
    console.log(chalk.gray(`     URL: http://localhost:${availablePort}`));
    console.log(chalk.gray(`     Token: ${authToken}`));
    console.log('');
    console.log(chalk.cyan('💡 The hosted platform will automatically detect this server'));
    console.log(chalk.cyan('   and save generated tests directly to your project.'));
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log(chalk.yellow('\n⚠ Shutting down bridge server...'));
    server.close(() => {
      console.log(chalk.green('✓ Server stopped'));
      process.exit(0);
    });
  });
}

function generateAuthToken(): string {
  // Generate a cryptographically secure token
  const crypto = require('crypto');
  const randomBytes = crypto.randomBytes(32);
  const timestamp = Date.now().toString(36);
  const random = randomBytes.toString('hex');
  
  // Combine timestamp and random for uniqueness and some time-based validation
  return `${timestamp}-${random}`;
}

function validateAuthToken(token: string): boolean {
  if (!token || typeof token !== 'string') return false;
  
  // Check format: timestamp-randomhex
  const parts = token.split('-');
  if (parts.length !== 2) return false;
  
  const [timestampPart, randomPart] = parts;
  
  // Validate timestamp part (base36)
  if (!/^[0-9a-z]+$/.test(timestampPart)) return false;
  
  // Validate random part (hex)
  if (!/^[0-9a-f]{64}$/.test(randomPart)) return false;
  
  // Check if token is not too old (24 hours)
  const timestamp = parseInt(timestampPart, 36);
  const age = Date.now() - timestamp;
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  
  return age <= maxAge;
} 