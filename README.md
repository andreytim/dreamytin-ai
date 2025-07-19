# DreamyTin AI

Personal AI assistant with multi-provider support, intelligent knowledge management, and conversation memory.

## Features

- **Multi-Provider AI** - OpenAI, Anthropic, Google models with easy switching
- **Conversation Memory** - Persistent chat history with intelligent context management  
- **Smart Knowledge Base** - AI-powered personal context injection
- **Real-time Cost Tracking** - Session-based usage monitoring
- **Standalone Desktop App** - No external server required

## Quick Start

```bash
npm install
npm run dev      # Start with hot reload
```

**Setup API Keys** (`.env` file):
```env
OPENAI_API_KEY=your_key
ANTHROPIC_API_KEY=your_key  
GOOGLE_GENERATIVE_AI_API_KEY=your_key
```

## Architecture

```
src/
├── main/           # Electron main process
├── renderer/       # React UI
├── backend/        # Express server (embedded)
└── config/         # Model configuration

data/
├── system-prompt.md    # AI behavior config
├── knowledge/          # Personal context files
├── conversations/      # Chat history  
└── finance/           # Financial tracking
```

## AI Models

**Available Models:**
- **OpenAI**: `gpt-4.1`, `gpt-4.1-mini`, `gpt-4.1-nano` (1M tokens)
- **Anthropic**: `claude-opus-4`, `claude-sonnet-4`, `claude-3.5-haiku` (200K tokens)  
- **Google**: `gemini-2.0-flash`, `gemini-1.5-pro`, `gemini-1.5-flash` (1M-2M tokens)

**Change Default Model** - Edit `src/config/models.json`:
```json
{ "defaultModel": "claude-3.5-haiku" }
```

## Conversation Memory

The app now maintains conversation context within each session:

- **Per-Session History** - Each conversation remembered until model switch
- **Smart Truncation** - Automatically manages context windows based on model limits
- **Token Awareness** - Uses 80% of each model's maximum context length
- **Session Isolation** - New sessions start fresh, preserving privacy

**How it Works:**
1. Each app session gets a unique ID
2. Messages stored in backend memory mapped to session
3. Full conversation history sent to AI for context
4. Old messages automatically pruned when approaching token limits
5. Switching models creates a new session

## Knowledge Management

**Intelligent Knowledge System** powered by AI-driven file selection:

### Core Files
- `data/knowledge/personal.md` - Personal background, family, location
- `data/knowledge/work.md` - Career, job history, professional context  
- `data/knowledge/interests.md` - Hobbies, activities, preferences

### Selection Modes
1. **🤖 AI-Powered** - Claude 3.5 Haiku analyzes queries and selects relevant files
2. **🔤 Keyword Fallback** - Traditional matching when AI unavailable
3. **📄 Full Context** - Include all knowledge files (toggle in UI)

### Features
- **Smart Caching** - Reduces costs for similar queries
- **Runtime Control** - Toggle modes via `/api/knowledge/config`
- **Auto-Loading** - New `.md` files automatically detected
- **Cost Efficient** - Uses lightweight Haiku model for selection

**API Endpoints:**
- `GET /api/knowledge/config` - View system status
- `POST /api/knowledge/config` - Toggle intelligent selection
- `POST /api/knowledge/cache/clear` - Clear selection cache
- `POST /api/knowledge/reload` - Reload knowledge files

## Building

**Development:**
```bash
npm run dev          # Start with hot reload
npm test             # Run test suite
npm run test:watch   # Watch mode testing
```

**Production Builds:**
```bash
npm run build:mac    # macOS (.dmg, .zip)
npm run build:win    # Windows (.exe) 
npm run build:linux  # Linux (.AppImage)
npm run build        # Current platform
```

Built apps are fully standalone with embedded backend.

## System Prompt

Customize AI behavior by editing `data/system-prompt.md`. This file defines the assistant's personality, capabilities, and response style across all models.

## Testing

Comprehensive test coverage including:
- **KnowledgeManager** - 19 tests for AI selection system
- **Frontend Components** - React component testing
- **API Integration** - Backend endpoint validation

See [TESTING.md](./TESTING.md) for detailed testing information.

## Tech Stack

- **Frontend**: Electron + React + Vite
- **Backend**: Express.js (embedded in Electron)
- **AI**: AI SDK (multi-provider support)
- **Storage**: Local files (JSON/Markdown)
- **Build**: Electron Builder for distribution