export interface Message {
  role: 'user' | 'assistant' | 'tool'
  content: string
  toolName?: string
  toolResult?: string | null
}

export interface Usage {
  totalCost: number
  requests: number
}

export interface ContextSize {
  tokenCount: number
  messageCount: number
  inputTokens?: number
  outputTokens?: number
}

export interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'error'
  error?: string
}

export interface ModelInfo {
  defaultModel: string
  models: Record<string, any>
  providers: Record<string, boolean>
}

export interface Conversation {
  id: string
  title: string
  created_at: string
  updated_at: string
  message_count: number
  model: string
}