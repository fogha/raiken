# Arten - AI-Powered Test Automation Tool

Arten is a modern web application testing tool that combines AI with Playwright for automated testing. It provides a visual interface for creating, managing, and executing tests with real-time status tracking, enhanced error handling, and comprehensive test management capabilities.

## 🚀 Recent Progress & Updates

### Enhanced Error Handling & UI Resilience
- **Improved error handling** with non-intrusive error notifications
- **Right panel always accessible** even during browser errors
- **Visual error guidance** to help users understand available features during error states
- **Better layout stability** with enhanced resizable panel implementation

### Advanced Test Generation & Management
- **AI-powered test generation** with JSON-based test specification
- **Multi-tab test editor** with syntax highlighting and Monaco editor integration
- **Real-time test validation** with immediate feedback
- **Automatic test saving** to the `generated-tests/` directory
- **Enhanced test execution** with configurable browser settings

### Browser Integration & DOM Handling
- **Real-time DOM tree extraction** and visualization
- **Visual element selection** with click-to-select functionality
- **Multi-browser support** (Chromium, Firefox, WebKit)
- **Enhanced browser lifecycle management** with proper cleanup
- **Iframe-based browser preview** with sandboxed execution

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

### 1. Enhanced Test Builder
- **JSON-based test specification** with real-time validation
- **AI-powered test generation** using OpenAI API
- **Visual element selection** from DOM tree or direct webpage interaction
- **Test template system** with common patterns (forms, navigation, UI interactions)
- **Error-resilient interface** that remains functional during browser issues

### 2. Advanced Test Management
- **Multi-tab test editor** with Monaco editor integration
- **Test execution with configurable settings** (browser type, retries, timeouts)
- **Automatic test file management** in `generated-tests/` directory
- **Test reports generation** with detailed results and error diagnostics
- **Tab-based workflow** with state persistence

### 3. Browser Integration
- **Multi-browser testing** (Chromium, Firefox, WebKit)
- **Real-time DOM extraction** and tree visualization
- **Element selection and inspection** with visual feedback
- **Iframe-based browser preview** for safe page interaction
- **URL validation and error handling** with user guidance

### 4. Configuration & Customization
- **Configurable execution settings** (browser type, timeouts, retries)
- **Test recording features** (screenshots, video, tracing)
- **API model selection** for test generation
- **Persistent configuration** with localStorage integration
- **Environment-specific settings** for development and CI

### 5. Project Structure
```
src/
├── core/
│   ├── browser/         # Browser management & UI
│   │   ├── ui/         # PlaywrightBrowser, browser controls
│   │   └── services/   # Browser control logic & lifecycle
│   ├── testing/        # Test generation & management
│   │   ├── ui/        # TestBuilder, TabbedTestEditor, TestReports
│   │   ├── services/  # AI generation, OpenRouter integration
│   │   └── utils/     # Test utilities & validation
│   └── dom/           # DOM manipulation & tree handling
├── components/
│   ├── ui/            # Shadcn UI components (buttons, dialogs, etc.)
│   └── layout/        # ProjectViewer, SideBar layout components
├── store/
│   ├── browserStore.ts    # Browser state & tab management
│   ├── testStore.ts       # Test generation & execution state
│   ├── projectStore.ts    # Project-level state (URL, DOM tree)
│   └── configurationStore.ts # User settings & preferences
├── app/
│   └── api/           # Next.js API routes for backend functionality
└── types/             # TypeScript definitions
```

### 6. Key Components

#### ProjectViewer (Main Layout)
- **Three-panel layout** with resizable panels
- **Error-resilient design** with always-accessible test builder
- **Status bar** with real-time system status
- **Enhanced error notifications** positioned to not interfere with workflow

#### PlaywrightBrowser
- **Multi-tab interface** (Web Page View, Test Editor, Test Manager, Test Reports)
- **URL navigation** with validation and error handling
- **DOM tree extraction** with real-time updates
- **Test execution environment** with configurable settings

#### TestBuilder
- **AI-powered test generation** from JSON specifications
- **Real-time validation** with immediate error feedback
- **Integration with test management** system
- **Enhanced error handling** with detailed diagnostics

#### TabbedTestEditor
- **Monaco editor integration** with TypeScript syntax highlighting
- **Multi-tab test management** with individual configurations
- **Real-time test execution** with progress tracking
- **Test saving and file management** automation

## Current Status

### ✅ Implemented Features
- Multi-browser support (Chromium, Firefox, WebKit)
- AI-powered test generation with JSON specifications
- Tab-based test management with Monaco editor
- Real-time test execution with detailed reporting
- Enhanced error handling and UI resilience
- DOM tree exploration with visual element selection
- Configurable test execution (browser, retries, timeouts)
- Automatic test file management and saving
- Test reports with error diagnostics and screenshots

### 🚧 In Development
- Test recording capabilities with action capture
- Advanced test assertions and validation patterns
- Test suite organization and batch execution
- Flow-based testing with complex user journeys
- Network interception and mock data handling
- Advanced debugging tools and test inspection

### 🎯 Planned Features
- Test data management and parameterization
- CI/CD integration with automated test execution
- Team collaboration features and test sharing
- Advanced reporting and analytics dashboard
- Performance testing capabilities
- Mobile testing support

## Environment Variables

Required for development:
```env
OPENAI_API_KEY=           # OpenAI API key for test generation
```

Optional for enhanced features:
```env
BASE_URL=                 # Base URL for test execution
NODE_ENV=                 # Environment setting (development/production)
```

## API Endpoints

The application includes several API endpoints for backend functionality:

- `POST /api/generate-test` - AI-powered test generation
- `POST /api/execute-test` - Test execution with configurable settings
- `POST /api/save-test` - Automatic test file saving
- `POST /api/browser` - Browser control and DOM extraction
- `GET /api/test-reports` - Test results and reporting

## Error Handling & Resilience

Arten includes comprehensive error handling:

- **Non-blocking error notifications** that don't interfere with workflow
- **Graceful degradation** when browser or network issues occur
- **Always-accessible test builder** even during page loading errors
- **Detailed error diagnostics** for test failures and generation issues
- **Automatic recovery** from temporary browser connection issues

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes with descriptive messages
4. Push to the branch
5. Open a Pull Request with detailed description

## License

MIT License - See LICENSE file for details

---

*Arten continues to evolve with regular updates and improvements. Check the project repository for the latest features and bug fixes.*
