# DreamyTin AI

Personal AI assistant web application with multi-provider support, intelligent knowledge management, and conversation memory.

## Features

- **Multi-Provider AI** - OpenAI, Anthropic, Google models with easy switching
- **Conversation Memory** - Persistent chat history with intelligent context management  
- **Smart Knowledge Base** - AI-powered personal context injection
- **Real-time Cost Tracking** - Session-based usage monitoring
- **Web-Based Interface** - Runs in your browser with local backend

## Quick Start

```bash
npm install
npm run dev      # Start frontend and backend servers
```

Then open http://localhost:5173 in your browser.

**Setup API Keys** (`.env` file):
```env
OPENAI_API_KEY=your_key
ANTHROPIC_API_KEY=your_key  
GOOGLE_GENERATIVE_AI_API_KEY=your_key
```

## Architecture

```
src/
├── backend/        # Express API server (port 3001)
└── config/         # Model configuration

# Root level
├── App.jsx         # Main React component
├── main.jsx        # React entry point
├── index.html      # HTML template
└── index.css       # Styles

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

**Simple File-Based Knowledge System** for personal context:

### Core Files
- `data/knowledge/personal.md` - Personal background, family, location
- `data/knowledge/work.md` - Career, job history, professional context  
- `data/knowledge/interests.md` - Hobbies, activities, preferences

### How It Works
1. **Auto-Loading** - All `.md` files loaded from `data/knowledge/` on startup
2. **First Message Injection** - All knowledge files injected on conversation start
3. **Conversation Memory** - Subsequent messages rely on chat history
4. **Simple & Reliable** - No complex AI selection or caching logic

### Features
- **File-Based Storage** - Easy to edit knowledge files directly
- **Automatic Discovery** - New `.md` files automatically loaded
- **Conversation Efficient** - Knowledge injected once per conversation
- **No Dependencies** - No external AI calls for knowledge management

## Development

```bash
npm run dev          # Start both frontend and backend
npm run dev:frontend # Start only frontend (Vite)
npm run dev:backend  # Start only backend (Express)
npm test             # Run test suite
npm run test:watch   # Watch mode testing
```

**Note:** This is a development-only application with no production build.

## System Prompt

Customize AI behavior by editing `data/system-prompt.md`. This file defines the assistant's personality, capabilities, and response style across all models.

## Testing

Comprehensive test coverage including:
- **KnowledgeManager** - 19 tests for AI selection system
- **Frontend Components** - React component testing
- **API Integration** - Backend endpoint validation

See [TESTING.md](./TESTING.md) for detailed testing information.

## Tech Stack

- **Frontend**: React + Vite (http://localhost:5173)
- **Backend**: Express.js API (http://localhost:3001)
- **AI**: AI SDK (multi-provider support)
- **Storage**: Local files (JSON/Markdown)
- **Development**: Hot reload with Vite + nodemon