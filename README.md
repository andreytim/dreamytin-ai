# dreamytin-ai
My personal AI assistant with local and remote model support.

## Project Overview
A desktop application serving as an ongoing life assistant with persistent knowledge management, finance tracking, and tech news monitoring.

## Tech Stack
- **Frontend**: Electron + React + Vite
- **Backend**: Express.js server (embedded in Electron main process)
- **AI Models**: AI SDK (supports OpenAI, Anthropic, Google)
- **Build Tools**: Vite for fast development, Electron Builder for standalone packaging
- **Storage**: Simple text files (JSON/Markdown)

## Architecture
- `src/main/` - Electron main process
- `src/renderer/` - UI frontend
- `src/backend/` - Express API server
- `src/config/` - Model and application configuration
- `data/knowledge/` - Personal knowledge base
- `data/conversations/` - Chat history
- `data/finance/` - Financial data
- `data/news/` - Tech news & interests

## Components

### Frontend (`src/renderer/`)
- **App.jsx** - Main React chat interface with streaming messages, markdown support, and model selection dropdown
- **index.css** - Complete styling for chat UI, markdown formatting, model dropdown, and responsive design
- **main.jsx** - React app entry point

### Backend (`src/backend/`)
- **server.js** - Express server with multi-provider AI support and streaming responses
- Multi-provider routing (OpenAI, Anthropic, Google) with automatic API key validation
- Runs embedded within Electron main process for unified dev/production architecture

### Configuration (`src/config/`)
- **models.json** - Centralized model configuration with provider mappings

## Key Features
- Multi-provider AI model switching with dropdown selection in header
- Session-based cost tracking with real-time usage display
- Streaming AI responses with markdown support
- Persistent conversation memory
- Personal knowledge base
- Finance management
- Tech news monitoring
- Local data storage
- Standalone desktop app builds for distribution

## Getting Started
```bash
npm install
npm run dev      # Starts Electron app with embedded backend and hot reloading
```

## Building Standalone App
Create distributable desktop applications:

```bash
npm run build:mac     # Build for macOS (.dmg and .zip)
npm run build:win     # Build for Windows (.exe)
npm run build:linux   # Build for Linux (.AppImage)
npm run build         # Build for current platform
```

The built app will include both frontend and backend, requiring no separate server setup.

## Testing
The project includes comprehensive unit and integration testing. For detailed testing information, see [TESTING.md](./TESTING.md).

**Quick testing commands:**
```bash
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
npm run test:auto     # Auto-run tests on file changes
```

## Configuration
Environment variables are configured in the `.env` file. Update with your API keys as needed:

```env
# Required API keys (add the ones you plan to use)
OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here  
GOOGLE_GENERATIVE_AI_API_KEY=your_google_key_here
```

## AI Models
The application supports multiple AI providers: OpenAI, Anthropic, and Google.

### Available Models
- **OpenAI**: `gpt-4.1`, `gpt-4.1-mini`, `gpt-4.1-nano`
- **Anthropic**: `claude-opus-4`, `claude-sonnet-4`, `claude-3.5-haiku`
- **Google**: `gemini-2.0-flash`, `gemini-1.5-pro`, `gemini-1.5-flash`

### Model Selection
Models can be selected using the dropdown in the application header. The selected model persists for the current session.

### Changing the Default Model
Edit `src/config/models.json`:

```json
{
  "defaultModel": "gpt-4.1"
}
```

The default model is automatically selected when the application starts.

## Development vs Production
The application now uses a unified architecture where the backend runs embedded within the Electron main process in both development and production modes. This ensures:

- **Consistent behavior** between dev and production builds
- **Easier debugging** with the same architecture in both environments  
- **Simplified deployment** as standalone executable with no external dependencies
- **Environment variables** properly loaded and passed to the embedded backend
