# Arten Project Structure

## Core Modules

```
src/core/
├── browser/                  # Browser automation functionality
│   ├── playwright.service.ts  # Playwright browser automation with test support
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

## State Management

```
src/store/
├── browserStore.ts          # Browser state management
│   ├── Browser state        # URL, loading, launched status
│   ├── Test execution       # Test running state and results
│   ├── Browser settings     # Viewport, scale, mobile mode
│   └── System status        # Status tracking for all operations
│
├── projectStore.ts          # Project state management
│   ├── Project info         # Current project details
│   ├── Navigation           # URL and routing state
│   └── DOM state           # DOM tree and selected elements
│
├── testStore.ts            # Test state management
│   ├── Test scripts        # Current and saved test scripts
│   ├── Test results        # Execution results and history
│   └── Test settings       # Configuration and preferences
│
└── flowStore.ts           # Flow builder state
    ├── Flow definition    # Action nodes and connections
    ├── Editing state      # Selected nodes and edit mode
    └── Execution state    # Flow running status
```

## UI Components

```
src/components/
├── layout/                   # Layout components
│   ├── ProjectViewer.tsx     # Main project container with status bar
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
├── dom.ts                  # DOM-related types
│   ├── DOMNode            # DOM tree node representation
│   └── DOMAttributes      # Element attributes
│
├── test.ts                # Test-related types
│   ├── TestAction         # Test action types (click, type, assert, etc.)
│   ├── TestStep          # Individual test step structure
│   ├── TestCase          # Test case with steps
│   ├── TestSuite         # Collection of test cases
│   ├── TestScriptConfig  # Test configuration (headless, browser)
│   ├── TestResult        # Test execution results
│   ├── TestTab           # Test editor tab data
│   └── Component Props   # UI component prop types
│
├── flow.ts                # Flow builder types
│   ├── FlowNode          # Action node definitions
│   ├── FlowEdge          # Node connections
│   └── FlowConfig        # Flow execution settings
│
├── status.ts             # System status types
│   ├── StatusState       # Status tracking
│   ├── StatusLevel       # Status severity levels
│   └── StatusMessage     # Status message format
│
└── config.ts             # Configuration types
    ├── AppConfig         # Application settings
    ├── APIConfig         # API configuration
    └── BrowserConfig     # Browser settings
```

## Key Features

1. **State Management & Status Tracking**
   - Centralized state using Zustand stores
   - Real-time status updates with color coding
   - Comprehensive system action tracking
   - Persistent state across components

2. **DOM Extraction & Visualization**
   - Server-side DOM extraction via Playwright (headless mode)
   - DOM tree viewer for element selection
   - JSON view for detailed inspection
   - Real-time DOM updates

3. **Test Creation & Execution**
   - JSON-based test script editor with syntax validation
   - Support for navigation, clicks, typing, and waiting
   - Element assertions (visibility, content)
   - URL assertions
   - Detailed test results with step-by-step tracking

4. **Web Application Preview**
   - Live iframe preview of the target application
   - Synchronized with DOM extraction
   - Element selection for testing
   - Status-aware loading states

## State Flow

1. **Browser Operations**
   ```
   Action -> Status Update -> State Change -> UI Update
   ```
   Example: Loading URL
   - Set loading state
   - Update status (NAVIGATING)
   - Navigate to URL
   - Update DOM tree
   - Update status (SUCCESS/ERROR)

2. **Test Operations**
   ```
   Action -> Status Update -> Test Execution -> Results -> State Update
   ```
   Example: Running Test
   - Set test running state
   - Update status (RUNNING_TEST)
   - Execute test
   - Collect results
   - Update status (PASSED/FAILED)

3. **DOM Operations**
   ```
   Action -> Status Update -> DOM Update -> State Change -> UI Refresh
   ```
   Example: Selecting Element
   - Update status (ELEMENT_SELECTED)
   - Update selected node
   - Update UI components

