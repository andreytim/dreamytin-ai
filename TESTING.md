# Testing Setup

This project now includes comprehensive unit and integration testing.

## Test Framework
- **Jest** - Testing framework
- **React Testing Library** - React component testing
- **Supertest** - HTTP API testing
- **@testing-library/jest-dom** - Additional DOM matchers

## Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (reruns on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests automatically when files change
npm run test:auto
```

## Test Structure

Tests are organized in dedicated folders separate from source code:

```
tests/
├── setupTests.js        # Global test configuration
├── unit/
│   ├── frontend/        # React component unit tests
│   └── backend/         # Backend logic unit tests
│       └── knowledgeManager.test.js  # KnowledgeManager test suite (19 tests)
└── integration/         # API integration tests
```

### Integration Tests (`tests/integration/api.test.js`)
- API endpoint integration tests
- Error handling tests
- Mocked external dependencies

### Frontend Unit Tests (`tests/unit/frontend/App.test.jsx`)
- React component rendering tests
- UI interaction tests
- Mocked API calls

## Test Configuration

- **jest.config.js** - Main Jest configuration
- **babel.config.js** - JSX transformation for tests
- **tests/setupTests.js** - Global test setup (imports @testing-library/jest-dom for custom matchers)

## Automated Testing

The `test:auto` script uses chokidar to automatically run tests when source files change:
- Watches `src/**/*.js` and `src/**/*.jsx` files
- Runs full test suite on any changes
- Useful during development for immediate feedback

## Writing New Tests

### Backend Integration Tests
Create `.test.js` files in `tests/integration/` directory following the pattern in `api.test.js`.

### Backend Unit Tests
Create `.test.js` files in `tests/unit/backend/` directory for testing individual functions/modules.

#### KnowledgeManager Tests (`tests/unit/backend/knowledgeManager.test.js`)
Simplified test suite for the file-based knowledge system:

```bash
# Run KnowledgeManager tests specifically
npm test -- tests/unit/backend/knowledgeManager.test.js
```

**Test Coverage (14 passing tests):**
- **Constructor & Initialization** - Auto-loading, custom directories, error handling
- **Knowledge Base Loading** - File system operations, markdown parsing, graceful failures  
- **System Prompt Building** - Context injection and formatting
- **Utility Methods** - Getting knowledge base and reloading files

**Key Test Features:**
- Mock file system operations for reliable testing
- Error handling and edge case coverage
- Clean test output (no console logs during testing)
- Focus on core functionality without complex AI logic

### Frontend Unit Tests
Create `.test.jsx` files in `tests/unit/frontend/` directory following the pattern in `App.test.jsx`.

## Mocking Strategy

- External APIs are mocked using Jest mocks
- DOM methods not available in jsdom (like `scrollIntoView`) are mocked
- Network requests are mocked using Jest's `fetch` mock