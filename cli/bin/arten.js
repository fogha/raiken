#!/usr/bin/env node

const path = require('path');
const { spawn } = require('child_process');

// Get the directory where this script is located (CLI renamed to `raiken`)
const scriptDir = path.dirname(__filename);
const cliMainPath = path.join(scriptDir, '..', 'dist', 'index.js');

// Check if the compiled JS exists, if not, try to run from source (entry still `bin/arten.js`)
const fs = require('fs');
let entryPoint = cliMainPath;

if (!fs.existsSync(cliMainPath)) {
  // Fallback to running TypeScript directly in development
  const tsNode = path.join(scriptDir, '..', 'node_modules', '.bin', 'ts-node');
  const srcPath = path.join(scriptDir, '..', 'src', 'index.ts');
  
  if (fs.existsSync(tsNode) && fs.existsSync(srcPath)) {
    // Run with ts-node for development
    const child = spawn('node', [tsNode, srcPath, ...process.argv.slice(2)], {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    child.on('exit', (code) => {
      process.exit(code || 0);
    });
    return;
  }
  
  console.error('Arten CLI not built. Please run "npm run build" in the CLI directory.');
  process.exit(1);
}

// Run the compiled CLI
require(entryPoint); 