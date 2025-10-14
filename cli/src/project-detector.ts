import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';

export interface ProjectInfo {
  name: string;
  type: 'nextjs' | 'react' | 'vue' | 'svelte' | 'angular' | 'nuxt' | 'vite' | 'generic';
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun';
  testDir: string;
  hasPlaywright: boolean;
  hasJest: boolean;
  hasVitest: boolean;
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  rootDir: string;
  configFiles: string[];
}

export interface TestFile {
  name: string;
  path: string;
  content: string;
  createdAt: string;
  modifiedAt: string;
}

export interface TestReport {
  id: string;
  testPath: string;
  timestamp: string;
  success: boolean;
  output: string;
  error?: string;
  config: any;
  results?: any;
}

export async function detectProject(projectPath: string): Promise<ProjectInfo> {
  const packageJson = await loadPackageJson(projectPath);
  const projectName = packageJson.name || path.basename(projectPath);
  
  const dependencies = packageJson.dependencies || {};
  const devDependencies = packageJson.devDependencies || {};
  const scripts = packageJson.scripts || {};
  const allDeps = { ...dependencies, ...devDependencies };

  const [projectType, packageManager, testDir, configFiles] = await Promise.all([
    detectProjectType(allDeps),
    detectPackageManager(projectPath),
    detectTestDirectory(projectPath, detectProjectType(allDeps)),
    findConfigFiles(projectPath)
  ]);
  
  const hasPlaywright = !!(allDeps['playwright'] || allDeps['@playwright/test']);
  const hasJest = !!(allDeps['jest'] || allDeps['@types/jest']);
  const hasVitest = !!(allDeps['vitest']);

  return {
    name: projectName,
    type: projectType,
    packageManager,
    testDir,
    hasPlaywright,
    hasJest,
    hasVitest,
    scripts,
    dependencies,
    devDependencies,
    rootDir: projectPath,
    configFiles
  };
}

async function loadPackageJson(projectPath: string): Promise<any> {
  try {
    const packageJsonPath = path.join(projectPath, 'package.json');
    const content = await fs.readFile(packageJsonPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

function detectProjectType(dependencies: Record<string, string>): ProjectInfo['type'] {
  const frameworks = [
    { deps: ['next'], type: 'nextjs' as const },
    { deps: ['nuxt', 'nuxt3', '@nuxt/kit'], type: 'nuxt' as const },
    { deps: ['vue', '@vue/cli-service'], type: 'vue' as const },
    { deps: ['svelte', '@sveltejs/kit'], type: 'svelte' as const },
    { deps: ['@angular/core', '@angular/cli'], type: 'angular' as const },
    { deps: ['vite'], type: 'vite' as const },
    { deps: ['react', 'react-dom'], type: 'react' as const }
  ];

  for (const { deps, type } of frameworks) {
    if (deps.some(dep => dependencies[dep])) {
      return type;
    }
  }

  return 'generic';
}

async function detectPackageManager(projectPath: string): Promise<ProjectInfo['packageManager']> {
  const lockFiles = [
    { file: 'bun.lockb', manager: 'bun' as const },
    { file: 'pnpm-lock.yaml', manager: 'pnpm' as const },
    { file: 'yarn.lock', manager: 'yarn' as const },
    { file: 'package-lock.json', manager: 'npm' as const }
  ];

  for (const { file, manager } of lockFiles) {
    try {
      await fs.access(path.join(projectPath, file));
      return manager;
    } catch {
      // File doesn't exist, continue
    }
  }

  return 'npm'; // Default fallback
}

async function detectTestDirectory(
  projectPath: string,
  projectType: ProjectInfo['type']
): Promise<string> {
  const frameworkPreferences: Record<string, string[]> = {
    nextjs: ['e2e', 'tests', '__tests__', 'test'],
    react: ['src/__tests__', '__tests__', 'tests', 'test'],
    vue: ['tests', 'test', 'e2e'],
    angular: ['e2e', 'src/app/**/*.spec.ts'],
    svelte: ['tests', 'test'],
    nuxt: ['test', 'tests'],
    vite: ['tests', 'test', 'e2e'],
    generic: ['tests', 'test', 'e2e']
  };

  const preferredDirs = frameworkPreferences[projectType] || ['tests', 'test', 'e2e'];

  for (const dir of preferredDirs) {
    try {
      const fullPath = path.join(projectPath, dir);
      const stats = await fs.stat(fullPath);
      if (stats.isDirectory()) {
        return dir;
      }
    } catch {
      continue;
    }
  }

  const defaults: Record<string, string> = {
    nextjs: 'e2e',
    react: 'tests',
    vue: 'tests',
    angular: 'e2e',
    svelte: 'tests',
    nuxt: 'test',
    vite: 'tests',
    generic: 'tests'
  };

  return defaults[projectType] || 'tests';
}

async function findConfigFiles(projectPath: string): Promise<string[]> {
  const configPatterns = [
    'playwright.config.*',
    'jest.config.*',
    'vitest.config.*',
    'vite.config.*',
    'next.config.*',
    'nuxt.config.*',
    'vue.config.*',
    'svelte.config.*',
    'angular.json',
    'tsconfig.json',
    'tailwind.config.*',
    'postcss.config.*'
  ];

  const configFiles: string[] = [];

  await Promise.all(
    configPatterns.map(async (pattern) => {
      try {
        const matches = await glob(pattern, { cwd: projectPath });
        configFiles.push(...matches);
      } catch {
        // Ignore glob errors
      }
    })
  );

  return configFiles.sort();
}

export async function ensureTestDirectory(projectPath: string, testDir: string): Promise<void> {
  const fullTestPath = path.join(projectPath, testDir);
  
  try {
    await fs.access(fullTestPath);
  } catch {
    // Directory doesn't exist, create it
    await fs.mkdir(fullTestPath, { recursive: true });
  }
} 