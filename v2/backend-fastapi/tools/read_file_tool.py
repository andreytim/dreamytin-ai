from pathlib import Path
from typing import List, Optional
from .base import BaseTool, ToolParameter, ToolResult


class ReadFileTool(BaseTool):
    """Tool for reading file contents."""
    
    @property
    def name(self) -> str:
        return "read_file"
    
    @property
    def description(self) -> str:
        return "Read the contents of a file"
    
    @property
    def parameters(self) -> List[ToolParameter]:
        return [
            ToolParameter(
                name="path",
                type="string",
                description="The file path to read",
                required=True
            ),
            ToolParameter(
                name="encoding",
                type="string",
                description="File encoding (defaults to utf-8)",
                required=False,
                default="utf-8"
            ),
            ToolParameter(
                name="lines",
                type="integer",
                description="Number of lines to read (reads all if not specified)",
                required=False,
                default=None
            )
        ]
    
    async def execute(self, path: str, encoding: str = "utf-8", 
                     lines: Optional[int] = None) -> ToolResult:
        """Read file contents."""
        try:
            # Resolve the path
            file_path = Path(path).resolve()
            
            # Check if path exists
            if not file_path.exists():
                return ToolResult(
                    success=False,
                    error=f"File does not exist: {path}"
                )
            
            # Check if it's a file
            if not file_path.is_file():
                return ToolResult(
                    success=False,
                    error=f"Path is not a file: {path}"
                )
            
            # Read the file
            with open(file_path, 'r', encoding=encoding) as f:
                if lines is not None and lines > 0:
                    # Read specified number of lines
                    content_lines = []
                    for i, line in enumerate(f):
                        if i >= lines:
                            break
                        content_lines.append(line.rstrip('\n'))
                    content = '\n'.join(content_lines)
                    truncated = i >= lines
                else:
                    # Read entire file
                    content = f.read()
                    truncated = False
            
            # Get file info
            stat = file_path.stat()
            
            return ToolResult(
                success=True,
                data={
                    "path": str(file_path),
                    "content": content,
                    "size": stat.st_size,
                    "truncated": truncated,
                    "encoding": encoding
                }
            )
            
        except PermissionError:
            return ToolResult(
                success=False,
                error=f"Permission denied: {path}"
            )
        except UnicodeDecodeError:
            return ToolResult(
                success=False,
                error=f"Failed to decode file with encoding '{encoding}'. Try a different encoding."
            )
        except Exception as e:
            return ToolResult(
                success=False,
                error=f"Error reading file: {str(e)}"
            )