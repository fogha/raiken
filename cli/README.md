# Arten CLI

AI-powered Playwright test generator that integrates directly with your local development environment.

## Installation

```bash
# Install globally
npm install -g @arten/cli

# Or use with npx (no installation required)
npx @arten/cli@latest start
```

## Quick Start

1. Navigate to your project directory:
```bash
cd my-nextjs-app
```

2. Initialize Arten (optional - sets up Playwright config and test directory):
```bash
arten init
```

3. Start the Arten web interface:
```bash
arten start
```

This will:
- Auto-detect your project type (Next.js, React, Vue, etc.)
- Start a local server at `http://localhost:3456`
- Open your browser to the Arten interface
- Write generated tests directly to your project's test directory

## Commands

### `arten start`
Start the Arten web interface for the current project.

Options:
- `-p, --port <port>` - Port to run the server on (default: 3456)
- `--no-open` - Don't open browser automatically

```bash
arten start --port 4000 --no-open
```

### `arten init`
Initialize Arten in the current project. This will:
- Create a test directory (e.g., `e2e/`, `tests/`)
- Set up Playwright configuration
- Add npm scripts for testing
- Create an example test file

Options:
- `--force` - Overwrite existing configuration

```bash
arten init --force
```

### `arten info`
Display information about the current project:

```bash
arten info
```

Output example:
```
🎭 Arten Project Information

Project Name: my-nextjs-app
Project Type: nextjs
Test Directory: e2e
Package Manager: npm
✓ Playwright is configured
Test Command: npm run test:e2e
```

## Project Detection

Arten automatically detects your project type and configures itself accordingly:

| Project Type | Detection | Default Test Dir | Default Port |
|--------------|-----------|------------------|--------------|
| Next.js      | `next` dependency | `e2e` | 3000 |
| React        | `react` dependency | `tests` | 3000 |
| Vue          | `vue` dependency | `tests` | 3000 |
| Svelte       | `svelte` dependency | `tests` | 5173 |
| Angular      | `@angular/core` | `e2e` | 4200 |
| Nuxt         | `nuxt` dependency | `test` | 3000 |
| Vite         | `vite` dependency | `tests` | 5173 |
| Generic      | Fallback | `tests` | 3000 |

## Configuration

Arten creates a `arten.config.json` file in your project root:

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

## Environment Variables

Create a `.env.local` file in your project root:

```env
# Required for AI test generation
OPENROUTER_API_KEY=your_openrouter_api_key

# Optional: Custom AI model
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
```

## Generated Files

Arten creates files directly in your project:

```
my-project/
├── e2e/                     # Test directory
│   ├── example.spec.ts      # Example test (created by init)
│   └── homepage.spec.ts     # Generated tests
├── playwright.config.ts     # Playwright configuration
├── arten.config.json        # Arten configuration
└── package.json            # Updated with test scripts
```

## Package.json Scripts

Arten adds these scripts to your `package.json`:

```json
{
  "scripts": {
    "arten": "arten start",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug"
  }
}
```

## Integration Examples

### Next.js Project
```bash
cd my-nextjs-app
arten init  # Creates e2e/ directory and config
arten start # Open web interface
# Generate tests for your Next.js pages
npm run test:e2e  # Run generated tests
```

### React App
```bash
cd my-react-app
arten init  # Creates tests/ directory
# Arten auto-detects React and configures accordingly
arten start
```

### Existing Playwright Setup
```bash
cd my-app-with-playwright
arten start  # Uses existing configuration
# Arten integrates with your existing setup
```

## Features

- **🔍 Project Auto-Detection** - Automatically detects your framework and configures appropriately
- **📁 Smart File Placement** - Creates tests in the right directory structure for your project
- **🎨 Local File System Integration** - Writes tests directly to your project, no cloud storage needed
- **🤖 AI-Powered Generation** - Uses advanced AI models to generate high-quality Playwright tests
- **🎭 Playwright Integration** - Full Playwright feature support (video, screenshots, tracing)
- **📦 Package Manager Aware** - Works with npm, yarn, pnpm, and bun
- **🔧 Zero Configuration** - Works out of the box, but fully customizable

## Troubleshooting

### Port Already in Use
```bash
arten start --port 4000
```

### Playwright Not Installed
```bash
npm install -D @playwright/test
npx playwright install
```

### Permission Errors
Make sure Arten has write permissions to your project directory:
```bash
chmod -R 755 my-project/
```

### AI Generation Not Working
1. Check your `OPENROUTER_API_KEY` in `.env.local`
2. Verify internet connection
3. Check API key permissions

## Development

To contribute to Arten CLI:

```bash
git clone https://github.com/yourusername/arten.git
cd arten/cli
npm install
npm run build
npm link  # Use local version globally
```

## License

MIT - see LICENSE file for details. 