"""
DreamyTin AI v2 Backend - FastAPI Server
"""
import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
from typing import Dict, Optional
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

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    """WebSocket endpoint for streaming chat responses"""
    await manager.connect(websocket, client_id)
    conversation_history = []
    
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