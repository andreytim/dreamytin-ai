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
  "defaultModel": "claude-3.5-haiku"
}
```

The default model is automatically selected when the application starts.

### System Prompt Configuration
The AI assistant's behavior is controlled by a system prompt stored in `data/system-prompt.md`. This file contains the core instructions that define the assistant's personality, capabilities, and response style. The system prompt is automatically loaded and applied to all AI interactions across different models.

### Personal Knowledge Base
The application includes an **intelligent knowledge injection system** powered by the **KnowledgeManager** class that personalizes AI responses using **AI-powered dynamic file selection** and contextual information stored in markdown files.

**Architecture**: `src/backend/knowledgeManager.js`  
**Knowledge Directory**: `data/knowledge/`

The **KnowledgeManager** features a **dual-mode selection system**:
1. **🤖 Intelligent Selection** - Uses Claude 3.5 Haiku to analyze user queries and dynamically select the most relevant knowledge files
2. **🔤 Keyword Fallback** - Traditional keyword matching as backup for reliability

This hybrid approach ensures cost-effective, intelligent context selection while maintaining system reliability.

**Supported Knowledge Categories:**
- `personal.md` - Personal background, family, location details
- `work.md` - Career information, job history, professional context
- `interests.md` - Hobbies, activities, personal interests

**How it works:**

**🤖 Intelligent Mode:**
1. **Auto-Loading** - KnowledgeManager loads all `.md` files at server startup
2. **AI Analysis** - Claude 3.5 Haiku analyzes user message and knowledge file summaries
3. **Dynamic Selection** - AI intelligently selects most relevant files based on semantic understanding
4. **Smart Caching** - Results cached to minimize API costs for similar queries
5. **Context Injection** - Selected knowledge enhances system prompt with precise relevance

**🔤 Keyword Fallback Mode:**
1. **Keyword Matching** - Analyzes messages against predefined keyword mappings  
2. **Multi-File Selection** - Selects multiple knowledge files when keywords match
3. **Fallback Behavior** - Uses personal profile as default for general conversations

**Technical Implementation:**
- **Dual-Mode Architecture** - AI-powered + keyword fallback with seamless switching
- **Cost Optimization** - Smart caching and efficient Claude 3.5 Haiku usage
- **Full Test Coverage** - 19 comprehensive tests ensuring reliability
- **Runtime Control** - Toggle between intelligent/keyword modes via API
- **Dynamic Loading** - Runtime knowledge base updates with `reload()` method

**Example Keywords:**
- Personal: "personal", "family", "background", "who are you"
- Work: "job", "career", "work", "engineering", "Meta"
- Interests: "hobbies", "interests", "basketball", "exercise"

**Adding Knowledge:**
1. Create new `.md` files in `data/knowledge/` - they will be automatically loaded on server startup
2. The filename (without `.md`) becomes the knowledge category key
3. Add keyword mappings to `KnowledgeManager.contextMappings` for semantic detection
4. Optionally use `knowledgeManager.addContextMapping(key, keywords)` for runtime updates

**API Configuration Endpoints:**
- `GET /api/knowledge/config` - View current system status and settings
- `POST /api/knowledge/config` - Toggle intelligent selection on/off
- `POST /api/knowledge/cache/clear` - Clear AI selection cache
- `POST /api/knowledge/reload` - Reload knowledge base from files

**Selection Comparison Examples:**
```
Query: "Tell me about your work at Meta"
🤖 Intelligent: [work] - AI focuses on work-specific context
🔤 Keyword: [personal, work] - Keywords match multiple files

Query: "What's the weather today?"  
🤖 Intelligent: [personal] - AI provides general personal context
🔤 Keyword: [personal] - Falls back to personal default
```

## Development vs Production
The application now uses a unified architecture where the backend runs embedded within the Electron main process in both development and production modes. This ensures:

- **Consistent behavior** between dev and production builds
- **Easier debugging** with the same architecture in both environments  
- **Simplified deployment** as standalone executable with no external dependencies
- **Environment variables** properly loaded and passed to the embedded backend
