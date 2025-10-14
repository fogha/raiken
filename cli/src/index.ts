#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { startRemoteServer } from './remote-server';
import { detectProject } from './project-detector';
import { initializeProject } from './project-initializer';

const program = new Command();

// Get version from package.json
const packageJson = require('../package.json');

async function checkInstallation() {
  try {
    const { execSync } = require('child_process');
    execSync('which raiken', { stdio: 'ignore' });
  } catch {
    console.log(chalk.yellow('\n⚠️  Installation note:'));
    console.log(chalk.gray('   Make sure to add npm global bin directory to your PATH:'));
    console.log(chalk.cyan('   export PATH=$PATH:$(npm get prefix)/bin'));
  }
}

program
  .name('raiken')
  .description('AI-powered Playwright test generator - Local bridge for hosted platform')
  .version(packageJson.version, '-v, --version', 'output the current version');

program
  .command('init')
  .description('Initialize Raiken in the current project (run this in your target project root)')
  .option('--force', 'Overwrite existing configuration')
  .action(async (options) => {
    console.log(chalk.blue('🎭 Initializing Raiken...'));
    
    try {
      await initializeProject(process.cwd(), options.force);
      console.log(chalk.green('✅ Raiken initialization complete!'));
      console.log(chalk.cyan('\n💡 Next steps:'));
      console.log(chalk.gray('   1. Run "raiken remote" to start the bridge server'));
      console.log(chalk.gray('   2. Open the hosted Raiken platform'));
      console.log(chalk.gray('   3. Generate tests - they will be saved directly to your project'));
    } catch (error) {
      console.error(chalk.red('❌ Initialization failed:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('start')
  .description('Start Raiken bridge server (initializes project if needed)')
  .option('-p, --port <port>', 'Port to run the server on', '3460')
  .option('--init', 'Run initialization first if not already initialized')
  .action(async (options) => {
    console.log(chalk.blue('🎭 Starting Raiken...'));
    
    // Check if project is initialized
    const fs = require('fs');
    const path = require('path');
    const configPath = path.join(process.cwd(), 'raiken.config.json');
    
    if (!fs.existsSync(configPath)) {
      if (options.init) {
        console.log(chalk.yellow('⚠️  Project not initialized, running init first...'));
        try {
          await initializeProject(process.cwd(), false);
        } catch (error) {
          console.error(chalk.red('❌ Initialization failed:'), error instanceof Error ? error.message : error);
          process.exit(1);
        }
      } else {
        console.log(chalk.red('❌ Project not initialized!'));
        console.log(chalk.cyan('💡 Run one of these commands:'));
        console.log(chalk.gray('   - "raiken init" to initialize the project'));
        console.log(chalk.gray('   - "raiken start --init" to initialize and start'));
        process.exit(1);
      }
    }
    
    // Start the bridge server
    console.log(chalk.blue('🎭 Starting Raiken bridge server...'));
    console.log(chalk.yellow('⚠️  This allows the hosted platform to save tests to your local project'));
    
    // Detect the current project
    const projectInfo = await detectProject(process.cwd());
    console.log(chalk.green(`✓ Detected ${projectInfo.type} project: ${projectInfo.name}`));
    
    // Start the bridge server
    await startRemoteServer({
      port: parseInt(options.port),
      projectPath: process.cwd(),
      projectInfo
    });
  });

program
  .command('relay')
  .description('Connect to cloud relay server (for enterprise/restricted networks)')
  .option('-s, --session <session>', 'Session ID for relay connection')
  .option('-u, --url <url>', 'Relay server URL', 'ws://84.46.245.248:3001/bridge')
  .action(async (options) => {
    console.log(chalk.blue('🌐 Starting Raiken relay mode...'));
    
    // Check if project is initialized
    const fs = require('fs');
    const path = require('path');
    const configPath = path.join(process.cwd(), 'raiken.config.json');
    
    if (!fs.existsSync(configPath)) {
      console.log(chalk.red('❌ Project not initialized!'));
      console.log(chalk.cyan('💡 Run "raiken init" first'));
      process.exit(1);
    }
    
    // Generate session ID if not provided
    let sessionId = options.session;
    if (!sessionId) {
      sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
      console.log(chalk.yellow('📋 Generated session ID:'), chalk.cyan(sessionId));
      console.log(chalk.gray('   Use this ID in your web app to connect'));
    }
    
    // Detect the current project
    const projectInfo = await detectProject(process.cwd());
    console.log(chalk.green(`✓ Detected ${projectInfo.type} project: ${projectInfo.name}`));
    
    // Start in relay mode
    await startRemoteServer({
      port: 0, // Not used in relay mode
      projectPath: process.cwd(),
      projectInfo,
      relayMode: true,
      relayUrl: options.url,
      sessionId
    });
  });

program
  .command('remote')
  .description('Start bridge server for hosted platform integration (project must be initialized first)')
  .option('-p, --port <port>', 'Port to run the server on', '3460')
  .action(async (options) => {
    // Check if project is initialized
    const fs = require('fs');
    const path = require('path');
    const configPath = path.join(process.cwd(), 'raiken.config.json');
    
    if (!fs.existsSync(configPath)) {
      console.log(chalk.red('❌ Project not initialized!'));
      console.log(chalk.cyan('💡 Run "raiken init" first to set up the project'));
      process.exit(1);
    }
    
    console.log(chalk.blue('🎭 Starting Raiken bridge server...'));
    console.log(chalk.yellow('⚠️  This allows the hosted platform to save tests to your local project'));
    
    // Detect the current project
    const projectInfo = await detectProject(process.cwd());
    console.log(chalk.green(`✓ Detected ${projectInfo.type} project: ${projectInfo.name}`));
    
    // Start the bridge server
    await startRemoteServer({
      port: parseInt(options.port),
      projectPath: process.cwd(),
      projectInfo
    });
  });

program
  .command('install-browsers')
  .description('Install Playwright browsers for this project')
  .action(async () => {
    const fs = require('fs');
    const path = require('path');
    const configPath = path.join(process.cwd(), 'raiken.config.json');
    
    if (!fs.existsSync(configPath)) {
      console.log(chalk.red('❌ Project not initialized!'));
      console.log(chalk.cyan('💡 Run "raiken init" first to set up the project'));
      process.exit(1);
    }
    
    const projectInfo = await detectProject(process.cwd());
    
    if (!projectInfo.hasPlaywright) {
      console.log(chalk.red('❌ Playwright not detected as a dependency'));
      console.log(chalk.cyan('💡 Install Playwright first: npm install -D @playwright/test'));
      process.exit(1);
    }
    
    console.log(chalk.blue('📦 Installing Playwright browsers...'));
    
    try {
      const { spawn } = require('child_process');
      
      const child = spawn('npx', ['playwright', 'install'], {
        cwd: process.cwd(),
        stdio: 'inherit'
      });

      child.on('close', (code: number) => {
        if (code === 0) {
          console.log(chalk.green('✓ Playwright browsers installed successfully'));
        } else {
          console.log(chalk.red('❌ Playwright browser installation failed'));
          process.exit(1);
        }
      });

      child.on('error', (error: Error) => {
        console.log(chalk.red(`❌ Error installing browsers: ${error.message}`));
        process.exit(1);
      });
    } catch (error) {
      console.log(chalk.red('❌ Could not install Playwright browsers'));
      process.exit(1);
    }
  });

program
  .command('info')
  .description('Show project information and configuration')
  .action(async () => {
    const projectInfo = await detectProject(process.cwd());
    
    console.log(chalk.blue('\n🎭 Raiken Project Information\n'));
    console.log(`${chalk.bold('Project Name:')} ${projectInfo.name}`);
    console.log(`${chalk.bold('Project Type:')} ${projectInfo.type}`);
    console.log(`${chalk.bold('Test Directory:')} ${projectInfo.testDir}`);
    console.log(`${chalk.bold('Package Manager:')} ${projectInfo.packageManager}`);
    
    if (projectInfo.hasPlaywright) {
      console.log(`${chalk.green('✓')} Playwright is configured`);
    } else {
      console.log(`${chalk.yellow('⚠')} Playwright not found - install with: npm install -D @playwright/test`);
    }
  });

program.parseAsync(process.argv).then(() => {
  if (process.argv.length === 2) {
    checkInstallation();
  }
}).catch(err => {
  console.error(chalk.red('❌ Command failed:'), err.message);
  process.exit(1);
});

// Handle errors gracefully
process.on('uncaughtException', (error) => {
  console.error(chalk.red('Unexpected error:'), error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error(chalk.red('Unhandled promise rejection:'), reason);
  process.exit(1);
}); 