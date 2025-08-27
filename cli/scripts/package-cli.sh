#!/bin/bash

# Package and test the Arten CLI for distribution

set -e

echo "📦 Packaging Arten CLI for distribution..."

# Get current directory
CLI_DIR="$(cd "$(dirname "${0}")/.." && pwd)"
cd "$CLI_DIR"

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist/
rm -rf *.tgz

# Install dependencies
echo "📥 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building TypeScript..."
npm run build

# Verify build output
if [ ! -d "dist" ]; then
  echo "❌ Build failed - dist directory not found"
  exit 1
fi

echo "✅ Build completed successfully"

# Create package tarball with versioned name
echo "📦 Creating package tarball..."
VERSION=$(node -p "require('./package.json').version")
ORIGINAL_TARBALL=$(npm pack)
TARBALL="arten-cli-v${VERSION}.tgz"
mv "$ORIGINAL_TARBALL" "$TARBALL"
echo "📋 Created package: $TARBALL"

# Get the created tarball name
TARBALL=$(ls *.tgz | head -n 1)
echo "📋 Created package: $TARBALL"

# Test installation in a temporary directory
echo "🧪 Testing package installation..."
TEST_DIR="/tmp/arten-cli-install-test-$(date +%s)"
mkdir -p "$TEST_DIR"
cp "$CLI_DIR/$TARBALL" "$TEST_DIR/"
cd "$TEST_DIR"

# Extract and test the package
tar -xzf "$TARBALL"

# Move into the package directory
PACKAGE_DIR=$(ls -d package 2>/dev/null || ls -d arten-cli-* 2>/dev/null || echo ".")
cd "$PACKAGE_DIR"

# Test that all required files are present
echo "🔍 Verifying package contents..."
required_files=("package.json" "bin/arten.js" "dist/index.js")
for file in "${required_files[@]}"; do
  if [ ! -f "$file" ]; then
    echo "❌ Missing required file: $file"
    exit 1
  fi
done

# Test that the binary is executable
if [ ! -x "bin/arten.js" ]; then
  echo "❌ Binary is not executable: bin/arten.js"
  exit 1
fi

# Test basic CLI functionality
echo "🧪 Testing CLI functionality..."
node bin/arten.js --help > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "✅ CLI help command works"
else
  echo "❌ CLI help command failed"
  exit 1
fi

# Test version command
node bin/arten.js --version > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "✅ CLI version command works"
else
  echo "❌ CLI version command failed"
  exit 1
fi

# Cleanup test directory
cd "$CLI_DIR"
rm -rf "$TEST_DIR"

echo ""
echo "🎉 Package testing completed successfully!"
echo ""
echo "📦 Package ready for distribution:"
echo "   File: $TARBALL"
echo "   Size: $(du -h "$TARBALL" | cut -f1)"
echo ""
echo "🚀 To publish to npm:"
echo "   npm publish $TARBALL"
echo ""
echo "🧪 To test locally:"
echo "   npm install -g ./$TARBALL"
echo "   arten --help"
echo ""
echo "📋 Next steps:"
echo "   1. Test the package on different systems"
echo "   2. Update version in package.json if needed"
echo "   3. Create GitHub release"
echo "   4. Publish to npm registry" 