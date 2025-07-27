# DreamyTin AI v2 - Tauri Desktop App

## Quick Start

**Prerequisites**: Node.js (v18+), Rust, Python 3.9+

```bash
# Frontend (Tauri)
cd v2/frontend-tauri
npm install
npm run tauri dev    # Development mode
npm run tauri build  # Production build

# Backend (FastAPI)
cd v2/backend-fastapi
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py  # or: uvicorn main:app --reload
```

## Architecture

- **Frontend**: Tauri (React + TypeScript) native desktop app
- **Backend**: FastAPI with OpenAI Agents SDK for agentic AI loops
- **AI Providers**: OpenAI, Anthropic, Google Gemini via LiteLLM
- **Tools**: Custom implementation (ls, file_read, more coming)
- **Config**: Shared model settings in `shared/config/models.json`

## Tech Stack

### Frontend (✅ Complete)
- Tauri 1.x - Native desktop runtime
- React 18 with TypeScript
- CSS modules for styling (no Tailwind - simplified)
- WebSocket for streaming responses
- Component architecture (Chat/Canvas separation)

### Backend (✅ Phase 1-3 Complete)
- FastAPI - Modern async Python web framework
- OpenAI Agents SDK - Production-ready agent framework
- LiteLLM - Unified interface for multiple AI providers
- WebSockets - Real-time streaming
- Custom tool system with registry

## Migration Status

### ✅ Completed
- [x] Tauri frontend with complete chat interface
- [x] UI/UX migrated from v1 with TypeScript
- [x] Model selection dropdown (all providers)
- [x] Usage tracking display
- [x] App icon and window management
- [x] Shared configuration structure

### ✅ Completed (Backend Integration - Phases 1, 2 & 3)
- [x] FastAPI server setup with health checks
- [x] OpenAI Agents SDK integration
- [x] LiteLLM adapter for multi-provider support
- [x] WebSocket streaming implementation
- [x] Session management and error handling
- [x] Tool framework with base classes and registry
- [x] ls and read_file tools implementation
- [x] Tool integration with agent (function calling)
- [x] Frontend-backend WebSocket integration
- [x] Real-time streaming and tool call display
- [x] Dynamic model selection from backend
- [x] Connection status and error handling
- [x] Tool result visualization in tabbed interface
- [x] Clean component architecture with TypeScript types
- [x] Responsive UI with proper header alignment

### 📋 Planned (Phase 4+)
- [ ] Conversation history management  
- [ ] Knowledge base integration
- [ ] Session persistence (SQLite)
- [ ] Usage tracking and cost calculation
- [ ] Advanced agent features

## Key Improvements from v1
- **Native Performance**: Tauri provides native app performance
- **Unified Agent Framework**: Consistent behavior across all AI providers
- **Better Streaming**: WebSocket-based streaming for all providers
- **Type Safety**: Full TypeScript in frontend
- **Modern Python**: Async/await throughout backend

## Development Guide

See `MIGRATION_GUIDE.md` for:
- Detailed architecture decisions
- Phased implementation plan
- Setup instructions
- Migration notes from v1