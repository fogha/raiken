import express from 'express';
import chalk from 'chalk';
import detectPort from 'detect-port';
import cors from 'cors';
import { ProjectInfo } from './project-detector';
import { LocalFileSystemAdapter } from './filesystem-adapter';

interface RemoteServerOptions {
  port: number;
  projectPath: string;
  projectInfo: ProjectInfo;
}

export async function startRemoteServer(options: RemoteServerOptions): Promise<void> {
  const { port: requestedPort, projectPath, projectInfo } = options;

  // Find an available port
  const availablePort = await detectPort(requestedPort);
  if (availablePort !== requestedPort) {
    console.log(chalk.yellow(`Port ${requestedPort} is busy, using ${availablePort} instead`));
  }

  const app = express();

  // CORS configuration for hosted platform
  app.use(cors({
    origin: ['https://arten.dev', 'http://localhost:3000', 'http://localhost:3002', 'http://localhost:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS']
  }));

  // Parse JSON bodies
  app.use(express.json({ limit: '10mb' }));

  // Generate authentication token
  const authToken = generateAuthToken();
  console.log(chalk.blue(`🔑 Remote access token: ${authToken}`));
  console.log(chalk.gray(`   Configure this token in the hosted platform`));

  // Request logging
  app.use('/api', (req, res, next) => {
    console.log(`${chalk.cyan(req.method)} ${chalk.yellow(req.path)} - ${new Date().toISOString()}`);
    next();
  });

  // Auth middleware (exclude health and project-info endpoints for discovery)
  app.use('/api', (req, res, next) => {
    // Skip auth for discovery endpoints
    if (req.path === '/health' || req.path === '/project-info') {
      return next();
    }
    
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token !== authToken) {
      console.log(`${chalk.red('❌ Unauthorized request:')} ${req.method} ${req.path}`);
      return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
  });

  // Create filesystem adapter
  const fsAdapter = new LocalFileSystemAdapter(projectPath, projectInfo);

  // Health check endpoint (no auth required)
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      project: projectInfo.name,
      type: projectInfo.type,
      testDir: projectInfo.testDir,
      timestamp: new Date().toISOString()
    });
  });

  // Project info with auth token
  app.get('/api/project-info', (req, res) => {
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
  app.get('/api/test-files', async (req, res) => {
    try {
      const testFiles = await fsAdapter.getTestFiles();
      res.json({ files: testFiles }); // Match the expected format
    } catch (error) {
      console.error('Failed to load test files:', error);
      res.status(500).json({ error: 'Failed to load test files' });
    }
  });

  app.post('/api/save-test', async (req, res) => {
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

  app.delete('/api/delete-test', async (req, res) => {
    try {
      const { testPath } = req.body;
      await fsAdapter.deleteTestFile(testPath);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete test file' });
    }
  });

  // Catch-all for unsupported endpoints
  app.use('*', (req, res) => {
    res.status(404).json({ error: 'Endpoint not found. This is a bridge server for local file operations.' });
  });

  // Start the server
  const server = app.listen(availablePort, () => {
    console.log(chalk.green(`✓ Arten bridge server running at http://localhost:${availablePort}`));
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
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
} 