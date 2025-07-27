# DreamyTin AI v2 Backend - FastAPI

Complete backend implementation with frontend integration (Phases 1-3 completed).

## Setup

1. **Create virtual environment:**
```bash
cd v2/backend-fastapi
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. **Install dependencies:**
```bash
pip install -r requirements.txt
```

3. **Environment configuration:**
```bash
# Uses root .env file automatically (../../.env)
# Ensure it has: OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_API_KEY
```

## Running

```bash
# Development server
python main.py

# Or with uvicorn directly
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## API Endpoints

- `GET /` - Root endpoint
- `GET /health` - Health check
- `GET /models` - Available models
- `WebSocket /ws/{client_id}` - Chat streaming

## Features Implemented

### ✅ Phase 1: Core Backend
- FastAPI server with CORS
- Health check endpoint  
- WebSocket streaming endpoint
- OpenAI Agents SDK integration
- LiteLLM multi-provider support (OpenAI, Anthropic, Google)
- Session management
- Proper error handling

### ✅ Phase 2: Tool System
- Custom tool framework with base classes
- Tool registry system for dynamic tool discovery
- Implemented tools:
  - `ls` - List directory contents with filtering
  - `read_file` - Read file contents with encoding support
- Tool integration with OpenAI function calling
- Error handling and validation for tool execution

### ✅ Phase 3: Frontend Integration
- WebSocket message protocol for streaming
- Tool call and result streaming to frontend
- Recursive tool calling support (agent can use tools multiple times)
- Model selection endpoint with dynamic configuration
- Connection status management
- Error propagation to frontend

## Architecture

```
app/
├── main.py              # FastAPI app setup and WebSocket handling
├── agent.py             # OpenAI Agents SDK integration and LiteLLM
├── tools/
│   ├── __init__.py      # Tool registry and base classes
│   ├── ls.py            # Directory listing tool
│   └── read_file.py     # File reading tool
└── config.py            # Configuration management
```

## Adding New Tools

1. Create tool in `app/tools/your_tool.py`:
```python
from app.tools import BaseTool, ToolResult

class YourTool(BaseTool):
    name = "your_tool"
    description = "Tool description"
    
    async def execute(self, **kwargs) -> ToolResult:
        # Implementation
        return ToolResult(content="result", path=kwargs.get("path"))
```

2. Tool auto-registers via `__init__.py` import

## Next Steps (Phase 4+)

- Conversation history persistence
- Knowledge base integration  
- Usage tracking and cost calculation
- Advanced agent features