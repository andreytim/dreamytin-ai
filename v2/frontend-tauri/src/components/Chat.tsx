import { useRef, useEffect, type FC } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Message, Usage, ContextSize, ConnectionState, ModelInfo } from '../types'

interface ChatProps {
  messages: Message[]
  input: string
  setInput: (input: string) => void
  isLoading: boolean
  selectedModel: string
  setSelectedModel: (model: string) => void
  usage: Usage
  contextSize: ContextSize
  connection: ConnectionState
  availableModels: ModelInfo | null
  resetUsage: () => void
  sendMessage: () => void
  onToolResultClick: (result: string) => void
  setMessages: (messages: Message[]) => void
  setContextSize: (contextSize: ContextSize) => void
}

const Chat: FC<ChatProps> = ({
  messages,
  input,
  setInput,
  isLoading,
  selectedModel,
  setSelectedModel,
  usage,
  contextSize,
  connection,
  availableModels,
  resetUsage,
  sendMessage,
  onToolResultClick,
  setMessages,
  setContextSize
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Format token count for display (e.g., 1200 -> "1.2k", 1000000 -> "1M")
  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`
    } else if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}k`
    }
    return tokens.toString()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="header-title">
          <img src="/icon.png" alt="DreamyTin AI" className="app-icon" />
        </div>
        <div className="header-controls">
          <div className="usage-display">
            <span className="usage-cost">${usage.totalCost.toFixed(4)}</span>
            <span className="usage-requests">({usage.requests} requests)</span>
            <span className="context-size">
              <span className="tokens-in">{formatTokens(contextSize.inputTokens || 0)} in</span> / <span className="tokens-out">{formatTokens(contextSize.outputTokens || 0)} out</span> tk
            </span>
          </div>
          <div className="model-selector">
            <select 
              value={selectedModel} 
              onChange={(e) => {
                setSelectedModel(e.target.value)
                setMessages([])
                setContextSize({ tokenCount: 0, messageCount: 0, inputTokens: 0, outputTokens: 0 })
                resetUsage()
              }}
              className="model-dropdown"
            >
              {availableModels && Object.keys(availableModels.models).map((modelId) => (
                <option key={modelId} value={modelId}>
                  {modelId}
                </option>
              ))}
            </select>
            {/* Connection status indicator */}
            <div className={`connection-status ${connection.status}`}>
              <span className="status-indicator"></span>
              <span className="status-text">
                {connection.status === 'connected' && '●'}
                {connection.status === 'connecting' && '○'}
                {connection.status === 'disconnected' && '○'}
                {connection.status === 'error' && '●'}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="messages-container">
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.role}`}>
            <div className="message-content">
              {message.role === 'assistant' ? (
                <ReactMarkdown>{message.content}</ReactMarkdown>
              ) : message.role === 'tool' ? (
                <div 
                  className="tool-message"
                  onClick={() => {
                    if (message.toolResult) {
                      onToolResultClick(message.toolResult)
                    }
                  }}
                  style={{ cursor: message.toolResult ? 'pointer' : 'default' }}
                >
                  <div className="tool-header">
                    {message.content}
                    {message.toolResult && <span className="tool-status">✓ Complete</span>}
                  </div>
                </div>
              ) : (
                message.content
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="message assistant">
            <div className="message-content typing">
              {connection.status === 'connected' ? 'Thinking...' : 'Connecting...'}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-container">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message here..."
          rows={3}
        />
        <button 
          onClick={sendMessage} 
          disabled={isLoading || !input.trim() || connection.status !== 'connected'}
          title={connection.status !== 'connected' ? 'Not connected to backend' : ''}
        >
          {connection.status === 'connected' ? 'Send' : 'Disconnected'}
        </button>
      </div>
    </div>
  )
}

export default Chat