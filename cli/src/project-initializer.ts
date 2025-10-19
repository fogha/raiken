import * as fs from 'fs/promises';
import * as path from 'path';
import chalk from 'chalk';
import { detectProject, type ProjectInfo } from './project-detector';

export async function initializeProject(projectPath: string, force: boolean = false): Promise<void> {
  const projectInfo = await detectProject(projectPath);
  
  console.log(chalk.blue(`📁 Setting up ${projectInfo.type} project: ${projectInfo.name}`));
  
  // 1. Create test directory
  await createTestDirectory(projectPath, projectInfo);
  
  // 2. Create test-results directory structure
  await createTestResultsDirectory(projectPath);
  
  // 3. Create Raiken configuration
  await createRaikenConfig(projectPath, projectInfo, force);
  
  // 4. Set up Playwright configuration
  await setupPlaywrightConfig(projectPath, projectInfo, force);
  
  // 5. Update package.json scripts
  await updatePackageScripts(projectPath, projectInfo);
  
  // 6. Create example test
  await createExampleTest(projectPath, projectInfo);
  
  // 7. Install Playwright browsers
  await installPlaywrightBrowsers(projectPath, projectInfo);
  
  console.log(chalk.green('✓ Project initialization complete'));
}

async function createTestDirectory(projectPath: string, projectInfo: ProjectInfo): Promise<void> {
  const testDirPath = path.join(projectPath, projectInfo.testDir);
  
  try {
    await fs.access(testDirPath);
    console.log(chalk.yellow(`⚠ Test directory ${projectInfo.testDir}/ already exists`));
  } catch {
    await fs.mkdir(testDirPath, { recursive: true });
    console.log(chalk.green(`✓ Created test directory: ${projectInfo.testDir}/`));
  }
}

async function createTestResultsDirectory(projectPath: string): Promise<void> {
  const testResultsPath = path.join(projectPath, 'test-results');
  const testReportsPath = path.join(projectPath, 'test-reports');
  
  try {
    // Create test-results directory (for Playwright artifacts)
    await fs.mkdir(testResultsPath, { recursive: true });
    
    // Create test-reports directory (for Raiken reports - separate from Playwright)
    await fs.mkdir(testReportsPath, { recursive: true });
    
    // Create .gitignore in test-results to exclude Playwright artifacts
    const testResultsGitignorePath = path.join(testResultsPath, '.gitignore');
    const testResultsGitignoreContent = `# Playwright test artifacts
*
!.gitignore
`;
    
    try {
      await fs.access(testResultsGitignorePath);
      console.log(chalk.yellow('⚠ test-results/.gitignore already exists'));
    } catch {
      await fs.writeFile(testResultsGitignorePath, testResultsGitignoreContent);
      console.log(chalk.green('✓ Created test-results/.gitignore'));
    }
    
    // Create .gitignore in test-reports to exclude report JSON files
    const testReportsGitignorePath = path.join(testReportsPath, '.gitignore');
    const testReportsGitignoreContent = `# Test report JSON files
*.json
`;
    
    try {
      await fs.access(testReportsGitignorePath);
      console.log(chalk.yellow('⚠ test-reports/.gitignore already exists'));
    } catch {
      await fs.writeFile(testReportsGitignorePath, testReportsGitignoreContent);
      console.log(chalk.green('✓ Created test-reports/.gitignore'));
    }
    
    console.log(chalk.green('✓ Created test-results/ and test-reports/ directories'));
  } catch (error) {
    console.log(chalk.yellow('⚠ Could not create directory structure'));
  }
}

async function createRaikenConfig(projectPath: string, projectInfo: ProjectInfo, force: boolean): Promise<void> {
  const configPath = path.join(projectPath, 'raiken.config.json');
  
  const config = {
    projectType: projectInfo.type,
    testDirectory: projectInfo.testDir,
    playwrightConfig: 'playwright.config.ts',
    outputFormats: ['typescript'],
    ai: {
      provider: 'openrouter',
      model: 'anthropic/claude-3.5-sonnet'
    },
    features: {
      video: true,
      screenshots: true,
      tracing: false,
      network: true
    },
    browser: {
      defaultBrowser: 'chromium',
      headless: true,
      timeout: 30000,
      retries: 1
    }
  };
  
  try {
    await fs.access(configPath);
    if (!force) {
      console.log(chalk.yellow('⚠ raiken.config.json already exists (use --force to overwrite)'));
      return;
    }
  } catch {
    // File doesn't exist, proceed
  }
  
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
  console.log(chalk.green('✓ Created raiken.config.json'));
}

