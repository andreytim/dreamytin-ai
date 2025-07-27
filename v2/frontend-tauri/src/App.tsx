import { useState, useEffect } from 'react'
import modelSettings from '../../shared/config/models.json'
import Chat from './components/Chat'
import Canvas from './components/Canvas'
import type { Message, Usage, ContextSize, ConnectionState, ModelInfo } from './types'
import './App.css'

function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedModel, setSelectedModel] = useState(modelSettings.defaultModel)
  const [usage, setUsage] = useState<Usage>({ totalCost: 0, requests: 0 })
  const [sessionId] = useState(() => Math.random().toString(36).substring(2, 11))
  const [contextSize, setContextSize] = useState<ContextSize>({ tokenCount: 0, messageCount: 0 })
  const [connection, setConnection] = useState<ConnectionState>({ status: 'disconnected' })
  const [websocket, setWebsocket] = useState<WebSocket | null>(null)
  const [availableModels, setAvailableModels] = useState<ModelInfo | null>(null)
  const [canvasContent, setCanvasContent] = useState<string>('')
  const [activeTab, setActiveTab] = useState<string>('')

  useEffect(() => {
    connectWebSocket()
    fetchModels()
    
    // Cleanup function to close WebSocket on unmount
    return () => {
      if (websocket) {
        websocket.close()
        setWebsocket(null)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Connect to FastAPI WebSocket
  const connectWebSocket = () => {
    // Prevent multiple connections
    if (websocket && websocket.readyState === WebSocket.OPEN) {
      return
    }
    
    const ws_url = `ws://localhost:8000/ws/${sessionId}`
    setConnection({ status: 'connecting' })
    
    const ws = new WebSocket(ws_url)
    
    ws.onopen = () => {
      setConnection({ status: 'connected' })
      setWebsocket(ws)
    }
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        handleWebSocketMessage(data)
      } catch (error) {
        console.error('Error parsing WebSocket message:', error)
      }
    }
    
    ws.onclose = () => {
      setConnection({ status: 'disconnected' })
      setWebsocket(null)
      // Attempt reconnection after 3 seconds
      setTimeout(connectWebSocket, 3000)
    }
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      setConnection({ status: 'error', error: 'Connection failed' })
    }
  }

  // Handle incoming WebSocket messages
  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'stream':
        // Append content to the last assistant message
        setMessages(prev => {
          const newMessages = [...prev]
          const lastMessage = newMessages[newMessages.length - 1]
          if (lastMessage && lastMessage.role === 'assistant') {
            // Create a new message object instead of mutating
            newMessages[newMessages.length - 1] = {
              ...lastMessage,
              content: lastMessage.content + data.content
            }
          }
          return newMessages
        })
        break
        
      case 'tool_call':
        // Create a separate tool message for the call
        setMessages(prev => [
          ...prev,
          {
            role: 'tool' as const,
            content: `🔧 ${data.tool_name}`,
            toolName: data.tool_name,
            toolResult: null
          }
        ])
        break
        
      case 'tool_result':
        // Update the last tool message with the result
        setMessages(prev => {
          const newMessages = [...prev]
          const lastMessage = newMessages[newMessages.length - 1]
          if (lastMessage && lastMessage.role === 'tool' && lastMessage.toolName === data.tool_name) {
            newMessages[newMessages.length - 1] = {
              ...lastMessage,
              toolResult: data.result
            }
          }
          return newMessages
        })
        break
        
      case 'final_response_start':
        // Create a new assistant message for the final response
        setMessages(prev => [
          ...prev,
          { role: 'assistant' as const, content: '' }
        ])
        break
        
      case 'final_stream':
        // Append to the final assistant response
        setMessages(prev => {
          const newMessages = [...prev]
          const lastMessage = newMessages[newMessages.length - 1]
          if (lastMessage && lastMessage.role === 'assistant') {
            newMessages[newMessages.length - 1] = {
              ...lastMessage,
              content: lastMessage.content + data.content
            }
          }
          return newMessages
        })
        break
        
      case 'stream_end':
        setIsLoading(false)
        break
        
      case 'error':
        console.error('Backend error:', data.error)
        setMessages(prev => {
          const newMessages = [...prev]
          const lastMessage = newMessages[newMessages.length - 1]
          if (lastMessage && lastMessage.role === 'assistant') {
            newMessages[newMessages.length - 1] = {
              ...lastMessage,
              content: `Error: ${data.error}`
            }
          }
          return newMessages
        })
        setIsLoading(false)
        break
        
      default:
        break
    }
  }

  // Fetch available models from backend
  const fetchModels = async () => {
    try {
      const response = await fetch('http://localhost:8000/models')
      if (response.ok) {
        const models = await response.json()
        setAvailableModels(models)
        // Update selected model if current one isn't available
        if (!models.models[selectedModel]) {
          setSelectedModel(models.defaultModel)
        }
      }
    } catch (error) {
      console.error('Error fetching models:', error)
      // Fall back to static config
      setAvailableModels({
        defaultModel: modelSettings.defaultModel,
        models: modelSettings.models,
        providers: { openai: false, anthropic: false, google: false }
      })
    }
  }

  const resetUsage = async () => {
    setUsage({ totalCost: 0, requests: 0 })
  }

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !websocket || connection.status !== 'connected') return

    const userMessage: Message = { role: 'user', content: input }
    const currentInput = input
    setInput('')
    setIsLoading(true)

    // Add user message and empty assistant message
    setMessages(prev => [
      ...prev, 
      userMessage, 
      { role: 'assistant', content: '' }
    ])

    try {
      // Send message to backend via WebSocket
      const messageData = {
        message: currentInput,
        model: selectedModel
      }
      
      websocket.send(JSON.stringify(messageData))
      
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages(prev => {
        const newMessages = [...prev]
        const lastMessage = newMessages[newMessages.length - 1]
        if (lastMessage && lastMessage.role === 'assistant') {
          lastMessage.content = 'Sorry, I encountered an error. Please try again.'
        }
        return newMessages
      })
      setIsLoading(false)
    }
  }

  const handleToolResultClick = (result: string) => {
    setCanvasContent(result)
    setActiveTab('content')
  }

  const clearCanvas = () => {
    setCanvasContent('')
    setActiveTab('content')
  }

  return (
    <div className="app-layout">
      <Chat
        messages={messages}
        input={input}
        setInput={setInput}
        isLoading={isLoading}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        usage={usage}
        contextSize={contextSize}
        connection={connection}
        availableModels={availableModels}
        resetUsage={resetUsage}
        sendMessage={sendMessage}
        onToolResultClick={handleToolResultClick}
        setMessages={setMessages}
        setContextSize={setContextSize}
      />
      
      <Canvas
        canvasContent={canvasContent}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onClear={clearCanvas}
      />
    </div>
  )
}

export default App