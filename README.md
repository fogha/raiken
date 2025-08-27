# Arten - AI-Powered Test Automation Tool

Arten is a modern web application testing tool that combines AI with Playwright for automated testing. It provides a visual interface for creating, managing, and executing tests with real-time status tracking, enhanced error handling, and comprehensive test management capabilities.

> 📖 **For complete documentation, see [DOCUMENTATION.md](DOCUMENTATION.md)**

## 🚀 Quick Start

### Option 1: CLI Tool (Recommended)
```bash
# Install globally
npm install -g @arten/cli

# Navigate to your project
cd my-nextjs-app

# Start Arten (auto-detects project type)
arten start
```

### Option 2: Standalone Web Application
```bash
git clone https://github.com/your-username/arten.git
cd arten
npm install
echo "OPENROUTER_API_KEY=your_api_key_here" > .env.local
npm run dev
```

## ✨ Key Features

- **🤖 AI-Powered Test Generation** - Natural language to Playwright tests
- **🌐 Multi-Browser Support** - Chromium, Firefox, WebKit
- **📝 Advanced Test Editor** - Monaco editor with TypeScript support
- **🔄 Local Integration** - Direct file system access via CLI bridge
- **📊 Rich Reporting** - Video recording, screenshots, AI-powered analysis
- **🔔 Smart Notifications** - Non-intrusive floating notifications
- **⚡ Real-time DOM** - Live DOM extraction and element selection

## 📋 Recent Updates

### 🎯 Enhanced Bridge Integration
- **Local file system access** - Tests saved directly to your project
- **Bridge server authentication** - Secure token-based communication
- **Project auto-detection** - Supports Next.js, React, Vue, and more
- **Smart notification system** - Connection status and error handling

### 🚀 UI/UX Improvements  
- **Global notification system** - Floating notifications in bottom-right
- **Always-accessible test builder** - Right panel remains available during errors
- **Enhanced error handling** - Graceful degradation and recovery
- **Bridge status monitoring** - Real-time connection status

## 🛠️ CLI Tool Benefits

- ✅ **Direct file system access** - writes tests to your project
- ✅ **Auto-project detection** - supports Next.js, React, Vue, and more
- ✅ **Zero configuration** - works out of the box
- ✅ **Offline support** - no cloud dependencies for core features
- ✅ **Bridge server integration** - seamless hosted platform connectivity

## 🏗️ Architecture

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

## 🔧 Configuration

### Environment Variables
```env
# Required for AI features
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxx

# Optional
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
```

### CLI Commands
```bash
arten start     # Start web interface
arten init      # Initialize project
arten info      # Show project information
arten remote    # Start bridge server
```

## 📊 Current Status

### ✅ Production Ready Features
- Multi-browser test execution (Chromium, Firefox, WebKit)
- AI-powered test generation with OpenRouter integration
- Local file system integration via CLI bridge server
- Real-time DOM extraction and element selection
- Monaco editor with TypeScript syntax highlighting
- Global notification system with auto-hide
- Test reports with video recording and screenshots
- Configurable test execution (retries, timeouts, browser selection)

### 🚧 Active Development
- Enhanced test suite management
- Advanced debugging tools
- Performance testing capabilities
- Mobile testing support

## 📖 Documentation

- **[Complete Documentation](DOCUMENTATION.md)** - Comprehensive guide
- **[CLI Documentation](cli/README.md)** - CLI tool reference
- **[Deployment Guide](DEPLOYMENT.md)** - Deployment options
- **[Architecture Guide](src/STRUCTURE.md)** - Technical details
- **[Changelog](CHANGELOG.md)** - Recent updates

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

See [DOCUMENTATION.md#contributing](DOCUMENTATION.md#contributing) for detailed guidelines.

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📧 **Issues:** [GitHub Issues](https://github.com/your-username/arten/issues)
- 📖 **Documentation:** [DOCUMENTATION.md](DOCUMENTATION.md)
- 💬 **Discussions:** [GitHub Discussions](https://github.com/your-username/arten/discussions)

---

*Arten continues to evolve with regular updates and improvements. Check the [changelog](CHANGELOG.md) for the latest features and bug fixes.*
