#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get command line arguments
const testFile = process.argv[2];
const browserType = process.argv[3] || 'chromium'; // Default to chromium
const retries = process.argv[4] || '0'; // Default to 0 retries
const timeout = process.argv[5] || '30000'; // Default to 30 seconds
const features = process.argv[6] || '{}'; // Default to empty features object

if (!testFile) {
  console.error('Usage: node scripts/run-test.js <test-file-path> [browser] [retries] [timeout] [features]');
  console.error('Example: node scripts/run-test.js generated-tests/my-test.spec.ts chromium 2 30000 \'{"screenshots":true}\'');
  console.error('Browser options: chromium (default), firefox, webkit');
  console.error('Retries: 0 (default), 1, 2, 3, etc.');
  console.error('Timeout: 30000 (default), time in milliseconds');
  console.error('Features: JSON object with screenshot, video, tracing options');
  process.exit(1);
}

// Validate browser type
const validBrowsers = ['chromium', 'firefox', 'webkit'];
if (!validBrowsers.includes(browserType)) {
  console.error(`❌ Invalid browser type: ${browserType}`);
  console.error(`Valid options: ${validBrowsers.join(', ')}`);
  process.exit(1);
}

// Validate retries
const retriesNum = parseInt(retries, 10);
if (isNaN(retriesNum) || retriesNum < 0) {
  console.error(`❌ Invalid retries count: ${retries}`);
  console.error('Retries must be a non-negative integer (0, 1, 2, etc.)');
  process.exit(1);
}

// Validate timeout
const timeoutNum = parseInt(timeout, 10);
if (isNaN(timeoutNum) || timeoutNum < 1000) {
  console.error(`❌ Invalid timeout: ${timeout}`);
  console.error('Timeout must be at least 1000ms (1 second)');
  process.exit(1);
}

// Validate and parse features
let featuresObj = {};
try {
  featuresObj = JSON.parse(features);
} catch (e) {
  console.error(`❌ Invalid features JSON: ${features}`);
  console.error('Features must be a valid JSON object');
  process.exit(1);
}

// Resolve full path
const fullTestPath = path.resolve(process.cwd(), testFile);

if (!fs.existsSync(fullTestPath)) {
  console.error(`Test file not found: ${fullTestPath}`);
  process.exit(1);
}

console.log(`🧪 Running test: ${testFile}`);
console.log(`📁 Full path: ${fullTestPath}`);
console.log(`🌐 Browser: ${browserType}`);
console.log(`🔄 Retries: ${retriesNum}`);
console.log(`⏱️ Timeout: ${timeoutNum}ms`);
console.log(`🎯 Features: ${JSON.stringify(featuresObj)}`);

// Create test-results directory
const resultsDir = path.join(process.cwd(), 'test-results');
if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir, { recursive: true });
  console.log(`📂 Created results directory: ${resultsDir}`);
}

// Build command
const relativePath = path.relative(process.cwd(), fullTestPath);
let command = `npx playwright test "${relativePath}" --reporter=list --project=${browserType} --retries=${retriesNum} --timeout=${timeoutNum}`;

// Add trace flag if enabled (screenshots and video are configured via playwright.config.ts)
if (featuresObj.tracing) {
  command += ' --trace=on-first-retry';
}

console.log(`🚀 Executing: ${command}`);
console.log('───────────────────────────────────────');

// Execute test
const child = exec(command, {
  cwd: process.cwd(),
  env: {
    ...process.env,
    CI: 'true'
  }
}, (error, stdout, stderr) => {
  console.log('───────────────────────────────────────');
  
  if (error) {
    console.error(`❌ Test execution failed:`);
    console.error(`Exit code: ${error.code}`);
    if (stderr) {
      console.error(`Stderr: ${stderr}`);
    }
    if (stdout) {
      console.log(`Stdout: ${stdout}`);
    }
    process.exit(error.code || 1);
  } else {
    console.log(`✅ Test completed successfully!`);
    if (stdout) {
      console.log(stdout);
    }
    
    // Check for results file
    const resultsFile = path.join(resultsDir, 'results.json');
    if (fs.existsSync(resultsFile)) {
      console.log(`📋 Results saved to: ${resultsFile}`);
    }
    
    process.exit(0);
  }
});

// Pipe output in real-time
child.stdout.on('data', (data) => {
  process.stdout.write(data);
});

child.stderr.on('data', (data) => {
  process.stderr.write(data);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Test execution interrupted');
  child.kill('SIGINT');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Test execution terminated');
  child.kill('SIGTERM');  
  process.exit(1);
}); 