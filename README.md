# Arten - AI-Powered Test Automation Tool

Arten is a modern web application testing tool that combines AI with Playwright for automated testing. It provides a visual interface for creating, managing, and executing tests across multiple browsers, with real-time status tracking and tab-based test management.

## Prerequisites

- Node.js 18+
- npm or yarn
- Modern web browser (Chrome, Firefox, or Safari)
- OpenAI API key for AI features

## Setup

1. Clone the repository:
```bash
git clone https://github.com/your-username/arten.git
cd arten
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file:
```env
OPENAI_API_KEY=your_api_key_here
```

4. Start the development server:
```bash
npm run dev
```

## Core Features

### 1. Multi-Browser Testing
- Support for Chromium, Firefox, and WebKit
- Headless and headed mode options
- Browser lifecycle management
- Secure sandbox environment

### 2. Visual Test Builder
- Interactive DOM tree explorer
- Element selection and inspection
- AI-powered test generation
- Real-time test script editing
- Tab-based test management

### 3. Test Execution
- Individual test execution
- Real-time test results
- Per-tab test configuration
- Detailed error reporting
- Automatic browser cleanup

### 4. State Management
- Centralized state using Zustand
- Per-tab state isolation
- Real-time status updates
- Comprehensive error handling
- Browser and test synchronization

### 5. Project Structure
```
src/
├── core/
│   ├── browser/         # Browser management
│   │   ├── ui/         # Browser UI components
│   │   └── services/   # Browser control logic
│   ├── testing/        # Test management
│   │   ├── ui/        # Test UI components
│   │   └── utils/     # Test utilities
│   └── dom/           # DOM manipulation
├── components/
│   ├── ui/            # Shared UI components
│   └── layout/        # Layout components
├── store/
│   ├── browserStore.ts # Browser state
│   ├── testStore.ts   # Test state
│   └── projectStore.ts # Project state
└── types/             # TypeScript definitions
```

### 6. Key Components

#### PlaywrightBrowser
- URL navigation and management
- DOM tree extraction
- Browser initialization
- Tab-based interface
- Test execution environment

#### TabbedTestEditor
- Multiple test script management
- Per-tab configurations
- Real-time editing
- Test execution controls
- Results visualization

#### TestBuilder
- AI-powered test generation
- DOM-based test creation
- JSON test script editing
- Validation and error handling

## Current Status

### Implemented Features
- ✅ Multi-browser support (Chromium, Firefox, WebKit)
- ✅ Tab-based test management
- ✅ Real-time test execution
- ✅ AI test generation
- ✅ DOM tree exploration
- ✅ Status tracking system
- ✅ Browser lifecycle management
- ✅ Test results visualization

### In Development
- 🚧 Test recording capabilities
- 🚧 Advanced test assertions
- 🚧 Test suite organization
- 🚧 Flow-based testing
- 🚧 Network interception

## Environment Variables

Required for development:
```env
OPENAI_API_KEY=           # OpenAI API key for test generation
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

MIT
