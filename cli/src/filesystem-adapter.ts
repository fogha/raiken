import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import { ProjectInfo, ensureTestDirectory } from './project-detector';

interface TestFile {
  name: string;
  path: string;
  content: string;
  createdAt: string;
  modifiedAt: string;
}

export class LocalFileSystemAdapter {
  private projectPath: string;
  private projectInfo: ProjectInfo;
  private testDirectory: string;

  constructor(projectPath: string, projectInfo: ProjectInfo) {
    this.projectPath = projectPath;
    this.projectInfo = projectInfo;
    this.testDirectory = path.join(projectPath, projectInfo.testDir);
  }

  async getTestFiles(): Promise<TestFile[]> {
    await ensureTestDirectory(this.projectPath, this.projectInfo.testDir);

    const testPattern = path.join(this.testDirectory, '**/*.{spec,test}.{ts,js}');
    const testFilePaths = await glob(testPattern);

    const testFiles: TestFile[] = [];

    for (const filePath of testFilePaths) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const stats = await fs.stat(filePath);
        const relativePath = path.relative(this.projectPath, filePath);

        testFiles.push({
          name: path.basename(filePath),
          path: relativePath,
          content,
          createdAt: stats.birthtime.toISOString(),
          modifiedAt: stats.mtime.toISOString()
        });
      } catch (error) {
        console.error(`Failed to read test file ${filePath}:`, error);
      }
    }

    return testFiles.sort((a, b) => a.name.localeCompare(b.name));
  }

  async saveTestFile(content: string, filename: string, tabId?: string): Promise<string> {
    await ensureTestDirectory(this.projectPath, this.projectInfo.testDir);

    // Ensure filename has proper extension
    if (!filename.endsWith('.spec.ts') && !filename.endsWith('.test.ts')) {
      filename = filename.replace(/\.(js|ts)$/, '') + '.spec.ts';
    }

    // Sanitize filename
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    // Create new file
    const fullPath = path.join(this.testDirectory, sanitizedFilename);
    await fs.writeFile(fullPath, content, 'utf-8');
    
    const relativePath = path.relative(this.projectPath, fullPath);
    console.log(`✅ Test saved: ${relativePath}`);
    return relativePath;
  }

  async deleteTestFile(testPath: string): Promise<void> {
    // Security check - ensure path is within project directory
    const fullPath = path.resolve(this.projectPath, testPath);
    const normalizedProjectPath = path.resolve(this.projectPath);
    
    if (!fullPath.startsWith(normalizedProjectPath)) {
      throw new Error('Invalid test path - outside project directory');
    }

    await fs.unlink(fullPath);
    console.log(`🗑️ Test deleted: ${testPath}`);
  }

  async executeTest(testPath: string, config: any): Promise<{ success: boolean; output?: string; error?: string }> {
    try {
      const { spawn } = require('child_process');
      
      // Resolve test path - if it's just a filename, look in the test directory
      let resolvedTestPath = testPath;
      
      // If testPath is just a filename (no directory), look for it in the project's test directory
      if (!testPath.includes('/') && !testPath.includes('\\')) {
        const testFileInTestDir = path.join(this.testDirectory, testPath);
        try {
          await fs.access(testFileInTestDir);
          resolvedTestPath = path.relative(this.projectPath, testFileInTestDir);
          console.log(`✅ Found test file in test directory: ${testFileInTestDir}`);
        } catch {
          console.log(`❌ Test file not found in test directory: ${testFileInTestDir}`);
          // Keep original path and let Playwright handle the error
        }
      }
      
      // Build Playwright command
      const args = ['playwright', 'test', resolvedTestPath];
      
      if (config.headless === false) {
        args.push('--headed');
      }
      
      if (config.browserType && config.browserType !== 'chromium') {
        args.push(`--project=${config.browserType}`);
      }

      console.log(`Executing: npx ${args.join(' ')}`);
      console.log(`Working directory: ${this.projectPath}`);
      console.log(`Original test path: ${testPath}`);
      console.log(`Resolved test path: ${resolvedTestPath}`);
      console.log(`Test directory: ${this.testDirectory}`);
      
      return new Promise((resolve) => {
        const child = spawn('npx', args, {
          cwd: this.projectPath,
          stdio: ['ignore', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data: Buffer) => {
          stdout += data.toString();
        });

        child.stderr.on('data', (data: Buffer) => {
          stderr += data.toString();
        });

        child.on('close', (code: number | null) => {
          const success = code === 0;
          resolve({
            success,
            output: stdout,
            error: stderr
          });
        });

        child.on('error', (error: Error) => {
          resolve({
            success: false,
            error: error.message
          });
        });
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
} 