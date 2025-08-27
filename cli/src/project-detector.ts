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

export async function detectProject(projectPath: string): Promise<ProjectInfo> {
  const packageJsonPath = path.join(projectPath, 'package.json');
  
  // Check if package.json exists
  let packageJson: any = {};
  let projectName = path.basename(projectPath);
  
  try {
    const packageContent = await fs.readFile(packageJsonPath, 'utf-8');
    packageJson = JSON.parse(packageContent);
    projectName = packageJson.name || projectName;
  } catch (error) {
    // No package.json found, treat as generic project
  }

  const dependencies = packageJson.dependencies || {};
  const devDependencies = packageJson.devDependencies || {};
  const scripts = packageJson.scripts || {};
  const allDeps = { ...dependencies, ...devDependencies };

  // Detect project type
  const projectType = detectProjectType(allDeps, projectPath);
  
  // Detect package manager
  const packageManager = await detectPackageManager(projectPath);
  
  // Detect test directory
  const testDir = await detectTestDirectory(projectPath, projectType);
  
  // Check for testing frameworks
  const hasPlaywright = !!(allDeps['playwright'] || allDeps['@playwright/test']);
  const hasJest = !!(allDeps['jest'] || allDeps['@types/jest']);
  const hasVitest = !!(allDeps['vitest']);
  
  // Find config files
  const configFiles = await findConfigFiles(projectPath);

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

function detectProjectType(
  dependencies: Record<string, string>,
  projectPath: string
): ProjectInfo['type'] {
  // Check for Next.js
  if (dependencies['next']) {
    return 'nextjs';
  }
  
  // Check for Nuxt
  if (dependencies['nuxt'] || dependencies['nuxt3'] || dependencies['@nuxt/kit']) {
    return 'nuxt';
  }
  
  // Check for Vue
  if (dependencies['vue'] || dependencies['@vue/cli-service']) {
    return 'vue';
  }
  
  // Check for Svelte/SvelteKit
  if (dependencies['svelte'] || dependencies['@sveltejs/kit']) {
    return 'svelte';
  }
  
  // Check for Angular
  if (dependencies['@angular/core'] || dependencies['@angular/cli']) {
    return 'angular';
  }
  
  // Check for Vite
  if (dependencies['vite']) {
    return 'vite';
  }
  
  // Check for React (should be after framework-specific checks)
  if (dependencies['react'] || dependencies['react-dom']) {
    return 'react';
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
  const possibleDirs = [
    'tests',
    'test',
    'e2e',
    '__tests__',
    'spec',
    'cypress',
    'playwright'
  ];

  // Framework-specific preferences
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

  const preferredDirs = frameworkPreferences[projectType] || possibleDirs;

  // Check for existing test directories
  for (const dir of preferredDirs) {
    try {
      const fullPath = path.join(projectPath, dir);
      const stats = await fs.stat(fullPath);
      if (stats.isDirectory()) {
        return dir;
      }
    } catch {
      // Directory doesn't exist, continue
    }
  }

  // Default based on project type
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

  for (const pattern of configPatterns) {
    try {
      const matches = await glob(pattern, { cwd: projectPath });
      configFiles.push(...matches);
    } catch (error) {
      // Ignore errors in glob patterns
    }
  }

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