from typing import Dict, List, Optional, Type
from .base import BaseTool, ToolDefinition, ToolResult
import logging

logger = logging.getLogger(__name__)


class ToolRegistry:
    """Registry for managing available tools."""
    
    def __init__(self):
        self._tools: Dict[str, BaseTool] = {}
    
    def register(self, tool: BaseTool) -> None:
        """Register a tool instance."""
        if tool.name in self._tools:
            logger.warning(f"Tool '{tool.name}' is already registered. Overwriting.")
        
        self._tools[tool.name] = tool
        logger.info(f"Registered tool: {tool.name}")
    
    def register_class(self, tool_class: Type[BaseTool]) -> None:
        """Register a tool class (instantiates it)."""
        tool = tool_class()
        self.register(tool)
    
    def get(self, name: str) -> Optional[BaseTool]:
        """Get a tool by name."""
        return self._tools.get(name)
    
    def list_tools(self) -> List[str]:
        """List all registered tool names."""
        return list(self._tools.keys())
    
    def get_definitions(self) -> List[ToolDefinition]:
        """Get all tool definitions."""
        return [tool.get_definition() for tool in self._tools.values()]
    
    async def execute(self, tool_name: str, **kwargs) -> ToolResult:
        """Execute a tool by name with the given parameters."""
        tool = self.get(tool_name)
        if not tool:
            return ToolResult(
                success=False,
                error=f"Tool '{tool_name}' not found"
            )
        
        try:
            # Validate parameters
            validated_params = tool.validate_parameters(kwargs)
            
            # Execute the tool
            result = await tool.execute(**validated_params)
            return result
            
        except ValueError as e:
            return ToolResult(
                success=False,
                error=f"Parameter validation failed: {str(e)}"
            )
        except Exception as e:
            logger.error(f"Error executing tool '{tool_name}': {str(e)}")
            return ToolResult(
                success=False,
                error=f"Tool execution failed: {str(e)}"
            )
    
    def clear(self) -> None:
        """Clear all registered tools."""
        self._tools.clear()


# Global registry instance
tool_registry = ToolRegistry()