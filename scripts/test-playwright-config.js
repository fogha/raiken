#!/usr/bin/env node

/**
 * Test script to verify Playwright configuration generation and execution
 */

const { createPlaywrightConfig, validateConfig, cleanupConfig } = require('../src/utils/playwright-config.ts');
const fs = require('fs').promises;
const path = require('path');

async function testPlaywrightConfig() {
  console.log('🧪 Testing Playwright Configuration...\n');
  
  const testConfigs = [
    {
      name: 'Chromium with all features',
      features: { screenshots: true, video: true, tracing: true },
      browserType: 'chromium',
      timeout: 30000
    },
    {
      name: 'Firefox minimal',
      features: { screenshots: false, video: false, tracing: false },
      browserType: 'firefox',
      timeout: 15000
    },
    {
      name: 'WebKit with screenshots only',
      features: { screenshots: true, video: false, tracing: false },
      browserType: 'webkit',
      timeout: 45000
    }
  ];
  
  const results = [];
  
  for (const config of testConfigs) {
    console.log(`Testing: ${config.name}`);
    
    try {
      // Generate config
      const configPath = await createPlaywrightConfig(
        config.features,
        config.browserType,
        config.timeout
      );
      
      console.log(`  ✅ Config generated: ${path.basename(configPath)}`);
      
      // Validate config
      const isValid = await validateConfig(configPath);
      
      if (isValid) {
        console.log(`  ✅ Config validation passed`);
        
        // Read and display config content (first few lines)
        const content = await fs.readFile(configPath, 'utf8');
        const lines = content.split('\n').slice(0, 10);
        console.log(`  📄 Config preview:`);
        lines.forEach((line, i) => {
          if (line.trim()) console.log(`     ${i + 1}: ${line}`);
        });
        
        results.push({ config: config.name, status: 'PASS', configPath });
      } else {
        console.log(`  ❌ Config validation failed`);
        results.push({ config: config.name, status: 'FAIL - Invalid config', configPath });
      }
      
      // Clean up
      await cleanupConfig(configPath);
      console.log(`  🧹 Config cleaned up\n`);
      
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}\n`);
      results.push({ config: config.name, status: `FAIL - ${error.message}` });
    }
  }
  
  // Summary
  console.log('📊 Test Results Summary:');
  console.log('========================');
  results.forEach(result => {
    const status = result.status === 'PASS' ? '✅' : '❌';
    console.log(`${status} ${result.config}: ${result.status}`);
  });
  
  const passCount = results.filter(r => r.status === 'PASS').length;
  console.log(`\n🎯 ${passCount}/${results.length} tests passed`);
  
  if (passCount === results.length) {
    console.log('🎉 All Playwright configuration tests passed!');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Check the configuration.');
    process.exit(1);
  }
}

// Run the test
testPlaywrightConfig().catch(error => {
  console.error('💥 Test script failed:', error);
  process.exit(1);
});
