import React, { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import modelSettings from '../config/models.json'

function App() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedModel, setSelectedModel] = useState(modelSettings.defaultModel)
  const [usage, setUsage] = useState({ totalCost: 0, requests: 0 })
  const [useFullContext, setUseFullContext] = useState(false)
  const [sessionId, setSessionId] = useState(() => Math.random().toString(36).substr(2, 9))
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
        body: JSON.stringify({ message: currentInput, model: selectedModel, useFullContext, sessionId }),
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
      
      // Fetch updated usage after streaming completes
      setTimeout(fetchUsage, 500) // Small delay to allow backend processing
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
    <div className="chat-container">
      <div className="chat-header">
        <h1>Dreamy Tin</h1>
        <div className="header-controls">
          <div className="usage-display">
            <span className="usage-cost">${usage.totalCost.toFixed(4)}</span>
            <span className="usage-requests">({usage.requests} requests)</span>
            <button onClick={resetUsage} className="reset-button" title="Reset usage">↺</button>
          </div>
          <div className="knowledge-selector">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={useFullContext}
                onChange={(e) => setUseFullContext(e.target.checked)}
              />
              Full Context
            </label>
          </div>
          <div className="model-selector">
            <select 
              value={selectedModel} 
              onChange={(e) => {
                setSelectedModel(e.target.value)
                setMessages([])
                setSessionId(Math.random().toString(36).substr(2, 9)) // Generate new session
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
  )
}

export default App