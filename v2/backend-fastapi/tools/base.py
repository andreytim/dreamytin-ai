from abc import ABC, abstractmethod
from typing import Any, Dict, Optional, List
from pydantic import BaseModel, Field


class ToolParameter(BaseModel):
    name: str
    type: str
    description: str
    required: bool = True
    default: Optional[Any] = None


class ToolDefinition(BaseModel):
    name: str
    description: str
    parameters: List[ToolParameter] = Field(default_factory=list)


class ToolResult(BaseModel):
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None


class BaseTool(ABC):
    """Base class for all tools that can be used by the agent."""
    
    @property
    @abstractmethod
    def name(self) -> str:
        """The name of the tool."""
        pass
    
    @property
    @abstractmethod
    def description(self) -> str:
        """A description of what the tool does."""
        pass
    
    @property
    def parameters(self) -> List[ToolParameter]:
        """List of parameters the tool accepts."""
        return []
    
    @abstractmethod
    async def execute(self, **kwargs) -> ToolResult:
        """Execute the tool with the given parameters."""
        pass
    
    def get_definition(self) -> ToolDefinition:
        """Get the tool definition for registration."""
        return ToolDefinition(
            name=self.name,
            description=self.description,
            parameters=self.parameters
        )
    
    def validate_parameters(self, kwargs: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and parse tool parameters."""
        validated = {}
        
        for param in self.parameters:
            if param.required and param.name not in kwargs:
                raise ValueError(f"Required parameter '{param.name}' is missing")
            
            if param.name in kwargs:
                validated[param.name] = kwargs[param.name]
            elif param.default is not None:
                validated[param.name] = param.default
        
        return validated