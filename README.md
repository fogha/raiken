# Arten - AI-Powered Test Automation Tool

Arten is a modern web application testing tool that combines AI with Playwright for automated testing. It provides a visual interface for creating, managing, and executing tests.

## Prerequisites

- Node.js 18+
- npm or yarn
- Modern web browser (Chrome recommended)
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

### 1. Visual DOM Explorer
- Interactive tree view with element highlighting
- Real-time DOM tree updates
- Element selection for test generation
- Collapsible sidebar for better workspace management
- Element information display (tag, ID, classes)

### 2. Website Preview
- Integrated iframe viewer
- Zoom controls (25% to 200%)
- Reset view functionality
- Loading state management
- Secure sandbox environment

### 3. Test Generation & Execution
- AI-powered test creation
- Support for common Playwright actions:
  - Navigation
  - Clicking
  - Typing
  - Waiting
  - Assertions
- Real-time test execution
- Basic error reporting

### 4. Configuration Options
- **Execution Settings**
  - Browser/Service mode selection
  - Custom endpoint configuration
  - Save test options
  - Real-time results toggle

- **Documentation**
  - Built-in test syntax guide
  - Code examples
  - Common actions reference
  - Collapsible documentation panel

## Project Structure

```
src/
├── components/            
│   ├── ui/               # UI components
│   ├── TestBuilder.tsx   # Main test interface
│   ├── SideBar.tsx      # DOM explorer
│   └── IframeViewer.tsx # Target page viewer
├── lib/
│   ├── test-generation/ # AI integration
│   └── test-execution/  # Playwright runner
└── types/               # TypeScript definitions
```

## Known Limitations

1. **DOM Explorer**
   - Large DOM trees may impact performance
   - Limited support for dynamic content

2. **Test Generation**
   - Basic Playwright commands only
   - May require manual adjustments

3. **UI/UX**
   - Documentation panel scroll behavior needs improvement
   - Some responsive design issues

## Development Status

### Working Features
- ✅ DOM tree visualization
- ✅ Element highlighting
- ✅ Basic test generation
- ✅ Configuration panel
- ✅ Documentation viewer
- ✅ Website preview with zoom

### In Progress
- 🚧 Test recording
- 🚧 Advanced selectors
- 🚧 Results visualization
- 🚧 Test suite management

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## Environment Variables

Required variables for local development:
```env
OPENAI_API_KEY=           # OpenAI API key for test generation
```

## License

MIT
