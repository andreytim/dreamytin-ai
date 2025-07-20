# Migration Guide: v1 (React/Express) → v2 (Tauri/FastAPI/FastMCP)

## What to Port

### Core Features to Migrate
1. **Chat Interface**
   - From: `App.jsx`, `ChatInterface.jsx`
   - To: `v2/frontend-tauri/src/`
   - Keep: UI/UX design, chat history display

2. **AI Provider Integration**
   - From: `src/backend/server.js` (OpenAI/Anthropic routes)
   - To: `v2/backend-fastapi/` (Direct API calls)
   - Keep: Model selection logic, streaming responses

3. **Knowledge Management**
   - From: `src/backend/knowledgeManager.js`
   - To: `v2/backend-fastapi/` or `v2/mcp-server/`
   - Keep: Knowledge injection logic, file loading

4. **Configuration**
   - From: `src/config/models.json`, `src/config/pricing.json`
   - To: `v2/shared/` or backend config
   - Keep: Model definitions, pricing data

5. **System Prompt**
   - From: `data/system-prompt.md`
   - To: `v2/backend-fastapi/prompts/`
   - Keep: Prompt content

### What NOT to Port
- Node.js/Express specific code
- React development server setup
- npm package configurations (will use Rust/Python equivalents)

### New Architecture Benefits
- **Tauri**: Native desktop performance, smaller bundle size
- **FastAPI**: Better Python ecosystem for AI, async support
- **FastMCP**: Standardized tool integration, extensibility

## File Mapping

| v1 Location | v2 Location | Notes |
|------------|-------------|-------|
| `App.jsx` | `v2/frontend-tauri/src/App.tsx` | Convert to TypeScript |
| `src/backend/server.js` | `v2/backend-fastapi/main.py` | Rewrite in Python |
| `src/backend/knowledgeManager.js` | `v2/backend-fastapi/knowledge.py` | Python implementation |
| `src/config/*.json` | `v2/backend-fastapi/config/` | Python config files |
| `data/` | Keep in place | Shared between versions |

## Setup Instructions

### 1. Tauri Frontend (✅ Completed)
```bash
cd v2/frontend-tauri
npm install
npm run tauri dev  # To run in development mode
```

### 2. FastAPI Backend (Next)
```bash
cd v2/backend-fastapi
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install fastapi uvicorn openai anthropic python-dotenv
```

### 3. FastMCP Server
```bash
cd v2/mcp-server
python3 -m venv venv
source venv/bin/activate
pip install fastmcp
```

## Key Architecture Differences

1. **Frontend Communication**:
   - v1: HTTP requests to Express server
   - v2: Tauri commands + HTTP to FastAPI

2. **State Management**:
   - v1: React state + local storage
   - v2: React state + Tauri store + backend persistence

3. **AI Integration**:
   - v1: Through Express proxy
   - v2: Direct API calls from FastAPI backend

4. **Tool System**:
   - v1: Custom implementation
   - v2: MCP protocol via FastMCP