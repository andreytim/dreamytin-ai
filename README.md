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
- `src/config/` - Model and application configuration
- `data/knowledge/` - Personal knowledge base
- `data/conversations/` - Chat history
- `data/finance/` - Financial data
- `data/news/` - Tech news & interests

## Components

### Frontend (`src/renderer/`)
- **App.jsx** - Main React chat interface with streaming messages and markdown support
- **index.css** - Complete styling for chat UI, markdown formatting, and responsive design
- **main.jsx** - React app entry point

### Backend (`src/backend/`)
- **server.js** - Express server with multi-provider AI support and streaming responses
- Multi-provider routing (OpenAI, Anthropic, Google) with automatic API key validation

### Configuration (`src/config/`)
- **modelSettings.js** - Centralized model configuration with provider mappings

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
- **OpenAI**: `gpt-4.1`, `gpt-4.1-mini`, `gpt-4.1-nano`, `gpt-4o`, `gpt-3.5-turbo`
- **Anthropic**: `claude-3.5-sonnet`, `claude-3-sonnet`, `claude-3-haiku`  
- **Google**: `gemini-2.0-flash`, `gemini-1.5-pro`, `gemini-1.5-flash`

### Changing the Default Model
Edit `src/config/modelSettings.js`:

```javascript
module.exports = {
  defaultModel: 'gpt-4.1'  // Use any model key from the list above
};
```

The model can also be overridden per request by including a `model` parameter in the API request body.
