import React, { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import modelSettings from '../config/models.json'

function App() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedModel, setSelectedModel] = useState(modelSettings.defaultModel)
  const [usage, setUsage] = useState({ totalCost: 0, requests: 0 })
  const [sessionId, setSessionId] = useState(() => Math.random().toString(36).substr(2, 9))
  const [contextSize, setContextSize] = useState({ tokenCount: 0, messageCount: 0 })

  // Format token count for display (e.g., 1200 -> "1.2k", 1000000 -> "1M")
  const formatTokens = (tokens) => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`
    } else if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}k`
    }
    return tokens.toString()
  }

  // Get current model's token limit
  const getCurrentModelLimit = () => {
    return modelSettings.models[selectedModel]?.maxTokens || 200000
  }
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    fetchUsage() // Load usage on component mount
  }, [])

  // Fetch usage data
  const fetchUsage = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/usage')
      if (response.ok) {
        const usageData = await response.json()
        setUsage(usageData)
      }
    } catch (error) {
      console.error('Error fetching usage:', error)
    }
  }

  // Fetch context size
  const fetchContextSize = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/context/${sessionId}`)
      if (response.ok) {
        const contextData = await response.json()
        setContextSize(contextData)
      }
    } catch (error) {
      console.error('Error fetching context size:', error)
    }
  }

  // Reset usage
  const resetUsage = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/usage/reset', {
        method: 'POST',
      })
      if (response.ok) {
        const usageData = await response.json()
        setUsage(usageData)
      }
    } catch (error) {
      console.error('Error resetting usage:', error)
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = { role: 'user', content: input }
    const currentInput = input
    setInput('')
    setIsLoading(true)

    // Add both user and assistant messages, calculate correct index
    setMessages(prev => {
      const newMessages = [...prev, userMessage, { role: 'assistant', content: '' }]
      return newMessages
    })
    
    const assistantMessageIndex = messages.length + 1

    try {
      const response = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: currentInput, model: selectedModel, useFullContext: true, sessionId }),
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        
        setMessages(prev => {
          const newMessages = [...prev]
          newMessages[assistantMessageIndex].content += chunk
          return newMessages
        })
      }
      
      // Fetch updated usage and context size after streaming completes
      setTimeout(() => {
        fetchUsage()
        fetchContextSize()
      }, 500) // Small delay to allow backend processing
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

  const handleKeyDown = (e) => {
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
            <img src="/icon.png" alt="DreamyTin AI" className="app-icon" />
            <h1>Dreamy Tin</h1>
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
                  setSessionId(Math.random().toString(36).substr(2, 9)) // Generate new session
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
            rows="3"
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