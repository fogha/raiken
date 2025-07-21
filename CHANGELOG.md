# Changelog

All notable changes to Arten will be documented in this file.

## [Unreleased] - 2024-12-XX

### 🎯 Enhanced Error Handling & UI Resilience
- **Improved error notifications**: Moved error toasts to top-right corner to avoid interfering with main workflow
- **Always-accessible test builder**: Ensured right panel with test generation remains visible even during browser errors
- **Enhanced error messaging**: Added context-aware messages explaining what functionality remains available during errors
- **Better visual hierarchy**: Improved styling of right panel to make it more prominent and discoverable

### 🚀 Advanced Test Generation & Management
- **JSON-based test specifications**: Implemented structured approach to test definition with real-time validation
- **Enhanced AI integration**: Improved test generation using OpenAI API with better error handling
- **Multi-tab test editor**: Integrated Monaco editor with syntax highlighting and TypeScript support
- **Automatic test saving**: Tests are automatically saved to `generated-tests/` directory with timestamps
- **Test execution improvements**: Added configurable browser settings, retries, and timeout options

### 🔧 Browser Integration & DOM Handling
- **Real-time DOM extraction**: Improved DOM tree extraction with better error handling and user feedback
- **Enhanced element selection**: Visual element selection with click-to-select functionality
- **Multi-browser support**: Robust support for Chromium, Firefox, and WebKit with proper lifecycle management
- **Iframe-based preview**: Secure browser preview with sandbox restrictions for safe page interaction
- **URL validation**: Enhanced URL handling with validation and comprehensive error reporting

### 📊 Test Execution & Reporting
- **Configurable test execution**: Support for browser type selection, retry counts, and timeout settings
- **Enhanced test reports**: Detailed test results with error diagnostics, screenshots, and execution metrics
- **Test recording features**: Support for screenshots, video recording, and trace capture
- **Real-time status tracking**: Comprehensive status system with visual indicators and progress feedback

### 🏗️ Architecture & Infrastructure
- **Improved state management**: Enhanced Zustand stores for better state isolation and synchronization
- **API endpoint improvements**: Robust API endpoints for test generation, execution, and file management
- **Configuration management**: Persistent user configuration with localStorage integration
- **Type safety**: Comprehensive TypeScript definitions and type safety improvements

### 🐛 Bug Fixes
- **Layout stability**: Fixed resizable panel issues that could hide the right panel during errors
- **Error propagation**: Improved error handling to prevent cascading failures
- **Browser cleanup**: Better browser lifecycle management with proper cleanup on component unmount
- **State synchronization**: Fixed issues with state synchronization between components

### 🔄 Code Quality & Maintenance
- **Component structure**: Improved component organization and separation of concerns
- **Error boundaries**: Better error handling and graceful degradation
- **Performance optimizations**: Reduced unnecessary re-renders and improved component efficiency
- **Documentation**: Enhanced inline documentation and component prop definitions

### ✨ New Features
- **Video Recording Support**: Added full video recording capabilities for test execution
  - Videos now record for all tests (passing and failing)
  - Clickable video files in test reports with direct file access
  - Configurable through Settings → Playwright → Video Recording toggle
  - Videos saved to `test-results/temp-execution/` with clear file paths

- **Enhanced Test Reports Display**: Improved test results visualization
  - Raw Playwright output now displayed for ALL tests (success and failure)
  - Clickable screenshot attachments with direct file access  
  - Better visual distinction between successful and failed tests
  - Cleaner error message extraction from Playwright output
  - Collapsible detailed views for better organization

### 📁 File Organization
- Test videos: `test-results/temp-execution/`
- Test screenshots: `test-results/temp-execution/`
- Test reports: `test-results/report-*.json`
- Generated tests: `generated-tests/*.spec.ts`

## Previous Releases

### [0.1.0] - Initial Release
- Basic test generation functionality
- Simple browser integration
- Initial UI layout and components
- Core state management implementation

---

**Note**: This changelog follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format and uses [Semantic Versioning](https://semver.org/). 