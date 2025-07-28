import { useState, useEffect, useImperativeHandle, forwardRef } from 'react'
import type { Conversation } from '../types'

interface ConversationSidebarProps {
  currentConversationId: string | null
  onSelectConversation: (conversationId: string) => void
  onNewConversation: () => void
  isCollapsed: boolean
  onToggleCollapse: () => void
}

export interface ConversationSidebarRef {
  refreshConversations: () => Promise<void>
}

const ConversationSidebar = forwardRef<ConversationSidebarRef, ConversationSidebarProps>(({
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  isCollapsed,
  onToggleCollapse
}, ref) => {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(false)

  // Fetch conversations on mount and when expanded
  useEffect(() => {
    if (!isCollapsed) {
      fetchConversations()
    }
  }, [isCollapsed])

  const fetchConversations = async () => {
    try {
      setLoading(true)
      const response = await fetch('http://localhost:8000/conversations')
      if (response.ok) {
        const data = await response.json()
        setConversations(data.conversations || [])
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  // Expose refresh method to parent
  useImperativeHandle(ref, () => ({
    refreshConversations: fetchConversations
  }), [])

  const deleteConversation = async (conversationId: string, event: React.MouseEvent) => {
    event.stopPropagation() // Prevent conversation selection
    
    if (!confirm('Delete this conversation?')) return
    
    try {
      const response = await fetch(`http://localhost:8000/conversations/${conversationId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        // Remove from local state
        setConversations(prev => prev.filter(conv => conv.id !== conversationId))
        
        // If we deleted the current conversation, start a new one
        if (conversationId === currentConversationId) {
          onNewConversation()
        }
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffDays === 1) {
      return 'Yesterday'
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  if (isCollapsed) {
    return (
      <div className="conversation-sidebar collapsed">
        <button 
          className="sidebar-toggle"
          onClick={onToggleCollapse}
          title="Show conversations"
        >
          →
        </button>
      </div>
    )
  }

  return (
    <div className="conversation-sidebar">
      <div className="sidebar-header">
        <button 
          className="sidebar-toggle"
          onClick={onToggleCollapse}
          title="Hide conversations"
        >
          ←
        </button>
        <h3>Conversations</h3>
        <button 
          className="new-conversation-btn"
          onClick={onNewConversation}
          title="New conversation"
        >
          +
        </button>
      </div>
      
      <div className="conversations-list">
        {loading ? (
          <div className="loading">Loading...</div>
        ) : conversations.length === 0 ? (
          <div className="empty-state">No conversations yet</div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              className={`conversation-item ${conv.id === currentConversationId ? 'active' : ''}`}
              onClick={() => onSelectConversation(conv.id)}
            >
              <div className="conversation-content">
                <div className="conversation-title">{conv.title}</div>
                <div className="conversation-meta">
                  <span className="conversation-date">{formatDate(conv.updated_at)}</span>
                  <span className="message-count">{conv.message_count} msgs</span>
                </div>
              </div>
              <button
                className="delete-conversation"
                onClick={(e) => deleteConversation(conv.id, e)}
                title="Delete conversation"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
})

ConversationSidebar.displayName = 'ConversationSidebar'

export default ConversationSidebar