# Arten Project Structure

## Core Modules

```
src/core/
├── browser/                  # Browser automation functionality
│   ├── playwright.service.ts  # Playwright browser automation with highlight & test support
│   ├── ui/                    # Browser-related UI components
│   │   └── PlaywrightBrowser.tsx # DOM viewer & Test execution UI with webpage preview
│   └── index.ts              # Exports
│
├── dom/                      # DOM analysis functionality
│   ├── dom-analyzer.ts       # DOM tree extraction and analysis
│   └── index.ts              # Exports
│
├── testing/                  # Test generation and execution
│   ├── test-executor.ts      # Test running functionality
│   ├── test-generator.ts     # Test script generation
│   ├── ui/                   # Testing UI components
│   │   └── TestScriptEditor.tsx # Test script editing component
│   ├── openai.service.ts     # OpenAI integration for test generation
│   └── index.ts              # Exports
│
└── index.ts                  # Main exports
```

## UI Components

```
src/components/
├── layout/                   # Layout components
│   ├── ProjectViewer.tsx     # Main project container (imports PlaywrightBrowser from core)
│   ├── SideBar.tsx           # Sidebar navigation
│   ├── TopBar.tsx            # Top navigation
│   └── index.ts              # Exports
│
└── ui/                       # UI primitives (existing)
```

## API Routes

```
src/app/api/
├── browser/                 # Browser control API
│   └── route.ts             # Browser API endpoints for DOM extraction, navigation & testing
│
└── test/                    # Test execution API
    └── route.ts             # Test API endpoints
```

## Types

```
src/types/
├── dom.ts                  # DOM-related types for tree representation
├── test.ts                 # Test DSL types for JSON-based test scripts
├── flow.ts                 # Flow builder types
└── config.ts               # Configuration types
```

## Key Features

1. **DOM Extraction & Visualization**
   - Server-side DOM extraction via Playwright (headless mode)
   - DOM tree viewer with element highlighting
   - JSON view for detailed inspection

2. **Test Creation & Execution**
   - JSON-based test script editor with syntax validation
   - Support for navigation, clicks, typing, and waiting
   - Element assertions (visibility, content)
   - URL assertions
   - Detailed test results with step-by-step tracking

3. **Web Application Preview**
   - Live iframe preview of the target application
   - Synchronized with DOM extraction
   - Highlights selected elements for visual feedback

