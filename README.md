# dreamytin-ai
My personal AI assistant with local and remote model support.

## Project Overview
A desktop application serving as an ongoing life assistant with persistent knowledge management, finance tracking, and tech news monitoring.

## Tech Stack
- **Frontend**: Electron + React + Vite
- **Backend**: Express.js server
- **AI Models**: AI SDK (supports OpenAI, Anthropic, local models)
- **Build Tools**: Vite for fast development, Concurrently for parallel processes
- **Storage**: Simple text files (JSON/Markdown)

## Architecture
- `src/main/` - Electron main process
- `src/renderer/` - UI frontend
- `src/backend/` - Express API server
- `data/knowledge/` - Personal knowledge base
- `data/conversations/` - Chat history
- `data/finance/` - Financial data
- `data/news/` - Tech news & interests

## Key Features (Planned)
- Multi-provider AI model switching
- Persistent conversation memory
- Personal knowledge base
- Finance management
- Tech news monitoring
- Local data storage

## Getting Started
```bash
npm install
npm run dev      # Starts both backend server and Electron app with hot reloading
```

## Testing
The project includes comprehensive unit and integration testing. For detailed testing information, see [TESTING.md](./TESTING.md).

**Quick testing commands:**
```bash
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
npm run test:auto     # Auto-run tests on file changes
```

## Configuration
Environment variables are configured in the `.env` file. Update with your API keys as needed.
