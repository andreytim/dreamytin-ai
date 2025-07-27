# Migration Guide: v1 (React/Express) → v2 (Tauri/FastAPI)

## Architecture Decision

**Final Stack:**
- **Frontend**: Tauri with TypeScript/React (✅ Completed)
- **Backend**: FastAPI server
- **AI Framework**: OpenAI Agents SDK for agentic loops
- **Multi-Provider Support**: LiteLLM for model adaptation
- **Tools**: Custom implementation (no MCP)

## What to Port

### Core Features to Migrate
1. **Chat Interface** ✅
   - From: `App.jsx`, `ChatInterface.jsx`
   - To: `v2/frontend-tauri/src/`
   - Status: Complete with TypeScript

2. **AI Provider Integration** ✅
   - From: `src/backend/server.js` (OpenAI/Anthropic routes)
   - To: `v2/backend-fastapi/` using OpenAI Agents SDK + LiteLLM
   - Support: OpenAI, Anthropic, Google Gemini

3. **Knowledge Management**
   - From: `src/backend/knowledgeManager.js`
   - To: `v2/backend-fastapi/knowledge/`
   - Implementation: As agent tools

4. **Configuration**
   - From: `src/config/models.json`, `src/config/pricing.json`
   - To: `v2/shared/config/` (already migrated)
   - Keep: Model definitions, pricing data

5. **System Prompt**
   - From: `data/system-prompt.md`
   - To: Agent instructions in backend
   - Keep: Prompt content

### What NOT to Port
- Node.js/Express specific code
- React development server setup
- npm package configurations
- MCP integration (using custom tools instead)

### New Architecture Benefits
- **Tauri**: Native desktop performance, smaller bundle size
- **FastAPI**: Better Python ecosystem for AI, async support
- **OpenAI Agents SDK**: Production-ready agent framework
- **LiteLLM**: Seamless multi-provider support

## File Mapping

| v1 Location | v2 Location | Notes |
|------------|-------------|-------|
| `App.jsx` | `v2/frontend-tauri/src/App.tsx` | ✅ Completed |
| `src/backend/server.js` | `v2/backend-fastapi/main.py` | ✅ Completed |
| `src/backend/knowledgeManager.js` | `v2/backend-fastapi/knowledge/manager.py` | As agent tools |
| `src/config/*.json` | `v2/shared/config/` | ✅ Completed |
| `data/` | Keep in place | Shared between versions |

## Phased Implementation Plan

### Phase 1: Basic FastAPI + Agent Setup ✅ COMPLETED
1. **FastAPI server setup** ✅
   - Basic app structure with CORS
   - Health check endpoint
   - WebSocket endpoint for streaming

2. **OpenAI Agents SDK integration** ✅
   - Basic agent with system prompt
   - LiteLLM adapter for multi-provider support
   - Simple message handling (no tools yet)

3. **Streaming implementation** ✅
   - WebSocket streaming for responses
   - Proper error handling
   - Connection management

### Phase 2: Tool Implementation ✅ COMPLETED
1. **Tool framework** ✅
   - Base tool class/interface with Pydantic models
   - Tool registration system with global registry
   - Tool execution handling with async support

2. **Initial tools** ✅
   - `ls` - List directory contents with options
   - `read_file` - Read file contents with encoding support
   - Integration with agent via OpenAI function calling

3. **Tool response formatting** ✅
   - Consistent ToolResult format
   - Error handling for tool calls
   - Streaming support for tool execution

### Phase 3: Frontend-Backend Integration
1. **WebSocket connection**
   - Update frontend to connect to FastAPI WebSocket
   - Handle connection states (connecting, connected, error)
   - Implement reconnection logic

2. **Message handling**
   - Update frontend to send proper message format
   - Handle streaming responses from backend
   - Display tool calls and results in chat

3. **Model selection**
   - Integrate with `/models` endpoint
   - Update frontend model selector
   - Handle model-specific features

4. **Error handling**
   - Display backend errors in frontend
   - Handle WebSocket disconnections
   - Show connection status to user

### Phase 4: Conversation & State
1. **Conversation history**
   - In-memory storage initially
   - Message history management
   - Context window handling

2. **Session management**
   - Session creation/tracking
   - Multiple conversation support
   - Basic persistence (SQLite)

### Phase 5: Knowledge Integration
1. **Knowledge manager port**
   - Load knowledge files
   - Knowledge injection on first message
   - Knowledge search tool

2. **System prompt management**
   - Dynamic prompt construction
   - Knowledge-aware prompting

### Phase 6: Production Features
1. **Usage tracking**
   - Token counting
   - Cost calculation
   - Usage limits

2. **Advanced features**
   - Model switching mid-conversation
   - Tool permission system
   - Rate limiting

## Setup Instructions

### FastAPI Backend Setup
```bash
cd v2/backend-fastapi
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run server  
python main.py  # or: uvicorn main:app --reload
```

### Environment Configuration
```bash
# Backend automatically uses root .env file (../../.env)
# Ensure it has: OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_API_KEY
```

## Key Architecture Differences

1. **Frontend Communication**:
   - v1: HTTP requests to Express server
   - v2: WebSocket for streaming + HTTP for commands

2. **State Management**:
   - v1: In-memory + file-based
   - v2: Agent session management + SQLite

3. **AI Integration**:
   - v1: Direct API calls per provider
   - v2: Unified through OpenAI Agents SDK + LiteLLM

4. **Tool System**:
   - v1: Custom implementation
   - v2: Integrated with agent framework