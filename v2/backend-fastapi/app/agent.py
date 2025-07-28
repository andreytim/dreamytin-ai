"""
OpenAI Agents SDK integration with LiteLLM for multi-provider support
"""
import os
from typing import Optional, AsyncIterator, Dict, Any, List
from datetime import datetime
import json
from dataclasses import dataclass

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
        
        # Agent configuration
        self.agent_config = AgentConfig(
            instructions=self.system_prompt,
            model=self.model_config.get("defaultModel", "claude-3.5-haiku"),
            tools=self._get_tool_definitions()
        )
        
        # Conversation sessions (removed - now using ConversationManager exclusively)
        # self.sessions: Dict[str, List[ChatCompletionMessage]] = {}
        
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
    
    def _format_messages_for_api(self, messages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Format conversation messages for LiteLLM API compatibility"""
        formatted_messages = []
        
        for msg in messages:
            # Create a copy to avoid modifying the original
            formatted_msg = {
                "role": msg["role"],
                "content": msg.get("content", "")
            }
            
            # Handle tool calls in assistant messages
            if msg["role"] == "assistant" and "tool_calls" in msg:
                formatted_msg["tool_calls"] = msg["tool_calls"]
                # If content is None/empty for tool calls, set it to empty string
                if not formatted_msg["content"]:
                    formatted_msg["content"] = ""
            
            # Handle tool results
            elif msg["role"] == "tool":
                formatted_msg["tool_call_id"] = msg.get("tool_call_id")
                # Ensure content is a string
                if not isinstance(formatted_msg["content"], str):
                    formatted_msg["content"] = str(formatted_msg["content"])
            
            # Remove timestamp and other metadata fields that aren't part of the API spec
            formatted_messages.append(formatted_msg)
        
        # Validate message sequence for Anthropic compatibility
        # Ensure every assistant message with tool_calls is followed by corresponding tool messages
        self._validate_tool_message_sequence(formatted_messages)
        
        return formatted_messages
    
    def _validate_tool_message_sequence(self, messages: List[Dict[str, Any]]) -> None:
        """Validate that tool_use messages are properly followed by tool_result messages"""
        i = 0
        while i < len(messages):
            msg = messages[i]
            
            # Check if this is an assistant message with tool calls
            if (msg["role"] == "assistant" and 
                msg.get("tool_calls") and 
                len(msg["tool_calls"]) > 0):
                
                tool_call_ids = {tc["id"] for tc in msg["tool_calls"]}
                found_tool_results = set()
                
                # Look ahead for corresponding tool result messages
                j = i + 1
                while j < len(messages) and messages[j]["role"] == "tool":
                    tool_result_id = messages[j].get("tool_call_id")
                    if tool_result_id in tool_call_ids:
                        found_tool_results.add(tool_result_id)
                    j += 1
                
                # Check if all tool calls have corresponding results
                missing_results = tool_call_ids - found_tool_results
                if missing_results:
                    # Log warning but don't add placeholder - this indicates a bug
                    print(f"WARNING: Missing tool results for tool_call_ids: {missing_results}")
                    # Add placeholder tool results for missing ones (for API compatibility)
                    for missing_id in missing_results:
                        placeholder_result = {
                            "role": "tool",
                            "tool_call_id": missing_id,
                            "content": "Tool execution result not available"
                        }
                        # Insert after the assistant message but before any existing tool messages
                        insert_index = i + 1
                        while (insert_index < len(messages) and 
                               messages[insert_index]["role"] == "tool" and
                               messages[insert_index].get("tool_call_id") in tool_call_ids):
                            insert_index += 1
                        messages.insert(insert_index, placeholder_result)
            
            i += 1
    
    def _convert_stored_messages_to_frontend_format(self, stored_messages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Convert stored conversation messages to frontend-compatible format"""
        frontend_messages = []
        
        for msg in stored_messages:
            # Handle regular user and assistant messages
            if msg["role"] in ["user", "assistant"]:
                # Check if assistant message has tool calls
                if msg["role"] == "assistant" and msg.get("tool_calls"):
                    # Add the assistant message first (if it has content)
                    if msg.get("content"):
                        frontend_messages.append({
                            "role": "assistant",
                            "content": msg["content"]
                        })
                    
                    # Convert each tool call to frontend format
                    for tool_call in msg["tool_calls"]:
                        tool_name = tool_call["function"]["name"]
                        frontend_messages.append({
                            "role": "tool",
                            "content": f"🔧 {tool_name}",
                            "toolName": tool_name,
                            "toolResult": None  # Will be updated when we find the result
                        })
                else:
                    # Regular user or assistant message
                    frontend_messages.append({
                        "role": msg["role"],
                        "content": msg.get("content", "")
                    })
            
            # Handle tool result messages
            elif msg["role"] == "tool":
                # Find the corresponding tool message and update it with the result
                tool_call_id = msg.get("tool_call_id")
                if tool_call_id:
                    # Look for the most recent tool message without a result
                    for i in range(len(frontend_messages) - 1, -1, -1):
                        frontend_msg = frontend_messages[i]
                        if (frontend_msg["role"] == "tool" and 
                            frontend_msg.get("toolResult") is None):
                            frontend_messages[i] = {
                                **frontend_msg,
                                "toolResult": msg["content"]
                            }
                            break
        
        return frontend_messages
    
    
    def _detect_repetitive_tool_pattern(self, current_tool_calls: List[Dict[str, Any]], executed_tool_calls: Dict[str, str]) -> bool:
        """
        Detect if the current tool calls represent a repetitive pattern that suggests infinite looping.
        Returns True if repetitive pattern is detected.
        """
        if not current_tool_calls:
            return False
        
        # Check if all current tool calls are already in the executed cache
        all_cached = True
        for tool_call in current_tool_calls:
            tool_name = tool_call["function"]["name"]
            try:
                arguments = json.loads(tool_call["function"]["arguments"])
            except json.JSONDecodeError:
                arguments = {}
            
            tool_key = (tool_name, json.dumps(arguments, sort_keys=True))
            if tool_key not in executed_tool_calls:
                all_cached = False
                break
        
        # If all tool calls are cached and we're still making them, it's repetitive
        if all_cached:
            tool_names = [tc["function"]["name"] for tc in current_tool_calls]
            print(f"DEBUG: Detected repetitive pattern - all {len(current_tool_calls)} tool calls ({tool_names}) are cached")
            return True
        
        return False
    
    async def _execute_tool_loop(
        self,
        initial_content: str,
        initial_tool_calls: List[Dict[str, Any]],
        executed_tool_calls: Dict[str, str],
        session_id: str,
        model_id: str,
        litellm_model: str,
        supports_tools: bool
    ) -> AsyncIterator[Dict[str, Any]]:
        """
        Execute the proper tool execution loop:
        1. Save assistant message with tool calls
        2. Execute each tool call  
        3. Feed results back to agent for analysis
        4. If agent wants more tools, repeat; otherwise provide final response
        """
        
        # Save initial assistant message with tool calls
        await self.conversation_manager.add_message(
            session_id, "assistant", initial_content or None, tool_calls=initial_tool_calls
        )
        
        # Execute initial tool calls
        for tool_call in initial_tool_calls:
            async for result in self._execute_tool_with_dedup(
                tool_call, executed_tool_calls, session_id, model_id
            ):
                yield result
        
        # Now enter the iterative loop: ask agent what to do next
        max_iterations = 10
        iteration_count = 0
        
        while iteration_count < max_iterations:
            iteration_count += 1
            
            # Load current conversation with all tool results
            current_messages = await self.conversation_manager.get_conversation_messages(session_id)
            messages_for_agent = [{"role": "system", "content": self.agent_config.instructions}]
            messages_for_agent.extend(current_messages)
            
            # Format messages for API compatibility
            messages_for_agent = self._format_messages_for_api(messages_for_agent)
            
            # Ask the agent: "Given these tool results, what do you want to do next?"
            completion_kwargs = {
                "model": litellm_model,
                "messages": messages_for_agent,
                "stream": True,
                "temperature": 0.7,
                "max_tokens": 4096
            }
            
            # Add tools if supported - let agent decide if it needs more tools
            if supports_tools and self.agent_config.tools:
                completion_kwargs["tools"] = self.agent_config.tools
                completion_kwargs["tool_choice"] = "auto"
            
            # Signal that we're starting a new agent response
            yield {
                "type": "final_response_start",
                "model": model_id,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            # Get agent's response
            response = await acompletion(**completion_kwargs)
            
            response_content = ""
            response_tool_calls = []
            
            # Stream the agent's response
            async for chunk in response:
                # Handle content
                if chunk.choices and chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    response_content += content
                    yield {
                        "type": "final_stream",
                        "content": content,
                        "model": model_id,
                        "timestamp": datetime.utcnow().isoformat()
                    }
                
                # Handle tool calls
                if chunk.choices and chunk.choices[0].delta.tool_calls:
                    for tool_call_delta in chunk.choices[0].delta.tool_calls:
                        # Accumulate tool call information
                        if len(response_tool_calls) <= tool_call_delta.index:
                            response_tool_calls.append({
                                "id": "",
                                "type": "function", 
                                "function": {"name": "", "arguments": ""}
                            })
                        
                        tc = response_tool_calls[tool_call_delta.index]
                        if tool_call_delta.id:
                            tc["id"] = tool_call_delta.id
                        if tool_call_delta.function:
                            if tool_call_delta.function.name:
                                tc["function"]["name"] = tool_call_delta.function.name
                            if tool_call_delta.function.arguments:
                                tc["function"]["arguments"] += tool_call_delta.function.arguments
            
            # Save the agent's response
            await self.conversation_manager.add_message(
                session_id, "assistant", response_content or None, 
                tool_calls=response_tool_calls if response_tool_calls else None
            )
            
            # If no tool calls, agent is done - break the loop
            if not response_tool_calls:
                break
            
            # Check for repetitive patterns (safety)
            if self._detect_repetitive_tool_pattern(response_tool_calls, executed_tool_calls):
                print(f"DEBUG: Breaking loop at iteration {iteration_count} - detected repetitive pattern")
                break
            
            # Execute the new tool calls
            for tool_call in response_tool_calls:
                async for result in self._execute_tool_with_dedup(
                    tool_call, executed_tool_calls, session_id, model_id
                ):
                    yield result
        
        # Safety check for max iterations
        if iteration_count >= max_iterations:
            yield {
                "type": "error",
                "error": f"Maximum tool execution iterations ({max_iterations}) reached.",
                "model": model_id,
                "timestamp": datetime.utcnow().isoformat()
            }
        
        # Don't send stream_end here - let the main process_message method handle it
    
    async def _execute_tool_with_dedup(
        self,
        tool_call: Dict[str, Any],
        executed_tool_calls: Dict[str, str],  # Changed to dict to store results
        session_id: str,
        model_id: str
    ) -> AsyncIterator[Dict[str, Any]]:
        """Execute a tool with deduplication check and yield results"""
        tool_name = tool_call["function"]["name"]
        try:
            arguments = json.loads(tool_call["function"]["arguments"])
        except json.JSONDecodeError:
            arguments = {}
        
        # Create a hashable key for deduplication
        tool_key = (tool_name, json.dumps(arguments, sort_keys=True))
        
        # Check if this exact tool call was already executed
        if tool_key in executed_tool_calls:
            # Use the original result instead of a "skipped" message
            original_result = executed_tool_calls[tool_key]
            
            # Save the original result for this tool call
            await self.conversation_manager.add_message(
                session_id, "tool", original_result, 
                tool_call_id=tool_call["id"]
            )
            
            yield {
                "type": "tool_skipped",
                "tool_name": tool_name,
                "reason": "Duplicate tool call - using cached result",
                "result": original_result,
                "model": model_id,
                "timestamp": datetime.utcnow().isoformat()
            }
            return
        
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
        
        # Store result for future deduplication
        executed_tool_calls[tool_key] = tool_result
        
        # Save tool result
        await self.conversation_manager.add_message(
            session_id, "tool", tool_result, tool_call_id=tool_call["id"]
        )
        
        # Stream tool result
        yield {
            "type": "tool_result",
            "tool_name": tool_name,
            "result": tool_result,
            "model": model_id,
            "timestamp": datetime.utcnow().isoformat()
        }
    
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
        model_id: Optional[str] = None,
        stream: bool = True
    ) -> AsyncIterator[Dict[str, Any]]:
        """Process a message using OpenAI Agents SDK and return streaming response"""
        
        # Use default model if not specified
        if not model_id:
            model_id = self.agent_config.model
        
        # Create session if it doesn't exist
        existing_conversation = await self.conversation_manager.get_conversation(session_id)
        if not existing_conversation:
            await self.create_session(session_id, model_id)
        
        # Convert to LiteLLM model name for multi-provider support
        litellm_model = self._get_litellm_model_name(model_id)
        
        # Track executed tool calls to prevent duplicates (store results for caching)
        executed_tool_calls = {}
        
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
            
            # Format messages for API compatibility
            messages = self._format_messages_for_api(messages)
            
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
                
                # Process any tool calls using the proper iterative approach
                if tool_calls:
                    # Save user message
                    await self.conversation_manager.add_message(session_id, "user", message)
                    
                    # Execute the proper tool execution loop
                    async for result in self._execute_tool_loop(
                        complete_content, tool_calls, executed_tool_calls, 
                        session_id, model_id, litellm_model, supports_tools
                    ):
                        yield result
                else:
                    # No tool calls, save user and assistant messages
                    await self.conversation_manager.add_message(session_id, "user", message)
                    await self.conversation_manager.add_message(session_id, "assistant", complete_content)
                
                yield {
                    "type": "stream_end",
                    "model": model_id,
                    "timestamp": datetime.utcnow().isoformat()
                }
            else:
                content = response.choices[0].message.content
                await self.conversation_manager.add_message(session_id, "user", message)
                await self.conversation_manager.add_message(session_id, "assistant", content)
                
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
    
    async def get_conversation_for_frontend(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get conversation data formatted for frontend consumption"""
        conversation = await self.conversation_manager.get_conversation(session_id)
        if not conversation:
            return None
        
        # Convert stored messages to frontend format
        frontend_messages = self._convert_stored_messages_to_frontend_format(
            conversation.get("messages", [])
        )
        
        return {
            **conversation,
            "messages": frontend_messages
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