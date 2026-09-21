import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  hasCard?: boolean
  forecastAqi?: number
}

interface ChatContextValue {
  messages: ChatMessage[]
  addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void
  clearMessages: () => void
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
}

const STORAGE_KEY = 'trinetra_chat_history'

function loadMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function persistMessages(messages: ChatMessage[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
}

const ChatContext = createContext<ChatContextValue | null>(null)

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>(loadMessages)
  const [isLoading, setIsLoading] = useState(false)

  // Sync to localStorage whenever messages change
  useEffect(() => {
    persistMessages(messages)
  }, [messages])

  const addMessage = useCallback((msg: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    setMessages(prev => [
      ...prev,
      { ...msg, id: Date.now(), timestamp: Date.now() },
    ])
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  return (
    <ChatContext.Provider value={{ messages, addMessage, clearMessages, isLoading, setIsLoading }}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChat must be used within ChatProvider')
  return ctx
}
