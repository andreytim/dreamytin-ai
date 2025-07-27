# DreamyTin AI v2 Backend - FastAPI

Phase 1 implementation of the FastAPI backend with OpenAI Agents SDK integration.

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

## Features Implemented (Phase 1)

✅ FastAPI server with CORS  
✅ Health check endpoint  
✅ WebSocket streaming endpoint  
✅ OpenAI Agents SDK integration  
✅ LiteLLM multi-provider support  
✅ Session management  
✅ Proper error handling  

## Next Steps (Phase 2)

- Tool framework implementation
- `ls` and `read_file` tools
- Tool execution handling