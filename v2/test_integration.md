# Phase 3 Integration Test Plan

## Prerequisites
1. Backend running: `npm run dev:backend-v2` (or `cd v2/backend-fastapi && ./run.sh`)
2. Frontend running: `cd v2/frontend-tauri && npm run tauri dev`

## Test Cases

### 1. Connection Test
- [ ] Frontend shows "Connecting..." then "●" (green dot) when backend is running
- [ ] Frontend shows "○" (gray dot) when backend is down
- [ ] Connection status updates in real-time

### 2. Basic Chat Test
- [ ] Send a simple message like "Hello"
- [ ] Verify streaming response appears character by character
- [ ] Check browser console for WebSocket messages

### 3. Model Selection Test
- [ ] Backend `/models` endpoint returns available models
- [ ] Frontend dropdown shows dynamic models (not just static config)
- [ ] Changing model resets conversation

### 4. Tool Usage Test
- [ ] Send: "List files in the current directory"
- [ ] Should trigger `ls` tool call
- [ ] Verify tool call and result display in UI

### 5. Error Handling Test
- [ ] Stop backend while frontend is running
- [ ] Verify reconnection attempts every 3 seconds
- [ ] Send message shows "Disconnected" button state

## Expected WebSocket Messages

### Basic Chat:
```json
{"type": "stream", "content": "Hello", "model": "claude-3.5-haiku", "timestamp": "..."}
{"type": "stream_end", "model": "claude-3.5-haiku", "timestamp": "..."}
```

### Tool Usage:
```json
{"type": "tool_call", "tool_name": "ls", "arguments": {"path": "."}, "model": "claude-3.5-haiku", "timestamp": "..."}
{"type": "tool_result", "tool_name": "ls", "result": "...", "model": "claude-3.5-haiku", "timestamp": "..."}
{"type": "stream", "content": "I can see the following files...", "model": "claude-3.5-haiku", "timestamp": "..."}
```