async function setupPlaywrightConfig(projectPath: string, projectInfo: ProjectInfo, force: boolean): Promise<void> {
  const configPath = path.join(projectPath, 'playwright.config.ts');
  
  const config = `import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './${projectInfo.testDir}',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  preserveOutput: 'always',
  use: {
    baseURL: 'http://localhost:${getDefaultPort(projectInfo.type)}',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Additional browsers can be enabled by uncommenting:
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],
  webServer: {
    command: '${getDevCommand(projectInfo)}',
    port: ${getDefaultPort(projectInfo.type)},
    reuseExistingServer: !process.env.CI,
  },
});
`;
  
  try {
    await fs.access(configPath);
    if (!force) {
      console.log(chalk.yellow('⚠ playwright.config.ts already exists (use --force to overwrite)'));
      return;
    }
  } catch {
    // File doesn't exist, proceed
  }
  
  await fs.writeFile(configPath, config);
  console.log(chalk.green('✓ Created playwright.config.ts'));
}

async function updatePackageScripts(projectPath: string, projectInfo: ProjectInfo): Promise<void> {
  const packageJsonPath = path.join(projectPath, 'package.json');
  
  try {
    const packageContent = await fs.readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageContent);
    
    const newScripts = {
      'test:e2e': 'playwright test',
      'test:e2e:ui': 'playwright test --ui',
      'test:e2e:debug': 'playwright test --debug',
      'raiken': 'raiken start'
    };
    
    packageJson.scripts = { ...packageJson.scripts, ...newScripts };
    
    await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log(chalk.green('✓ Updated package.json scripts'));
  } catch (error) {
    console.log(chalk.yellow('⚠ Could not update package.json scripts'));
  }
}

async function createExampleTest(projectPath: string, projectInfo: ProjectInfo): Promise<void> {
  const testPath = path.join(projectPath, projectInfo.testDir, 'example.spec.ts');
  
  try {
    await fs.access(testPath);
    console.log(chalk.yellow('⚠ Example test already exists'));
    return;
  } catch {
    // File doesn't exist, create it
  }
  
  const exampleTest = `import { test, expect } from '@playwright/test';

test('example test', async ({ page }) => {
  await page.goto('/');
  
  // Example: Check if the page loads
  await expect(page).toHaveTitle(/.*${projectInfo.name}.*/i);
  
  // Add your test steps here
  // await page.click('button[data-testid="my-button"]');
  // await expect(page.getByText('Success!')).toBeVisible();
});
`;
  
  await fs.writeFile(testPath, exampleTest);
  console.log(chalk.green(`✓ Created example test: ${projectInfo.testDir}/example.spec.ts`));
}

function getDefaultPort(projectType: string): number {
  switch (projectType) {
    case 'nextjs':
    case 'react':
    case 'nuxt':
      return 3000;
    case 'svelte':
    case 'vite':
      return 5173;
    case 'angular':
      return 4200;
    default:
      return 3000;
  }
}

function getDevCommand(projectInfo: ProjectInfo): string {
  if (projectInfo.scripts.dev) return 'npm run dev';
  if (projectInfo.scripts.start) return 'npm run start';
  if (projectInfo.scripts.serve) return 'npm run serve';
  return 'npm run dev';
}

async function installPlaywrightBrowsers(projectPath: string, projectInfo: ProjectInfo): Promise<void> {
  // Only install browsers if Playwright is already a dependency
  if (!projectInfo.hasPlaywright) {
    console.log(chalk.yellow('⚠ Playwright not detected as dependency, skipping browser installation'));
    return;
  }

  console.log(chalk.blue('📦 Installing Playwright browsers...'));
  
  try {
    const { spawn } = require('child_process');
    
    return new Promise<void>((resolve, reject) => {
      const child = spawn('npx', ['playwright', 'install'], {
        cwd: projectPath,
        stdio: 'inherit' // Show output to user
      });

      child.on('close', (code: number) => {
        if (code === 0) {
          console.log(chalk.green('✓ Playwright browsers installed successfully'));
          resolve();
        } else {
          console.log(chalk.yellow('⚠ Playwright browser installation failed, you may need to run "npx playwright install" manually'));
          resolve(); // Don't fail the entire setup
        }
      });

      child.on('error', (error: Error) => {
        console.log(chalk.yellow(`⚠ Could not install Playwright browsers: ${error.message}`));
        console.log(chalk.gray('  You can install them manually with: npx playwright install'));
        resolve(); // Don't fail the entire setup
      });
    });
  } catch (error) {
    console.log(chalk.yellow('⚠ Could not install Playwright browsers, you may need to run "npx playwright install" manually'));
  }
} 