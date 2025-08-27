# Arten - Complete Documentation

Arten is a modern AI-powered test automation tool that combines artificial intelligence with Playwright for automated testing. It provides a visual interface for creating, managing, and executing tests with real-time status tracking, enhanced error handling, and comprehensive test management capabilities.

## 📚 Table of Contents

1. [Getting Started](#getting-started)
2. [Architecture Overview](#architecture-overview)
3. [Core Features](#core-features)
4. [CLI Tool](#cli-tool)
5. [Web Application](#web-application)
6. [Configuration](#configuration)
7. [API Reference](#api-reference)
8. [Advanced Features](#advanced-features)
9. [Troubleshooting](#troubleshooting)
10. [Contributing](#contributing)

---

## Getting Started

### Prerequisites

- **Node.js 18+** - Modern JavaScript runtime
- **npm/yarn/pnpm** - Package manager
- **Modern web browser** - Chrome, Firefox, or Safari
- **OpenRouter API key** - For AI-powered test generation

### Quick Start Options

#### Option 1: CLI Tool (Recommended)
```bash
# Install globally
npm install -g @arten/cli

# Navigate to your project
cd my-nextjs-app

# Initialize (optional)
arten init

# Start Arten
arten start
```

#### Option 2: Standalone Web Application
```bash
# Clone repository
git clone https://github.com/your-username/arten.git
cd arten

# Install dependencies
npm install

# Set up environment
echo "OPENROUTER_API_KEY=your_api_key_here" > .env.local

# Start development server
npm run dev
```

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Arten Architecture                       │
├─────────────────────────────────────────────────────────────┤
│  Web UI (Next.js)          │  CLI Bridge Server             │
│  ├── Test Builder          │  ├── Project Detection         │
│  ├── Browser Integration   │  ├── File System Access        │
│  ├── Test Editor          │  └── Local Test Management     │
│  └── Test Reports         │                                 │
├─────────────────────────────────────────────────────────────┤
│               AI Services (OpenRouter)                      │
│               Playwright (Browser Automation)               │
└─────────────────────────────────────────────────────────────┘
```

### Core Modules

```
src/
├── core/                    # Core functionality
│   ├── browser/             # Browser automation & UI
│   ├── testing/             # Test generation & execution
│   └── dom/                 # DOM analysis & manipulation
├── components/              # React components
│   ├── ui/                  # Reusable UI components
│   └── layout/              # Layout components
├── store/                   # State management (Zustand)
├── app/api/                 # Next.js API routes
└── types/                   # TypeScript definitions
```

---

## Core Features

### 1. 🤖 AI-Powered Test Generation

**JSON-Based Test Specification**
```json
{
  "name": "Login Test",
  "description": "Test user login functionality",
  "url": "https://example.com/login",
  "steps": [
    { "action": "fill", "selector": "#email", "value": "user@example.com" },
    { "action": "fill", "selector": "#password", "value": "password123" },
    { "action": "click", "selector": "#login-button" },
    { "action": "assert", "selector": "#dashboard", "assertion": "exists" }
  ]
}
```

**Features:**
- Real-time JSON validation
- AI-powered generation from natural language descriptions
- Support for complex user flows
- Template system for common patterns

### 2. 🌐 Browser Integration

**Multi-Browser Support:**
- **Chromium** - Default, most stable
- **Firefox** - Alternative engine testing
- **WebKit** - Safari compatibility

**Browser Features:**
- Real-time DOM extraction and visualization
- Element selection (click-to-select)
- Iframe-based preview for safety
- URL validation and error handling
- Screenshot and video recording

### 3. 📝 Advanced Test Editor

**Monaco Editor Integration:**
- TypeScript syntax highlighting
- Auto-completion and IntelliSense
- Real-time error detection
- Multi-tab editing with state persistence

**Test Management:**
- Automatic file saving to project directories
- Support for multiple test formats
- Tab-based workflow
- Integration with local file system (via CLI)

### 4. 📊 Test Execution & Reporting

**Execution Features:**
- Configurable browser settings
- Retry mechanisms
- Timeout configuration
- Parallel test execution
- Real-time progress tracking

**Reporting Capabilities:**
- Detailed test results with step-by-step breakdown
- Screenshot capture on failures
- Video recording of test execution
- AI-powered failure analysis
- Export options (JSON, HTML)

### 5. 🔄 State Management

**Zustand Store Architecture:**
```typescript
// Browser state
const useBrowserStore = () => ({
  url: string | null,
  isLoading: boolean,
  isLaunched: boolean,
  viewport: { width: number, height: number },
  // ... actions
});

// Test state
const useTestStore = () => ({
  testScripts: string[],
  generatedTests: string[],
  isGenerating: boolean,
  runningTests: Record<string, boolean>,
  // ... actions
});

// Notification state
const useNotificationStore = () => ({
  notifications: Notification[],
  addNotification: (notification: Notification) => void,
  removeNotification: (id: string) => void,
  // ... actions
});
```

### 6. 🔔 Global Notification System

**Features:**
- Non-intrusive floating notifications
- Multiple notification types (success, error, warning, info)
- Auto-hide functionality (configurable duration)
- Manual dismissal
- Queue management for multiple notifications

**Usage:**
```typescript
const { addNotification } = useNotificationStore();

addNotification({
  type: 'success',
  title: 'Test Generated',
  message: 'Test script created successfully',
  duration: 5000,
});
```

---

## CLI Tool

### Commands

#### `arten start`
Start the Arten web interface for the current project.

**Options:**
- `-p, --port <port>` - Custom port (default: 3460)
- `--no-open` - Don't open browser automatically

**Example:**
```bash
arten start --port 4000 --no-open
```

#### `arten init`
Initialize Arten in the current project.

**What it does:**
- Creates test directory (`e2e/`, `tests/`, etc.)
- Sets up Playwright configuration
- Adds npm scripts for testing
- Creates example test file

**Options:**
- `--force` - Overwrite existing configuration

#### `arten info`
Display current project information.

**Sample Output:**
```
🎭 Arten Project Information

Project Name: my-nextjs-app
Project Type: nextjs
Test Directory: e2e
Package Manager: npm
✓ Playwright is configured
Test Command: npm run test:e2e
Bridge Server: Running on port 3460
```

#### `arten remote`
Start bridge server for hosted Arten platform integration.

**Options:**
- `-p, --port <port>` - Port for bridge server (default: 3460)

### Project Auto-Detection

| Framework | Detection | Test Directory | Default Port |
|-----------|-----------|----------------|--------------|
| Next.js | `next` dependency | `e2e` | 3000 |
| React | `react` dependency | `tests` | 3000 |
| Vue | `vue` dependency | `tests` | 3000 |
| Svelte | `svelte` dependency | `tests` | 5173 |
| Angular | `@angular/core` | `e2e` | 4200 |
| Nuxt | `nuxt` dependency | `test` | 3000 |
| Vite | `vite` dependency | `tests` | 5173 |
| Generic | Fallback | `tests` | 3000 |

### Bridge Server Integration

The CLI includes a bridge server that enables the hosted Arten platform to save tests directly to your local project:

**Features:**
- Secure token-based authentication
- Project information API (`/api/project-info`)
- Test saving API (`/api/save-test`)
- File management API (`/api/test-files`)
- Health check endpoint (`/api/health`)

**Security:**
- Dynamic token generation for each session
- Local network only (no external access)
- File system access limited to project directory

---

## Web Application

### User Interface

#### Main Layout
```
┌─────────────────────────────────────────────────────────┐
│ Top Bar (Theme, Settings, Status)                      │
├─────────────────┬───────────────────┬───────────────────┤
│                 │                   │                   │
│   DOM Tree      │   Browser View    │   Test Builder    │
│   (Sidebar)     │   (Center Panel)  │   (Right Panel)   │
│                 │                   │                   │
│   - Element     │   - URL Input     │   - JSON Editor   │
│     Selection   │   - Iframe        │   - AI Generate   │
│   - Tree View   │   - Screenshots   │   - Test Tabs     │
│                 │   - Status        │   - Execute       │
│                 │                   │                   │
├─────────────────┴───────────────────┴───────────────────┤
│ Notification Container (Bottom Right)                   │
└─────────────────────────────────────────────────────────┘
```

#### Test Builder Interface

**JSON Test Editor:**
- Syntax highlighting and validation
- Real-time error checking
- Auto-completion for test actions
- Template insertion

**AI Generation:**
- Natural language input
- Context-aware generation
- DOM-informed test creation
- Multiple generation strategies

#### Browser Integration

**URL Navigation:**
- Input validation
- Loading states
- Error handling
- History management

**DOM Inspection:**
- Collapsible tree view
- Element highlighting
- Property inspection
- XPath/CSS selector generation

### Tabbed Interface

#### Test Editor Tabs
- Multiple test files open simultaneously
- Individual execution controls
- Save status indicators
- Close/rename functionality

#### Browser Tabs
- **Web Page View** - Live browser preview
- **Test Editor** - Code editing interface
- **Test Manager** - File management
- **Test Reports** - Execution results

---

## Configuration

### Environment Variables

#### Required
```env
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxx
```

#### Optional
```env
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
BASE_URL=http://localhost:3000
NODE_ENV=development
```

### Application Configuration

#### Global Settings
```typescript
interface GlobalConfig {
  headless: boolean;          // Default: false (visible browser)
  browserType: 'chromium' | 'firefox' | 'webkit';
  timeout: number;            // Default: 30000ms
  retries: number;            // Default: 1
  screenshots: boolean;       // Default: true
  video: boolean;            // Default: true
  tracing: boolean;          // Default: false
}
```

#### Arten Configuration File
```json
{
  "projectType": "nextjs",
  "testDirectory": "e2e",
  "playwrightConfig": "playwright.config.ts",
  "outputFormats": ["typescript"],
  "ai": {
    "provider": "openrouter",
    "model": "anthropic/claude-3.5-sonnet"
  },
  "features": {
    "video": true,
    "screenshots": true,
    "tracing": false,
    "network": true
  },
  "browser": {
    "defaultBrowser": "chromium",
    "headless": true,
    "timeout": 30000,
    "retries": 1
  }
}
```

---

## API Reference

### Test Generation

#### POST `/api/generate-test`
Generate AI-powered test scripts.

**Request:**
```json
{
  "prompt": "Test login functionality",
  "url": "https://example.com",
  "domTree": { /* DOM context */ },
  "requirements": ["Login with valid credentials", "Handle errors"]
}
```

**Response:**
```json
{
  "success": true,
  "code": "// Generated Playwright test code",
  "metadata": {
    "model": "anthropic/claude-3.5-sonnet",
    "confidence": 0.95,
    "executionTime": 1247
  }
}
```

### Test Execution

#### POST `/api/execute-test`
Execute test scripts with configurable options.

**Request:**
```json
{
  "testScript": "// Playwright test code",
  "config": {
    "browserType": "chromium",
    "headless": false,
    "timeout": 30000,
    "retries": 2
  },
  "suiteId": "custom-suite-id"
}
```

**Response:**
```json
{
  "success": true,
  "results": {
    "passed": 3,
    "failed": 1,
    "duration": 12400,
    "screenshots": ["path/to/screenshot.png"],
    "videos": ["path/to/video.webm"]
  },
  "reportId": "report-123456"
}
```

### Browser Control

#### POST `/api/browser`
Control browser instance and extract DOM information.

**Available Actions:**
- `initialize` - Launch browser
- `navigate` - Navigate to URL
- `extractDOM` - Get DOM tree
- `screenshot` - Take screenshot
- `close` - Close browser

### File Management

#### GET `/api/test-files`
List available test files.

#### POST `/api/save-test`
Save test script to file system.

#### DELETE `/api/delete-test`
Delete test file.

### Reports

#### GET `/api/test-reports`
Retrieve test execution reports.

#### GET `/api/test-reports/:id`
Get specific report by ID.

---

## Advanced Features

### Test Suite Management

**Creating Test Suites:**
```typescript
const suite = {
  name: "E2E Login Flow",
  description: "Complete login and dashboard tests",
  browserType: "chromium",
  headless: false,
  retries: 2,
  timeout: 45000,
  features: {
    screenshots: true,
    video: true,
    tracing: false
  }
};
```

**Execution Options:**
- Parallel execution
- Browser selection per suite
- Custom timeout and retry settings
- Recording features (video, screenshots, tracing)

### AI-Powered Features

#### Test Generation Strategies
1. **Natural Language** - Describe what you want to test
2. **DOM-Informed** - Uses current page structure
3. **Template-Based** - Common testing patterns
4. **Flow-Based** - Multi-step user journeys

#### Failure Analysis
- AI-powered error diagnosis
- Suggested fixes for common issues
- Pattern recognition for flaky tests
- Performance bottleneck identification

### Browser Automation

#### Advanced Selectors
```typescript
// CSS Selectors
{ "selector": ".login-form input[type='email']" }

// XPath
{ "selector": "//button[contains(text(), 'Submit')]" }

// Text-based
{ "selector": "text=Login" }

// Data attributes
{ "selector": "[data-testid='submit-button']" }
```

#### Complex Actions
```typescript
// File uploads
{ "action": "upload", "selector": "#file-input", "files": ["test.pdf"] }

// Drag and drop
{ "action": "dragAndDrop", "source": "#item1", "target": "#dropzone" }

// Keyboard shortcuts
{ "action": "keyboard", "keys": "Control+A" }

// Mobile gestures
{ "action": "swipe", "direction": "up", "distance": 100 }
```

### Local File System Integration

When using the CLI bridge server:

**Test File Management:**
- Direct file system access
- Project structure preservation
- Git integration friendly
- No cloud storage dependencies

**File Organization:**
```
my-project/
├── e2e/                     # Test directory
│   ├── auth/               # Organized by feature
│   │   ├── login.spec.ts
│   │   └── signup.spec.ts
│   └── dashboard/
│       └── navigation.spec.ts
├── test-results/           # Execution results
│   ├── videos/
│   ├── screenshots/
│   └── reports/
└── playwright.config.ts    # Playwright configuration
```

---

## Troubleshooting

### Common Issues

#### 1. Browser Launch Failures
**Symptoms:** Browser doesn't start, initialization errors

**Solutions:**
```bash
# Install Playwright browsers
npx playwright install

# Check system dependencies
npx playwright install-deps

# Use headless mode if display issues
# Set headless: true in configuration
```

#### 2. AI Generation Not Working
**Symptoms:** Empty responses, API errors

**Solutions:**
1. Check API key: `OPENROUTER_API_KEY` in `.env.local`
2. Verify internet connection
3. Check API usage limits
4. Try different AI model

#### 3. Port Conflicts
**Symptoms:** "Address already in use" errors

**Solutions:**
```bash
# Use different port
arten start --port 4000

# Check what's using the port
lsof -i :3460

# Kill conflicting process
pkill -f "arten.js remote"
```

#### 4. File Permission Errors
**Symptoms:** Cannot save tests, file access denied

**Solutions:**
```bash
# Fix directory permissions
chmod -R 755 my-project/

# Check disk space
df -h

# Verify write access
touch my-project/test-file && rm my-project/test-file
```

#### 5. Test Execution Failures
**Symptoms:** Tests fail unexpectedly, timeout errors

**Solutions:**
1. Increase timeout values
2. Add explicit waits for dynamic content
3. Use more specific selectors
4. Check for iframe contexts
5. Verify element visibility

### Debug Mode

#### Enable Debug Logging
```env
DEBUG=arten:*
NODE_ENV=development
```

#### Browser Debug Mode
```javascript
// In test configuration
{
  headless: false,
  slowMo: 1000,    // Slow down actions
  devtools: true   // Open browser devtools
}
```

#### Test Debug
```bash
# Run single test with debug
npx playwright test --debug login.spec.ts

# Generate trace
npx playwright test --trace on
```

### Error Recovery

#### Automatic Recovery Features
- Browser reconnection on network issues
- State restoration after component errors
- Graceful degradation when AI services are unavailable
- Fallback to local file saving when bridge is disconnected

#### Manual Recovery Steps
1. Refresh the browser page
2. Restart the bridge server
3. Clear browser cache and localStorage
4. Restart the Arten application

---

## Contributing

### Development Setup

```bash
# Clone repository
git clone https://github.com/your-username/arten.git
cd arten

# Install dependencies
npm install

# Install CLI dependencies
cd cli && npm install && cd ..

# Build CLI
cd cli && npm run build && cd ..

# Start development
npm run dev
```

### Project Structure

```
arten/
├── src/                    # Main application
├── cli/                    # CLI tool
├── examples/               # Example projects
├── e2e/                    # End-to-end tests
├── docs/                   # Documentation
└── scripts/                # Build and utility scripts
```

### Code Style

- **TypeScript** for type safety
- **ESLint** for code quality
- **Prettier** for formatting
- **Conventional Commits** for commit messages

### Testing

```bash
# Run unit tests
npm test

# Run E2E tests
npm run test:e2e

# Run linting
npm run lint

# Type checking
npm run type-check
```

### Release Process

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create pull request
4. Merge to main
5. Tag release
6. Publish to npm

---

## License

MIT License - See [LICENSE](LICENSE) file for details.

---

## Support

- 📧 **Email:** support@arten.dev
- 💬 **Discord:** https://discord.gg/arten
- 🐛 **Issues:** https://github.com/your-username/arten/issues
- 📖 **Docs:** https://docs.arten.dev

---

*Last updated: 2024-12-27* 