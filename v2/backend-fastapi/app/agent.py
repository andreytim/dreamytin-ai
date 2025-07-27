"""
OpenAI Agents SDK integration with LiteLLM for multi-provider support
"""
import os
from typing import Optional, AsyncIterator, Dict, Any, List
from datetime import datetime
import json
import asyncio
from dataclasses import dataclass

# OpenAI Agents SDK imports
from openai import AsyncOpenAI
from openai.types.chat import ChatCompletionMessage

# LiteLLM for multi-provider support
from litellm import acompletion
import litellm

# Configure LiteLLM
litellm.set_verbose = False

@dataclass
class AgentConfig:
    """Agent configuration"""
    name: str = "DreamyTin AI"
    instructions: str = ""
    model: str = "claude-3.5-haiku"
    tools: List[Dict[str, Any]] = None

class DreamyTinAgent:
    """Main agent class using OpenAI Agents SDK with LiteLLM for multi-provider support"""
    
    def __init__(self):
        self.system_prompt = self._load_system_prompt()
        self.model_config = self._load_model_config()
        
        # Set API keys
        self.api_keys = {
            "openai": os.getenv("OPENAI_API_KEY"),
            "anthropic": os.getenv("ANTHROPIC_API_KEY"),
            "gemini": os.getenv("GOOGLE_API_KEY")
        }
        
        # Configure LiteLLM with API keys
        if self.api_keys["openai"]:
            litellm.openai_key = self.api_keys["openai"]
        if self.api_keys["anthropic"]:
            litellm.anthropic_key = self.api_keys["anthropic"]
        if self.api_keys["gemini"]:
            litellm.gemini_key = self.api_keys["gemini"]
        
        # Initialize OpenAI client for agent functionality
        self.openai_client = AsyncOpenAI(api_key=self.api_keys["openai"]) if self.api_keys["openai"] else None
        
        # Agent configuration
        self.agent_config = AgentConfig(
            name="DreamyTin AI",
            instructions=self.system_prompt,
            model=self.model_config.get("defaultModel", "claude-3.5-haiku"),
            tools=[]  # Will be populated with tools in Phase 2
        )
        
        # Conversation sessions
        self.sessions: Dict[str, List[ChatCompletionMessage]] = {}
    
    def _load_system_prompt(self) -> str:
        """Load system prompt from file"""
        prompt_path = "../../data/system-prompt.md"
        if os.path.exists(prompt_path):
            with open(prompt_path, 'r') as f:
                return f.read()
        return "You are DreamyTin AI, a helpful personal assistant."
    
    def _load_model_config(self) -> Dict[str, Any]:
        """Load model configuration"""
        config_path = "../shared/config/models.json"
        if os.path.exists(config_path):
            with open(config_path, 'r') as f:
                return json.load(f)
        return {
            "defaultModel": "claude-3.5-haiku",
            "models": {}
        }
    
    def _get_litellm_model_name(self, model_id: str) -> str:
        """Convert model ID to LiteLLM format using actual model names from config"""
        # Get the actual model name from config
        model_info = self.model_config.get("models", {}).get(model_id, {})
        model_name = model_info.get("name", model_id)
        provider = model_info.get("provider", "").lower()
        
        # Format for LiteLLM based on provider
        if provider == "google":
            # Google models need "gemini/" prefix in LiteLLM
            return f"gemini/{model_name}"
        else:
            # OpenAI and Anthropic models use their names directly
            return model_name
    
    async def create_session(self, session_id: str) -> None:
        """Create a new conversation session"""
        self.sessions[session_id] = []
    
    async def process_message(
        self,
        message: str,
        session_id: str = "default",
        conversation_history: Optional[list] = None,
        model_id: Optional[str] = None,
        stream: bool = True
    ) -> AsyncIterator[Dict[str, Any]]:
        """Process a message using OpenAI Agents SDK and return streaming response"""
        
        # Use default model if not specified
        if not model_id:
            model_id = self.agent_config.model
        
        # Create session if it doesn't exist
        if session_id not in self.sessions:
            await self.create_session(session_id)
        
        # Convert to LiteLLM model name for multi-provider support
        litellm_model = self._get_litellm_model_name(model_id)
        
        try:
            # Build messages for agent
            messages = [{"role": "system", "content": self.agent_config.instructions}]
            messages.extend(self.sessions[session_id])
            messages.append({"role": "user", "content": message})
            
            # Use LiteLLM through OpenAI client interface for multi-provider support
            response = await acompletion(
                model=litellm_model,
                messages=messages,
                stream=stream,
                temperature=0.7,
                max_tokens=4096
            )
            
            if stream:
                complete_content = ""
                async for chunk in response:
                    if chunk.choices and chunk.choices[0].delta.content:
                        content = chunk.choices[0].delta.content
                        complete_content += content
                        yield {
                            "type": "stream",
                            "content": content,
                            "model": model_id,
                            "timestamp": datetime.utcnow().isoformat()
                        }
                
                # Add to session history
                self.sessions[session_id].append({"role": "user", "content": message})
                self.sessions[session_id].append({"role": "assistant", "content": complete_content})
                
                yield {
                    "type": "stream_end",
                    "model": model_id,
                    "timestamp": datetime.utcnow().isoformat()
                }
            else:
                content = response.choices[0].message.content
                self.sessions[session_id].append({"role": "user", "content": message})
                self.sessions[session_id].append({"role": "assistant", "content": content})
                
                yield {
                    "type": "message",
                    "content": content,
                    "model": model_id,
                    "timestamp": datetime.utcnow().isoformat()
                }
                
        except Exception as e:
            yield {
                "type": "error",
                "error": f"Agent processing error: {str(e)}",
                "model": model_id,
                "timestamp": datetime.utcnow().isoformat()
            }
    
    def get_available_models(self) -> Dict[str, Any]:
        """Return available models based on configured API keys"""
        available = {}
        
        # Check which providers have API keys
        providers = {
            "openai": bool(self.api_keys["openai"]),
            "anthropic": bool(self.api_keys["anthropic"]),
            "google": bool(self.api_keys["gemini"])
        }
        
        # Filter models based on available providers
        for model_id, model_info in self.model_config.get("models", {}).items():
            provider = model_info.get("provider", "").lower()
            if providers.get(provider, False):
                available[model_id] = model_info
        
        return {
            "defaultModel": self.model_config.get("defaultModel"),
            "models": available,
            "providers": providers
        }