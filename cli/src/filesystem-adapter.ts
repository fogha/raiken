import * as fs from 'fs/promises';
import * as path from 'path';
import { ProjectInfo, TestFile, TestReport } from './project-detector';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class LocalFileSystemAdapter {
  private projectPath: string;
  private projectInfo: ProjectInfo;
  private testDirectory: string;
  private cache: Map<string, CacheEntry<any>> = new Map();
  private fileWatchers: Map<string, any> = new Map();
  
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly TEST_FILES_TTL = 2 * 60 * 1000; // 2 minutes
  private readonly REPORTS_TTL = 1 * 60 * 1000; // 1 minute

  constructor(projectPath: string, projectInfo: ProjectInfo) {
    this.projectPath = projectPath;
    this.projectInfo = projectInfo;
    this.testDirectory = path.join(projectPath, projectInfo.testDir);
    
    this.setupFileWatcher();
  }

  private setupFileWatcher(): void {
    try {
      const fs = require('fs');
      if (fs.existsSync(this.testDirectory)) {
        const watcher = fs.watch(this.testDirectory, { recursive: true }, (eventType: string, filename: string) => {
          if (filename && this.isTestFile(filename)) {
            this.invalidateCache('test-files');
          }
        });
        
        this.fileWatchers.set('test-directory', watcher);
      }
    } catch (error) {
      // Silent fail - file watching is not critical
    }
  }

  private isTestFile(filename: string): boolean {
    return filename.endsWith('.spec.ts') || 
           filename.endsWith('.test.ts') || 
           filename.endsWith('.spec.js') || 
           filename.endsWith('.test.js');
  }

  private getCacheKey(operation: string, ...params: any[]): string {
    return `${operation}:${params.join(':')}`;
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  private setCache<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  private invalidateCache(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  async getTestFiles(): Promise<TestFile[]> {
    const cacheKey = this.getCacheKey('test-files');
    
    const cached = this.getFromCache<TestFile[]>(cacheKey);
    if (cached) {
      return cached;
    }

    await ensureTestDirectory(this.projectPath, this.projectInfo.testDir);

    const testPattern = path.join(this.testDirectory, '**/*.{spec,test}.{ts,js}');
    const glob = require('glob');
    const testFilePaths = glob.sync(testPattern);

    const testFiles: TestFile[] = [];

    for (const filePath of testFilePaths) {
      try {
        const [content, stats] = await Promise.all([
          fs.readFile(filePath, 'utf-8'),
          fs.stat(filePath)
        ]);
        
        const relativePath = path.relative(this.projectPath, filePath);

        testFiles.push({
          name: path.basename(filePath),
          path: relativePath,
          content,
          createdAt: stats.birthtime.toISOString(),
          modifiedAt: stats.mtime.toISOString()
        });
      } catch (error) {
        continue;
      }
    }

    const sortedFiles = testFiles.sort((a, b) => a.name.localeCompare(b.name));
    this.setCache(cacheKey, sortedFiles, this.TEST_FILES_TTL);
    
    return sortedFiles;
  }

  async saveTestFile(content: string, filename: string, tabId?: string): Promise<string> {
    await ensureTestDirectory(this.projectPath, this.projectInfo.testDir);

    const normalizedFilename = this.normalizeTestFilename(filename);
    const fullPath = path.join(this.testDirectory, normalizedFilename);
    
    await fs.writeFile(fullPath, content, 'utf-8');
    this.invalidateCache('test-files');
    
    return path.relative(this.projectPath, fullPath);
  }

  private normalizeTestFilename(filename: string): string {
    // Remove any existing test extensions first
    let normalizedName = filename
      .replace(/\.(spec|test)\.(ts|js)$/, '')
      .replace(/\.(ts|js)$/, '');
    
    // Sanitize the base name
    normalizedName = normalizedName.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    // Add the .spec.ts extension
    return `${normalizedName}.spec.ts`;
  }

  async deleteTestFile(testPath: string): Promise<void> {
    const fullPath = path.resolve(this.projectPath, testPath);
    const normalizedProjectPath = path.resolve(this.projectPath);
    
    if (!fullPath.startsWith(normalizedProjectPath)) {
      throw new Error('Invalid test path - outside project directory');
    }

    await fs.unlink(fullPath);
    this.invalidateCache('test-files');
  }

  async executeTest(testPath: string, config: any): Promise<{ success: boolean; output?: string; error?: string; reportId?: string }> {
    try {
      const resolvedTestPath = await this.resolveTestPath(testPath);
      
      const testResultsDir = path.join(this.projectPath, 'test-results');
      const reportsDir = path.join(testResultsDir, 'reports');
      await fs.mkdir(reportsDir, { recursive: true });
      
      const args = this.buildPlaywrightArgs(resolvedTestPath, config);
      const result = await this.runPlaywrightProcess(args);
      const reportId = await this.saveTestReport(resolvedTestPath, result, config, reportsDir);
      
      this.invalidateCache('reports');
      
      return {
        success: result.success,
        output: result.output,
        error: result.error,
        reportId
      };
      
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error during test execution'
      };
    }
  }

  private async resolveTestPath(testPath: string): Promise<string> {
    const filename = path.basename(testPath);
      const testFileInTestDir = path.join(this.testDirectory, filename);
      
      try {
        await fs.access(testFileInTestDir);
      return path.relative(this.projectPath, testFileInTestDir);
    } catch {
        try {
          const testDirContents = await fs.readdir(this.testDirectory);
          const similarFiles = testDirContents.filter(file => 
            file.toLowerCase().includes(filename.toLowerCase().substring(0, 20)) ||
            filename.toLowerCase().includes(file.toLowerCase().substring(0, 20))
          );
          
          if (similarFiles.length > 0) {
          return path.relative(this.projectPath, path.join(this.testDirectory, similarFiles[0]));
        }
        
            const glob = require('glob');
        const matches = glob.sync(`**/${filename}`, { cwd: this.projectPath });
              
              if (matches.length > 0) {
          return matches[0];
        }
        
                const shortName = filename.split('_')[0];
        const broadMatches = glob.sync(`**/*${shortName}*.spec.ts`, { cwd: this.projectPath });
        
        return broadMatches.length > 0 ? broadMatches[0] : filename;
      } catch {
        return filename;
      }
    }
  }

  private buildPlaywrightArgs(testPath: string, config: any): string[] {
    const args = ['playwright', 'test', testPath, '--reporter=json'];
      
      if (config.headless === false) {
        args.push('--headed');
      }
      
    return args;
  }

  private async runPlaywrightProcess(args: string[]): Promise<{ success: boolean; output: string; error?: string }> {
    const { spawn } = require('child_process');
    
        const child = spawn('npx', args, {
          cwd: this.projectPath,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env }
        });

    let output = '';
    let errorOutput = '';

    child.stdout.on('data', (data: Buffer) => {
      output += data.toString();
    });

    child.stderr.on('data', (data: Buffer) => {
      errorOutput += data.toString();
    });

    return new Promise((resolve) => {
      child.on('close', (code: number | null) => {
        const success = code === 0;
        resolve({
          success,
          output: output || errorOutput,
          error: success ? undefined : (errorOutput || 'Test execution failed')
        });
      });
      
      child.on('error', (error: Error) => {
        resolve({
          success: false,
          output: '',
          error: `Process error: ${error.message}`
        });
      });
    });
  }

  private async saveTestReport(
    testPath: string, 
    result: { success: boolean; output: string; error?: string }, 
    config: any, 
    reportsDir: string
  ): Promise<string> {
    let testResults: any = null;
    
    try {
      const jsonMatch = result.output.match(/\{[\s\S]*"stats"[\s\S]*\}/);
      if (jsonMatch) {
        testResults = JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Ignore parse errors
    }
    
    const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const reportData = {
      id: reportId,
      testPath,
      timestamp: new Date().toISOString(),
      success: result.success,
      output: result.output,
      error: result.error,
      config,
      results: testResults
    };
    
    const reportPath = path.join(reportsDir, `${reportId}.json`);
    await fs.writeFile(reportPath, JSON.stringify(reportData, null, 2));
    
    return reportId;
  }

  async getReports(): Promise<TestReport[]> {
    const cacheKey = this.getCacheKey('reports');
    
    const cached = this.getFromCache<TestReport[]>(cacheKey);
    if (cached) {
      return cached;
    }

      const reportsDir = path.join(this.projectPath, 'test-results', 'reports');
      
      try {
        await fs.access(reportsDir);
      } catch {
        return [];
      }

      const reportFiles = await fs.readdir(reportsDir);
    const jsonFiles = reportFiles.filter(file => file.endsWith('.json'));

    const reports: TestReport[] = [];

    for (const file of jsonFiles) {
      try {
        const filePath = path.join(reportsDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const reportData = JSON.parse(content);
        
        reports.push({
          id: reportData.id || path.basename(file, '.json'),
          testPath: reportData.testPath || 'unknown',
          timestamp: reportData.timestamp || new Date().toISOString(),
          success: reportData.success || false,
          output: reportData.output || '',
          error: reportData.error,
          config: reportData.config || {},
          results: reportData.results
        });
          } catch (error) {
        continue;
      }
    }

    const sortedReports = reports.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    this.setCache(cacheKey, sortedReports, this.REPORTS_TTL);
    
    return sortedReports;
  }

  async deleteReport(reportId: string): Promise<void> {
    const reportsDir = path.join(this.projectPath, 'test-results', 'reports');
    const reportPath = path.join(reportsDir, `${reportId}.json`);
    
    try {
            await fs.unlink(reportPath);
      this.invalidateCache('reports');
    } catch (error) {
      throw new Error(`Failed to delete report: ${reportId}`);
    }
  }

  cleanup(): void {
    for (const [, watcher] of this.fileWatchers) {
      try {
        watcher.close();
    } catch (error) {
        // Ignore cleanup errors
      }
    }
    this.fileWatchers.clear();
    this.cache.clear();
  }
} 

async function ensureTestDirectory(projectPath: string, testDir: string): Promise<void> {
  const testDirectory = path.join(projectPath, testDir);
  await fs.mkdir(testDirectory, { recursive: true });
} 