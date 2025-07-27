import os
from pathlib import Path
from typing import List, Optional
from .base import BaseTool, ToolParameter, ToolResult


class LsTool(BaseTool):
    """Tool for listing directory contents."""
    
    @property
    def name(self) -> str:
        return "ls"
    
    @property
    def description(self) -> str:
        return "List files and directories in a specified path"
    
    @property
    def parameters(self) -> List[ToolParameter]:
        return [
            ToolParameter(
                name="path",
                type="string",
                description="The directory path to list (defaults to current directory)",
                required=False,
                default="."
            ),
            ToolParameter(
                name="show_hidden",
                type="boolean",
                description="Show hidden files (files starting with .)",
                required=False,
                default=False
            ),
            ToolParameter(
                name="details",
                type="boolean",
                description="Show detailed information (size, modified time)",
                required=False,
                default=False
            )
        ]
    
    async def execute(self, path: str = ".", show_hidden: bool = False, 
                     details: bool = False) -> ToolResult:
        """List directory contents."""
        try:
            # Resolve the path
            target_path = Path(path).resolve()
            
            # Check if path exists
            if not target_path.exists():
                return ToolResult(
                    success=False,
                    error=f"Path does not exist: {path}"
                )
            
            # Check if it's a directory
            if not target_path.is_dir():
                return ToolResult(
                    success=False,
                    error=f"Path is not a directory: {path}"
                )
            
            # List directory contents
            items = []
            for item in sorted(target_path.iterdir()):
                # Skip hidden files if not requested
                if not show_hidden and item.name.startswith('.'):
                    continue
                
                if details:
                    # Get detailed information
                    stat = item.stat()
                    item_info = {
                        "name": item.name,
                        "type": "directory" if item.is_dir() else "file",
                        "size": stat.st_size if item.is_file() else None,
                        "modified": stat.st_mtime
                    }
                    items.append(item_info)
                else:
                    # Simple listing
                    prefix = "/" if item.is_dir() else ""
                    items.append(item.name + prefix)
            
            return ToolResult(
                success=True,
                data={
                    "path": str(target_path),
                    "items": items,
                    "count": len(items)
                }
            )
            
        except PermissionError:
            return ToolResult(
                success=False,
                error=f"Permission denied: {path}"
            )
        except Exception as e:
            return ToolResult(
                success=False,
                error=f"Error listing directory: {str(e)}"
            )