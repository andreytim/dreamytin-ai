"""
DreamyTin AI v2 Backend - FastAPI Server
"""
import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import asyncio
from typing import Dict, Optional, List
import json
from datetime import datetime
from dotenv import load_dotenv
from app.agent import DreamyTinAgent

# Load environment variables from root directory
load_dotenv("../../.env")

# Initialize agent
agent = DreamyTinAgent()

# Initialize FastAPI app
app = FastAPI(
    title="DreamyTin AI Backend",
    version="0.0.2",
    description="Personal AI assistant with multi-provider support"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:1420", "tauri://localhost"],  # Tauri app origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]

    async def send_message(self, message: str, client_id: str):
        if client_id in self.active_connections:
            await self.active_connections[client_id].send_text(message)

    async def send_json(self, data: dict, client_id: str):
        if client_id in self.active_connections:
            await self.active_connections[client_id].send_json(data)

manager = ConnectionManager()

@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "DreamyTin AI Backend v2", "status": "running"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "0.0.2",
        "services": {
            "api": "running",
            "websocket": "ready"
        }
    }

@app.get("/models")
async def get_models():
    """Get available models"""
    return agent.get_available_models()

# Conversation management endpoints
@app.get("/conversations")
async def list_conversations():
    """Get list of all conversations"""
    try:
        conversations = await agent.conversation_manager.list_conversations()
        return {"conversations": conversations}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/conversations")
async def create_conversation(request: dict):
    """Create a new conversation"""
    try:
        session_id = request.get("session_id")
        model = request.get("model", "claude-3.5-haiku")
        
        if not session_id:
            raise HTTPException(status_code=400, detail="session_id is required")
        
        conversation = await agent.conversation_manager.create_conversation(session_id, model)
        return conversation
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/conversations/{session_id}")
async def get_conversation(session_id: str):
    """Get conversation details and messages"""
    try:
        conversation = await agent.conversation_manager.get_conversation(session_id)
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        return conversation
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/conversations/{session_id}")
async def delete_conversation(session_id: str):
    """Delete a conversation"""
    try:
        success = await agent.conversation_manager.delete_conversation(session_id)
        if not success:
            raise HTTPException(status_code=404, detail="Conversation not found")
        return {"message": "Conversation deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    """WebSocket endpoint for streaming chat responses"""
    await manager.connect(websocket, client_id)
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_json()
            message = data.get('message', '')
            model_id = data.get('model')
            
            if not message:
                await manager.send_json({
                    "type": "error",
                    "error": "Message cannot be empty"
                }, client_id)
                continue
            
            # Process message with agent and stream response
            try:
                async for response_chunk in agent.process_message(
                    message=message,
                    session_id=client_id,
                    model_id=model_id,
                    stream=True
                ):
                    await manager.send_json(response_chunk, client_id)
                
            except Exception as e:
                await manager.send_json({
                    "type": "error",
                    "error": f"Agent processing error: {str(e)}",
                    "timestamp": datetime.utcnow().isoformat()
                }, client_id)
            
    except WebSocketDisconnect:
        manager.disconnect(client_id)
        print(f"Client {client_id} disconnected")
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(client_id)
        await manager.send_json({
            "type": "error",
            "error": f"Connection error: {str(e)}",
            "timestamp": datetime.utcnow().isoformat()
        }, client_id)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)