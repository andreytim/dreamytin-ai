"""
Conversation Manager for file-based storage
Handles conversation persistence using JSON files in data/conversations/
"""

import json
import os
import asyncio
from datetime import datetime
from typing import Dict, List, Optional, Any
from pathlib import Path
import aiofiles

class ConversationManager:
    def __init__(self, conversations_dir: str = None):
        """Initialize conversation manager with file-based storage"""
        if conversations_dir is None:
            # Use same data directory as v1 (relative to project root)
            base_dir = Path(__file__).parent.parent.parent.parent  # Go up to project root
            conversations_dir = base_dir / "data" / "conversations"
        
        self.conversations_dir = Path(conversations_dir)
        self.index_file = self.conversations_dir / "index.json"
        
        # Ensure directory exists
        self.conversations_dir.mkdir(parents=True, exist_ok=True)
        
        # Load index on startup
        self._index = self._load_index()
    
    def _load_index(self) -> Dict[str, Any]:
        """Load conversation index from file"""
        if not self.index_file.exists():
            return {"conversations": []}
        
        try:
            with open(self.index_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return {"conversations": []}
    
    def _save_index(self) -> None:
        """Save conversation index to file"""
        with open(self.index_file, 'w', encoding='utf-8') as f:
            json.dump(self._index, f, indent=2, ensure_ascii=False)
    
    async def create_conversation(self, session_id: str, model: str = "claude-3.5-haiku") -> Dict[str, Any]:
        """Create a new conversation"""
        now = datetime.utcnow().isoformat() + 'Z'
        
        conversation = {
            "id": session_id,
            "created_at": now,
            "updated_at": now,
            "model": model,
            "messages": []
        }
        
        # Add to index
        index_entry = {
            "id": session_id,
            "title": "New conversation",  # Will be updated with first message
            "created_at": now,
            "updated_at": now,
            "message_count": 0,
            "model": model
        }
        
        self._index["conversations"].append(index_entry)
        self._save_index()
        
        # Save conversation file
        await self._save_conversation(conversation)
        
        return conversation
    
    async def get_conversation(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Load conversation from file"""
        conversation_file = self.conversations_dir / f"{session_id}.json"
        
        if not conversation_file.exists():
            return None
        
        try:
            async with aiofiles.open(conversation_file, 'r', encoding='utf-8') as f:
                content = await f.read()
                return json.loads(content)
        except (json.JSONDecodeError, FileNotFoundError):
            return None
    
    async def _save_conversation(self, conversation: Dict[str, Any]) -> None:
        """Save conversation to file"""
        conversation_file = self.conversations_dir / f"{conversation['id']}.json"
        
        async with aiofiles.open(conversation_file, 'w', encoding='utf-8') as f:
            await f.write(json.dumps(conversation, indent=2, ensure_ascii=False))
    
    async def add_message(self, session_id: str, role: str, content: str, **kwargs) -> bool:
        """Add a message to conversation"""
        conversation = await self.get_conversation(session_id)
        if not conversation:
            return False
        
        # Create message
        message = {
            "role": role,
            "content": content,
            "timestamp": datetime.utcnow().isoformat() + 'Z'
        }
        
        # Add any additional fields (like tool_calls, tool_call_id)
        message.update(kwargs)
        
        # Add to conversation
        conversation["messages"].append(message)
        conversation["updated_at"] = message["timestamp"]
        
        # Update index
        self._update_index_entry(session_id, conversation)
        
        # Save conversation
        await self._save_conversation(conversation)
        
        return True
    
    def _update_index_entry(self, session_id: str, conversation: Dict[str, Any]) -> None:
        """Update conversation in index"""
        for i, entry in enumerate(self._index["conversations"]):
            if entry["id"] == session_id:
                # Update title based on first user message if still "New conversation"
                if entry["title"] == "New conversation" and conversation["messages"]:
                    first_user_msg = next((msg for msg in conversation["messages"] if msg["role"] == "user"), None)
                    if first_user_msg:
                        # Use first 50 characters of first user message as title
                        title = first_user_msg["content"][:50].strip()
                        if len(first_user_msg["content"]) > 50:
                            title += "..."
                        entry["title"] = title
                
                entry["updated_at"] = conversation["updated_at"]
                entry["message_count"] = len(conversation["messages"])
                entry["model"] = conversation.get("model", entry["model"])
                break
        
        self._save_index()
    
    async def list_conversations(self) -> List[Dict[str, Any]]:
        """Get list of all conversations sorted by updated_at (newest first)"""
        conversations = self._index.get("conversations", [])
        return sorted(conversations, key=lambda x: x["updated_at"], reverse=True)
    
    async def delete_conversation(self, session_id: str) -> bool:
        """Delete conversation and its file"""
        # Remove from index
        self._index["conversations"] = [
            conv for conv in self._index["conversations"] 
            if conv["id"] != session_id
        ]
        self._save_index()
        
        # Delete file
        conversation_file = self.conversations_dir / f"{session_id}.json"
        if conversation_file.exists():
            conversation_file.unlink()
            return True
        
        return False
    
    async def get_conversation_messages(self, session_id: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """Get messages for a conversation with optional limit"""
        conversation = await self.get_conversation(session_id)
        if not conversation:
            return []
        
        messages = conversation.get("messages", [])
        if limit:
            return messages[-limit:]  # Return last N messages
        
        return messages
    
    def truncate_for_context_window(self, messages: List[Dict[str, Any]], max_tokens: int) -> List[Dict[str, Any]]:
        """
        Truncate messages to fit within context window
        Strategy: Keep system prompt + recent messages + tool calls
        """
        if not messages:
            return messages
        
        # Simple approximation: ~4 characters per token
        # Keep last 80% of max_tokens worth of messages
        target_chars = int(max_tokens * 0.8 * 4)
        
        # Always keep system message if present
        result = []
        system_msg = None
        other_messages = []
        
        for msg in messages:
            if msg.get("role") == "system":
                system_msg = msg
            else:
                other_messages.append(msg)
        
        # Add system message first
        if system_msg:
            result.append(system_msg)
        
        # Add recent messages from the end until we approach token limit
        current_chars = len(json.dumps(system_msg)) if system_msg else 0
        
        # Collect messages that fit within token limit (from most recent backwards)
        messages_to_include = []
        for msg in reversed(other_messages):
            msg_chars = len(json.dumps(msg))
            if current_chars + msg_chars > target_chars and len(messages_to_include) > 0:
                break
            messages_to_include.append(msg)
            current_chars += msg_chars
        
        # Add messages in correct chronological order (reverse the reversed list)
        result.extend(reversed(messages_to_include))
        
        return result