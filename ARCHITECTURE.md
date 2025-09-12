# Raiken Architecture - Post-Refactoring

## 🏗️ **Google-Level Architecture Overview**

Raiken now follows enterprise-grade architectural patterns with clear separation of concerns, type safety, and maintainable code organization.

## 📁 **File Structure**

```
src/
├── app/                          # Next.js App Router
│   ├── api/v1/                   # Versioned API routes
│   │   ├── browser/route.ts      # Unified browser operations
│   │   └── tests/route.ts        # Unified test operations
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Home page
│   └── settings/                 # Settings pages
│
├── components/                   # React components
│   ├── layout/                   # Layout components
│   │   ├── ProjectViewer.tsx     # Main container
│   │   ├── SideBar.tsx          # Navigation sidebar
│   │   └── TopBar.tsx           # Header navigation
│   ├── LocalBridgeStatus.tsx    # CLI bridge status
│   ├── NotificationContainer.tsx # Toast notifications
│   └── ui/                      # Reusable UI primitives
│
├── core/                        # Domain logic
│   ├── browser/                 # Browser automation
│   │   ├── playwright.service.ts
│   │   └── ui/PlaywrightBrowser.tsx
│   ├── dom/                     # DOM manipulation
│   │   ├── dom-analyzer.ts
│   │   └── domUtils.ts
│   └── testing/                 # Test management
│       ├── services/            # Business logic services
│       ├── test-script-utils.ts
│       └── ui/                  # Test UI components
│
├── services/                    # Service layer
│   ├── api.service.ts          # HTTP client with error handling
│   ├── browser.service.ts      # High-level browser operations
│   ├── test.service.ts         # High-level test operations
│   ├── ai.service.ts           # AI abstraction
│   └── storage.service.ts      # Persistence abstraction
│
├── store/                      # State management (Zustand)
│   ├── browserStore.ts         # Browser state
│   ├── projectStore.ts         # Project state
│   ├── testStore.ts           # Test state
│   ├── configurationStore.ts  # Settings state
│   ├── notificationStore.ts   # Notifications
│   └── types.ts               # Store type definitions
│
├── types/                      # TypeScript definitions
│   ├── index.ts               # Central exports
│   ├── api.ts                 # API request/response types
│   ├── browser.ts             # Browser-related types
│   ├── components.ts          # Component prop types
│   ├── config.ts              # Configuration types
│   ├── dom.ts                 # DOM tree types
│   ├── external.ts            # Third-party service types
│   ├── status.ts              # System status types
│   ├── store.ts               # State management types
│   └── test.ts                # Test-related types
│
├── config/                     # Configuration management
│   ├── app.config.ts          # Application settings
│   ├── browser.config.ts      # Browser defaults
│   ├── ai.config.ts           # AI service configuration
│   └── api.config.ts          # API configuration
│
├── utils/                      # Utility functions
│   ├── error-handling.ts      # Standardized error handling
│   ├── validation.ts          # Input validation
│   ├── formatters.ts          # Display formatting
│   ├── dom-helpers.ts         # DOM manipulation
│   └── test-helpers.ts        # Test utilities
│
├── constants/                  # Application constants
│   └── index.ts               # All constants
│
├── lib/                       # Library functions
│   ├── utils.ts               # Common utilities
│   ├── local-bridge.ts        # CLI integration
│   └── index.ts               # Library exports
│
└── hooks/                     # Custom React hooks
    └── useLocalBridge.ts      # CLI bridge hook
```

## 🎯 **Key Architectural Principles**

### **1. Separation of Concerns**
- **API Layer**: Unified endpoints with proper versioning (`/api/v1/`)
- **Service Layer**: Business logic abstraction
- **Component Layer**: Pure UI components with clear props
- **Store Layer**: Centralized state management
- **Type Layer**: Comprehensive TypeScript definitions

### **2. Error Handling**
- Standardized `AppError` class with error codes
- Consistent error responses across all APIs
- Retry mechanisms with exponential backoff
- Structured error logging

### **3. Configuration Management**
- Environment-aware configurations
- Type-safe configuration access
- Centralized defaults with override capability
- Feature flags for gradual rollouts

### **4. Type Safety**
- Complete TypeScript coverage
- Strict type checking enabled
- Centralized type exports
- Generic utility types for reusability

### **5. Service Abstractions**
- HTTP client with automatic error handling
- Browser service with high-level operations
- AI service with provider abstraction
- Storage service with consistent interface

## 🔄 **Data Flow Architecture**

```
User Action → Component → Service → API → Core Logic → Store → UI Update
     ↑                                                           ↓
     ←─────────────── Error Handling ←─────────────────────────────
```

### **Example: Test Generation Flow**
1. **UI**: User enters prompt in `TestBuilder`
2. **Service**: `testService.generateTest()` called
3. **API**: POST to `/api/v1/tests` with action: 'generate'
4. **Core**: `OpenRouterService` processes the request
5. **Store**: `testStore` updates with generated script
6. **UI**: Components re-render with new test

## 🛡️ **Error Handling Strategy**

### **Error Types**
- `VALIDATION_ERROR`: Input validation failures
- `BROWSER_ERROR`: Browser automation issues
- `TEST_EXECUTION_ERROR`: Test running failures
- `AI_SERVICE_ERROR`: AI service problems
- `NETWORK_ERROR`: Communication issues

### **Error Recovery**
- Automatic retries with backoff
- Graceful degradation for non-critical features
- User-friendly error messages
- Comprehensive logging for debugging

## 📊 **State Management Pattern**

### **Store Architecture**
- **browserStore**: Browser state, status, tabs
- **projectStore**: Project info, DOM tree, selection
- **testStore**: Test scripts, results, execution
- **configurationStore**: User preferences, settings
- **notificationStore**: Toast notifications

### **State Updates**
- Immutable updates using Zustand
- Optimistic updates for better UX
- Automatic persistence for user preferences
- Real-time synchronization across components

## 🔧 **Development Benefits**

### **Maintainability**
- Clear separation of concerns
- Consistent patterns across codebase
- Comprehensive type safety
- Standardized error handling

### **Scalability**
- Modular architecture
- Service abstraction layers
- Configuration management
- Feature flag support

### **Developer Experience**
- IntelliSense support throughout
- Consistent naming conventions
- Clear documentation
- Easy debugging with structured logging

## 🚀 **Migration Notes**

### **API Changes**
- Old fragmented endpoints consolidated
- Versioned API structure (`/api/v1/`)
- Unified request/response patterns

### **Type Improvements**
- Centralized type definitions
- Eliminated type duplication
- Added comprehensive prop types

### **Service Layer**
- New abstraction layer for business logic
- Consistent error handling
- Improved testability

This architecture provides a solid foundation for scaling Raiken while maintaining code quality and developer productivity.
