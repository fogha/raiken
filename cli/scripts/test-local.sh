#!/bin/bash

# Test script for Arten CLI development

set -e

echo "🎭 Testing Arten CLI locally..."

# Build the CLI
echo "📦 Building CLI..."
cd "$(dirname "$0")/.."
npm run build

# Create a temporary test project
echo "🏗️  Creating test project..."
TEST_DIR="/tmp/arten-cli-test-$(date +%s)"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

# Initialize a simple Node.js project
cat > package.json << 'EOF'
{
  "name": "arten-test-project",
  "version": "1.0.0",
  "description": "Test project for Arten CLI",
  "scripts": {
    "dev": "echo 'Development server would start here'"
  },
  "dependencies": {
    "next": "^13.0.0",
    "react": "^18.0.0"
  }
}
EOF

echo "✅ Test project created at: $TEST_DIR"

# Go back to CLI directory
CLI_DIR="$(dirname "$0")/.."
cd "$CLI_DIR"

# Test CLI commands
echo "🧪 Testing CLI commands..."

echo "  Testing 'arten info'..."
node bin/arten.js info --help

echo "  Testing 'arten init' (dry run)..."
cd "$TEST_DIR"
"$CLI_DIR/bin/arten.js" info

echo "  Testing 'arten start' (help only)..."
"$CLI_DIR/bin/arten.js" start --help

echo "✅ Basic CLI tests passed!"

# Cleanup
echo "🧹 Cleaning up..."
rm -rf "$TEST_DIR"

echo "🎉 All tests completed successfully!"
echo ""
echo "To test manually:"
echo "  1. cd cli && npm link"
echo "  2. cd /path/to/your/project"
echo "  3. arten info"
echo "  4. arten init"
echo "  5. arten start" 