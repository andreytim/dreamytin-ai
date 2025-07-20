# DreamyTin AI v2 - Architecture Rewrite

## New Stack
- **Frontend**: Tauri (Rust + Web technologies)
- **Backend**: FastAPI (Python) with direct OpenAI/Anthropic API calls
- **MCP Server**: FastMCP for tool integration
- **Shared**: TypeScript types and interfaces

## Directory Structure
```
v2/
├── frontend-tauri/     # Tauri desktop app
├── backend-fastapi/    # Python FastAPI server
├── mcp-server/         # FastMCP server
└── shared/             # Shared types and utilities
```

## Migration Status
- [x] Tauri frontend scaffold initialized
- [ ] FastAPI backend structure
- [ ] FastMCP server structure
- [ ] Core chat functionality
- [ ] Multi-provider support (OpenAI, Anthropic)
- [ ] Knowledge management system
- [ ] Conversation history
- [ ] Settings and configuration
- [ ] MCP tool integration

## Progress Notes

### Tauri Frontend (Completed)
- Created React + TypeScript + Vite setup
- Configured Tauri with Rust backend
- Basic project structure with:
  - `package.json` with all dependencies
  - `vite.config.ts` for build configuration
  - `tsconfig.json` for TypeScript
  - `src-tauri/` with Rust backend and Tauri config
  - Basic React app structure in `src/`

### Next Steps
1. Set up FastAPI backend with:
   - Virtual environment
   - FastAPI + Uvicorn
   - OpenAI and Anthropic client libraries
   - CORS configuration for Tauri frontend
   
2. Set up FastMCP server:
   - Install FastMCP framework
   - Create basic tool structure
   - Configure MCP protocol handlers