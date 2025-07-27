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

# Tool system imports
import sys
sys.path.append('..')
from tools import tool_registry, ToolResult

# Conversation management
from .conversation_manager import ConversationManager

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
            tools=self._get_tool_definitions()
        )
        
        # Conversation sessions (deprecated - now using ConversationManager)
        self.sessions: Dict[str, List[ChatCompletionMessage]] = {}
        
        # File-based conversation manager
        self.conversation_manager = ConversationManager()
    
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
    
    def _get_tool_definitions(self) -> List[Dict[str, Any]]:
        """Get tool definitions in OpenAI function calling format"""
        tools = []
        for tool_def in tool_registry.get_definitions():
            # Convert to OpenAI function format
            function_def = {
                "type": "function",
                "function": {
                    "name": tool_def.name,
                    "description": tool_def.description,
                    "parameters": {
                        "type": "object",
                        "properties": {},
                        "required": []
                    }
                }
            }
            
            # Add parameters
            for param in tool_def.parameters:
                function_def["function"]["parameters"]["properties"][param.name] = {
                    "type": param.type,
                    "description": param.description
                }
                if param.required:
                    function_def["function"]["parameters"]["required"].append(param.name)
                if param.default is not None:
                    function_def["function"]["parameters"]["properties"][param.name]["default"] = param.default
            
            tools.append(function_def)
        
        return tools
    
    async def _execute_tool(self, tool_name: str, arguments: Dict[str, Any]) -> str:
        """Execute a tool and return formatted result"""
        result = await tool_registry.execute(tool_name, **arguments)
        
        if result.success:
            # Format successful result
            if isinstance(result.data, dict):
                return json.dumps(result.data, indent=2)
            else:
                return str(result.data)
        else:
            # Format error
            return f"Tool execution failed: {result.error}"
    
    async def create_session(self, session_id: str, model: str = None) -> None:
        """Create a new conversation session"""
        # Keep backward compatibility with in-memory sessions
        self.sessions[session_id] = []
        
        # Check if conversation already exists
        existing_conversation = await self.conversation_manager.get_conversation(session_id)
        if not existing_conversation:
            # Create new persistent conversation only if it doesn't exist
            conversation_model = model or self.agent_config.model
            await self.conversation_manager.create_conversation(session_id, conversation_model)
    
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
            await self.create_session(session_id, model_id)
        
        # Convert to LiteLLM model name for multi-provider support
        litellm_model = self._get_litellm_model_name(model_id)
        
        try:
            # Load conversation history and apply context window truncation
            conversation_messages = await self.conversation_manager.get_conversation_messages(session_id)
            
            # Apply context window handling
            model_config = self.model_config.get("models", {}).get(model_id, {})
            max_tokens = model_config.get("contextWindow", 32000)
            
            # Truncate if needed (keeping system prompt + recent messages)
            all_messages = [{"role": "system", "content": self.agent_config.instructions}]
            all_messages.extend(conversation_messages)
            all_messages.append({"role": "user", "content": message})
            
            messages = self.conversation_manager.truncate_for_context_window(all_messages, max_tokens)
            
            # Ensure we have system message
            if not messages or messages[0].get("role") != "system":
                messages.insert(0, {"role": "system", "content": self.agent_config.instructions})
            
            # Check if model supports function calling
            supports_tools = model_id.startswith("gpt") or model_id.startswith("claude")
            
            # Use LiteLLM through OpenAI client interface for multi-provider support
            completion_kwargs = {
                "model": litellm_model,
                "messages": messages,
                "stream": stream,
                "temperature": 0.7,
                "max_tokens": 4096
            }
            
            # Add tools if supported
            if supports_tools and self.agent_config.tools:
                completion_kwargs["tools"] = self.agent_config.tools
                completion_kwargs["tool_choice"] = "auto"
            
            response = await acompletion(**completion_kwargs)
            
            if stream:
                complete_content = ""
                tool_calls = []
                last_content_sent = ""
                
                async for chunk in response:
                    # Handle content
                    if chunk.choices and chunk.choices[0].delta.content:
                        content = chunk.choices[0].delta.content
                        complete_content += content
                        
                        # Stream the delta content as received
                        yield {
                            "type": "stream",
                            "content": content,
                            "model": model_id,
                            "timestamp": datetime.utcnow().isoformat()
                        }
                    
                    # Handle tool calls
                    if chunk.choices and chunk.choices[0].delta.tool_calls:
                        for tool_call_delta in chunk.choices[0].delta.tool_calls:
                            # Accumulate tool call information
                            if len(tool_calls) <= tool_call_delta.index:
                                tool_calls.append({
                                    "id": "",
                                    "type": "function",
                                    "function": {"name": "", "arguments": ""}
                                })
                            
                            tc = tool_calls[tool_call_delta.index]
                            if tool_call_delta.id:
                                tc["id"] = tool_call_delta.id
                            if tool_call_delta.function:
                                if tool_call_delta.function.name:
                                    tc["function"]["name"] = tool_call_delta.function.name
                                if tool_call_delta.function.arguments:
                                    tc["function"]["arguments"] += tool_call_delta.function.arguments
                
                # Process any tool calls
                if tool_calls:
                    # Save user message
                    await self.conversation_manager.add_message(session_id, "user", message)
                    self.sessions[session_id].append({"role": "user", "content": message})
                    
                    # Save assistant message with tool calls
                    await self.conversation_manager.add_message(
                        session_id, "assistant", complete_content or None, tool_calls=tool_calls
                    )
                    self.sessions[session_id].append({
                        "role": "assistant", 
                        "content": complete_content or None,
                        "tool_calls": tool_calls
                    })
                    
                    # Execute tools and stream results
                    for tool_call in tool_calls:
                        tool_name = tool_call["function"]["name"]
                        try:
                            arguments = json.loads(tool_call["function"]["arguments"])
                        except json.JSONDecodeError:
                            arguments = {}
                        
                        # Stream tool execution notification
                        yield {
                            "type": "tool_call",
                            "tool_name": tool_name,
                            "arguments": arguments,
                            "model": model_id,
                            "timestamp": datetime.utcnow().isoformat()
                        }
                        
                        # Execute tool
                        tool_result = await self._execute_tool(tool_name, arguments)
                        
                        # Save tool result
                        await self.conversation_manager.add_message(
                            session_id, "tool", tool_result, tool_call_id=tool_call["id"]
                        )
                        self.sessions[session_id].append({
                            "role": "tool",
                            "content": tool_result,
                            "tool_call_id": tool_call["id"]
                        })
                        
                        # Stream tool result
                        yield {
                            "type": "tool_result",
                            "tool_name": tool_name,
                            "result": tool_result,
                            "model": model_id,
                            "timestamp": datetime.utcnow().isoformat()
                        }
                    
                    # Get final response after tool execution
                    messages_with_tools = [{"role": "system", "content": self.agent_config.instructions}]
                    messages_with_tools.extend(self.sessions[session_id])
                    
                    # Build final completion kwargs with tools if model supports them
                    final_completion_kwargs = {
                        "model": litellm_model,
                        "messages": messages_with_tools,
                        "stream": True,
                        "temperature": 0.7,
                        "max_tokens": 4096
                    }
                    
                    # Add tools if supported (Anthropic requires tools param even for follow-up calls)
                    if supports_tools and self.agent_config.tools:
                        final_completion_kwargs["tools"] = self.agent_config.tools
                        final_completion_kwargs["tool_choice"] = "auto"
                    
                    # Signal that we're starting the final response
                    yield {
                        "type": "final_response_start",
                        "model": model_id,
                        "timestamp": datetime.utcnow().isoformat()
                    }
                    
                    # Continue processing until no more tool calls are needed (with safety limit)
                    max_iterations = 10  # Prevent infinite loops
                    iteration_count = 0
                    
                    while iteration_count < max_iterations:
                        final_response = await acompletion(**final_completion_kwargs)
                        
                        final_content = ""
                        final_tool_calls = []
                        
                        async for chunk in final_response:
                            # Handle content
                            if chunk.choices and chunk.choices[0].delta.content:
                                content = chunk.choices[0].delta.content
                                final_content += content
                                yield {
                                    "type": "final_stream",
                                    "content": content,
                                    "model": model_id,
                                    "timestamp": datetime.utcnow().isoformat()
                                }
                            
                            # Handle additional tool calls
                            if chunk.choices and chunk.choices[0].delta.tool_calls:
                                for tool_call_delta in chunk.choices[0].delta.tool_calls:
                                    # Accumulate tool call information
                                    if len(final_tool_calls) <= tool_call_delta.index:
                                        final_tool_calls.append({
                                            "id": "",
                                            "type": "function",
                                            "function": {"name": "", "arguments": ""}
                                        })
                                    
                                    tc = final_tool_calls[tool_call_delta.index]
                                    if tool_call_delta.id:
                                        tc["id"] = tool_call_delta.id
                                    if tool_call_delta.function:
                                        if tool_call_delta.function.name:
                                            tc["function"]["name"] = tool_call_delta.function.name
                                        if tool_call_delta.function.arguments:
                                            tc["function"]["arguments"] += tool_call_delta.function.arguments
                        
                        # Save current response
                        await self.conversation_manager.add_message(
                            session_id, "assistant", final_content or None, 
                            tool_calls=final_tool_calls if final_tool_calls else None
                        )
                        self.sessions[session_id].append({
                            "role": "assistant",
                            "content": final_content or None,
                            "tool_calls": final_tool_calls if final_tool_calls else None
                        })
                        
                        # Increment iteration counter
                        iteration_count += 1
                        
                        # If no more tool calls, we're done
                        if not final_tool_calls:
                            break
                            
                        # Execute additional tool calls
                        for tool_call in final_tool_calls:
                            tool_name = tool_call["function"]["name"]
                            try:
                                arguments = json.loads(tool_call["function"]["arguments"])
                            except json.JSONDecodeError:
                                arguments = {}
                            
                            # Stream tool execution notification
                            yield {
                                "type": "tool_call",
                                "tool_name": tool_name,
                                "arguments": arguments,
                                "model": model_id,
                                "timestamp": datetime.utcnow().isoformat()
                            }
                            
                            # Execute tool
                            tool_result = await self._execute_tool(tool_name, arguments)
                            
                            # Save tool result
                            await self.conversation_manager.add_message(
                                session_id, "tool", tool_result, tool_call_id=tool_call["id"]
                            )
                            self.sessions[session_id].append({
                                "role": "tool",
                                "content": tool_result,
                                "tool_call_id": tool_call["id"]
                            })
                            
                            # Stream tool result
                            yield {
                                "type": "tool_result",
                                "tool_name": tool_name,
                                "result": tool_result,
                                "model": model_id,
                                "timestamp": datetime.utcnow().isoformat()
                            }
                        
                        # Update messages for next iteration
                        messages_with_tools = [{"role": "system", "content": self.agent_config.instructions}]
                        messages_with_tools.extend(self.sessions[session_id])
                    
                    # Check if we hit the iteration limit
                    if iteration_count >= max_iterations:
                        yield {
                            "type": "error",
                            "error": f"Maximum tool execution iterations ({max_iterations}) reached. Stopping to prevent infinite loop.",
                            "model": model_id,
                            "timestamp": datetime.utcnow().isoformat()
                        }
                else:
                    # No tool calls, save user and assistant messages
                    await self.conversation_manager.add_message(session_id, "user", message)
                    await self.conversation_manager.add_message(session_id, "assistant", complete_content)
                    self.sessions[session_id].append({"role": "user", "content": message})
                    self.sessions[session_id].append({"role": "assistant", "content": complete_content})
                
                yield {
                    "type": "stream_end",
                    "model": model_id,
                    "timestamp": datetime.utcnow().isoformat()
                }
            else:
                content = response.choices[0].message.content
                await self.conversation_manager.add_message(session_id, "user", message)
                await self.conversation_manager.add_message(session_id, "assistant", content)
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