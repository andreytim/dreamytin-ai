import React, { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import modelSettings from '../../shared/config/models.json'
import './App.css'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Usage {
  totalCost: number
  requests: number
}

interface ContextSize {
  tokenCount: number
  messageCount: number
  inputTokens?: number
  outputTokens?: number
}

function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedModel, setSelectedModel] = useState(modelSettings.defaultModel)
  const [usage, setUsage] = useState<Usage>({ totalCost: 0, requests: 0 })
  const [, setSessionId] = useState(() => Math.random().toString(36).substring(2, 11))
  const [contextSize, setContextSize] = useState<ContextSize>({ tokenCount: 0, messageCount: 0 })

  // Format token count for display (e.g., 1200 -> "1.2k", 1000000 -> "1M")
  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`
    } else if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}k`
    }
    return tokens.toString()
  }

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    fetchUsage() // Load usage on component mount
  }, [])

  // Fetch usage data (STUB)
  const fetchUsage = async () => {
    // Stub: simulate usage data
    setUsage({ totalCost: 0.0245, requests: 12 })
  }

  // Fetch context size (STUB)
  const fetchContextSize = async () => {
    // Stub: simulate context size
    setContextSize({ 
      tokenCount: 1200, 
      messageCount: messages.length,
      inputTokens: 800,
      outputTokens: 400
    })
  }

  // Reset usage (STUB)
  const resetUsage = async () => {
    setUsage({ totalCost: 0, requests: 0 })
  }

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = { role: 'user', content: input }
    const currentInput = input
    setInput('')
    setIsLoading(true)

    // Add both user and assistant messages, calculate correct index
    setMessages(prev => {
      const newMessages: Message[] = [...prev, userMessage, { role: 'assistant', content: '' }]
      return newMessages
    })
    
    const assistantMessageIndex = messages.length + 1

    try {
      // STUB: Simulate streaming response
      const stubResponse = `Thanks for your message: "${currentInput}". This is a stub response from the ${selectedModel} model. In the real v2 implementation, this would connect to the FastAPI backend and stream the actual AI response.`
      
      // Simulate streaming by adding text character by character
      for (let i = 0; i <= stubResponse.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 20)) // 20ms delay per character
        
        setMessages(prev => {
          const newMessages = [...prev]
          newMessages[assistantMessageIndex].content = stubResponse.substring(0, i)
          return newMessages
        })
      }
      
      // Fetch updated usage and context size after streaming completes
      setTimeout(() => {
        fetchUsage()
        fetchContextSize()
      }, 500) // Small delay to allow processing
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages(prev => {
        const newMessages = [...prev]
        newMessages[assistantMessageIndex].content = 'Sorry, I encountered an error. Please try again.'
        return newMessages
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="app-layout">
      <div className="chat-container">
        <div className="chat-header">
          <div className="header-title">
            <h1>Dreamy Tin v2</h1>
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
                  setContextSize({ tokenCount: 0, messageCount: 0, inputTokens: 0, outputTokens: 0 }) // Reset context display
                  setSessionId(Math.random().toString(36).substring(2, 11)) // Generate new session
                  resetUsage() // Reset cost tracking for new model
                }}
                className="model-dropdown"
              >
                {Object.keys(modelSettings.models).map((modelId) => (
                  <option key={modelId} value={modelId}>
                    {modelId}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        <div className="messages-container">
          {messages.map((message, index) => (
            <div key={index} className={`message ${message.role}`}>
              <div className="message-content">
                {message.role === 'assistant' ? (
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                ) : (
                  message.content
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="message assistant">
              <div className="message-content typing">
                Thinking...
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
          <button onClick={sendMessage} disabled={isLoading || !input.trim()}>
            Send
          </button>
        </div>
      </div>
      
      <div className="canvas-area">
        <div className="canvas-placeholder">
          Canvas area - coming soon
        </div>
      </div>
    </div>
  )
}

export default App