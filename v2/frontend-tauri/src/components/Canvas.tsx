import type { FC } from 'react'
import ReactMarkdown from 'react-markdown'

interface CanvasProps {
  canvasContent: string
  activeTab: string
  setActiveTab: (tab: string) => void
  onClear: () => void
}

const Canvas: FC<CanvasProps> = ({
  canvasContent,
  activeTab,
  setActiveTab,
  onClear
}) => {
  // Parse and format tool result for display
  const parseToolResult = (result: string) => {
    try {
      const parsed = JSON.parse(result)
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed
      }
    } catch (e) {
      // If not valid JSON, return as text
    }
    return { content: result }
  }

  // Format content for display (handle markdown and newlines)
  const formatContent = (content: string) => {
    if (typeof content !== 'string') return String(content)
    // Replace \n with actual newlines for markdown parsing
    return content.replace(/\\n/g, '\n')
  }

  return (
    <div className="canvas-area">
      <div className="canvas-header">
        <h3>Content</h3>
        <div className="header-actions">
          {canvasContent && (
            <button 
              onClick={onClear}
              className="clear-canvas"
              title="Clear content"
            >
              ✕
            </button>
          )}
        </div>
      </div>
      <div className="canvas-content">
        {canvasContent ? (
          (() => {
            const parsedResult = parseToolResult(canvasContent)
            const tabs = Object.keys(parsedResult)
            const currentTab = activeTab || (tabs.includes('content') ? 'content' : tabs[0])
            
            return (
              <div className="result-viewer">
                {/* Tab Pills */}
                <div className="tab-pills">
                  {tabs.map(tab => (
                    <button
                      key={tab}
                      className={`tab-pill ${currentTab === tab ? 'active' : ''}`}
                      onClick={() => setActiveTab(tab)}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                
                {/* Tab Content */}
                <div className="tab-content">
                  {currentTab === 'content' ? (
                    <div className="markdown-content">
                      <ReactMarkdown>{formatContent(parsedResult[currentTab])}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="json-content">
                      <pre>{JSON.stringify(parsedResult[currentTab], null, 2)}</pre>
                    </div>
                  )}
                </div>
              </div>
            )
          })()
        ) : (
          <div className="canvas-placeholder">
            Click a completed tool to view its result here
          </div>
        )}
      </div>
    </div>
  )
}

export default Canvas