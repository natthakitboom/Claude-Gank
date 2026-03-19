'use client'

import { useEffect, useState, useRef } from 'react'
import type { Agent } from '@/lib/types'
import PixelSprite from '@/components/PixelSprite'
import { useLanguage } from '@/lib/i18n'

interface Chat {
  id: string; agent_id: string; title: string; created_at: string; updated_at: string
  agent_name: string; agent_sprite: string; agent_color: string; agent_role: string
  message_count?: number; last_message?: string
}

interface ChatMessage {
  id: string; chat_id: string; role: 'user' | 'assistant'; content: string; tokens_used: number; created_at: string
}

interface ChatDetail extends Chat {
  messages: ChatMessage[]; agent_model: string
}

export default function ChatPage() {
  const [chats, setChats] = useState<Chat[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [activeChat, setActiveChat] = useState<ChatDetail | null>(null)
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [showNewChat, setShowNewChat] = useState(false)
  const messagesRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const { t } = useLanguage()

  const fetchChats = async () => {
    const res = await fetch('/api/chat')
    setChats(await res.json())
  }

  const fetchAgents = async () => {
    const res = await fetch('/api/agents')
    setAgents(await res.json())
  }

  useEffect(() => { fetchChats(); fetchAgents() }, [])
  useEffect(() => {
    if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight
  }, [activeChat?.messages, streamText])

  const openChat = async (id: string) => {
    const res = await fetch(`/api/chat/${id}`)
    const data = await res.json()
    setActiveChat(data)
    setStreamText('')
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const createChat = async (agentId: string) => {
    const agent = agents.find(a => a.id === agentId)
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_id: agentId, title: `Chat with ${agent?.name || 'Agent'}` }),
    })
    const chat = await res.json()
    setShowNewChat(false)
    await fetchChats()
    openChat(chat.id)
  }

  const deleteChat = async (id: string) => {
    await fetch(`/api/chat/${id}`, { method: 'DELETE' })
    if (activeChat?.id === id) setActiveChat(null)
    fetchChats()
  }

  const sendMessage = async () => {
    if (!input.trim() || !activeChat || isStreaming) return
    const msg = input.trim()
    setInput('')
    setIsStreaming(true)
    setStreamText('')

    // Optimistic add user message
    const tempMsg: ChatMessage = { id: 'temp', chat_id: activeChat.id, role: 'user', content: msg, tokens_used: 0, created_at: new Date().toISOString() }
    setActiveChat(prev => prev ? { ...prev, messages: [...prev.messages, tempMsg] } : prev)

    const abort = new AbortController()
    abortRef.current = abort

    try {
      const res = await fetch(`/api/chat/${activeChat.id}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
        signal: abort.signal,
      })

      if (!res.body) return
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let fullAssistant = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const evt = JSON.parse(line.slice(6))
              if (evt.type === 'chunk') {
                fullAssistant += evt.text
                setStreamText(fullAssistant)
              } else if (evt.type === 'done') {
                setIsStreaming(false)
                // Reload full chat to get saved messages
                openChat(activeChat.id)
                fetchChats()
              }
            } catch {}
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setStreamText(prev => prev + '\n\n[Connection error]')
      }
      setIsStreaming(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const TEAM_COLOR: Record<string, string> = { CORE: '#ff2d78', TECH: '#2d7fff', CREATIVE: '#a855f7', BUSINESS: '#22c55e', FINANCE: '#06b6d4' }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left: Chat List */}
      <div className="w-72 flex-shrink-0 flex flex-col" style={{ background: '#080a0f', borderRight: '1px solid #111820' }}>
        <div className="p-4 border-b" style={{ borderColor: '#111820' }}>
          <div className="flex items-center justify-between mb-2">
            <h1 className="font-orbitron text-sm font-bold text-white" style={{ letterSpacing: '0.08em' }}>{t('nav_chat')}</h1>
            <button onClick={() => setShowNewChat(true)} className="btn-deploy" style={{ padding: '6px 12px', fontSize: '9px' }}>+ NEW</button>
          </div>
          <div className="font-orbitron" style={{ fontSize: '8px', color: '#374151', letterSpacing: '0.08em' }}>
            {chats.length} {t('chat_conversations')}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {chats.length === 0 && (
            <div className="text-center py-12">
              <div className="font-orbitron" style={{ fontSize: '9px', color: '#1f2937', letterSpacing: '0.08em' }}>{t('chat_no_chats')}</div>
              <button onClick={() => setShowNewChat(true)} className="btn-deploy mt-3" style={{ padding: '6px 12px', fontSize: '9px' }}>
                {t('chat_start_new')}
              </button>
            </div>
          )}
          {chats.map(c => (
            <div key={c.id} className="group relative">
              <button
                onClick={() => openChat(c.id)}
                className="w-full text-left rounded-lg p-3 transition-all"
                style={{
                  background: activeChat?.id === c.id ? '#0f1420' : '#111827',
                  border: `1px solid ${activeChat?.id === c.id ? '#1e3a5f' : '#1a2030'}`,
                }}
              >
                <div className="flex items-center gap-2">
                  <PixelSprite agentId={c.agent_id} size={24} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-white truncate">{c.title}</div>
                    <div className="font-orbitron truncate" style={{ fontSize: '8px', color: '#374151' }}>{c.agent_name} · {c.message_count ?? 0} msgs</div>
                  </div>
                </div>
                {c.last_message && (
                  <div className="mt-1.5 truncate" style={{ fontSize: '10px', color: '#475569' }}>
                    {c.last_message.slice(0, 60)}
                  </div>
                )}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); deleteChat(c.id) }}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity rounded p-1"
                style={{ background: '#111820', color: '#ef4444', fontSize: '10px' }}
                title="Delete"
              >✕</button>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!activeChat ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div style={{ fontSize: '48px', opacity: 0.3 }}>💬</div>
              <div className="font-orbitron mt-3" style={{ fontSize: '11px', color: '#1f2937', letterSpacing: '0.1em' }}>
                {t('chat_select_or_start')}
              </div>
              <button onClick={() => setShowNewChat(true)} className="btn-deploy mt-4">+ {t('chat_start_new')}</button>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="flex-shrink-0 px-5 py-3 flex items-center justify-between border-b" style={{ background: '#111827', borderColor: '#111820' }}>
              <div className="flex items-center gap-3">
                <PixelSprite agentId={activeChat.agent_id} size={32} />
                <div>
                  <div className="text-sm font-medium text-white">{activeChat.agent_name}</div>
                  <div className="font-orbitron" style={{ fontSize: '8px', color: '#64748b' }}>{activeChat.agent_role} · {activeChat.agent_model}</div>
                </div>
              </div>
              <div className="font-orbitron" style={{ fontSize: '8px', color: '#374151' }}>
                {activeChat.messages?.length || 0} messages
              </div>
            </div>

            {/* Messages */}
            <div ref={messagesRef} className="flex-1 overflow-y-auto p-5 space-y-4">
              {activeChat.messages?.length === 0 && !isStreaming && (
                <div className="text-center py-12">
                  <PixelSprite agentId={activeChat.agent_id} size={64} />
                  <div className="font-orbitron mt-3" style={{ fontSize: '10px', color: '#374151' }}>
                    {t('chat_greeting')} {activeChat.agent_name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#475569', marginTop: 4 }}>{activeChat.agent_role}</div>
                </div>
              )}

              {activeChat.messages?.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className="rounded-xl px-4 py-3 max-w-[75%]"
                    style={{
                      background: msg.role === 'user' ? 'rgba(0,229,255,0.1)' : '#111827',
                      border: `1px solid ${msg.role === 'user' ? 'rgba(0,229,255,0.2)' : '#1e2d40'}`,
                    }}
                  >
                    <div className="text-sm whitespace-pre-wrap" style={{ color: '#e2e8f0', lineHeight: 1.7 }}>
                      {msg.content}
                    </div>
                    {msg.tokens_used > 0 && (
                      <div className="font-orbitron mt-1 text-right" style={{ fontSize: '7px', color: '#374151' }}>
                        {msg.tokens_used} tokens
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Streaming message */}
              {isStreaming && streamText && (
                <div className="flex justify-start">
                  <div className="rounded-xl px-4 py-3 max-w-[75%]" style={{ background: '#111827', border: '1px solid #1e2d40' }}>
                    <div className="text-sm whitespace-pre-wrap" style={{ color: '#e2e8f0', lineHeight: 1.7 }}>
                      {streamText}<span className="text-green-400">█</span>
                    </div>
                  </div>
                </div>
              )}

              {isStreaming && !streamText && (
                <div className="flex justify-start">
                  <div className="rounded-xl px-4 py-3" style={{ background: '#111827', border: '1px solid #1e2d40' }}>
                    <div className="typing-dots"><span /><span /><span /></div>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="flex-shrink-0 p-4 border-t" style={{ borderColor: '#111820', background: '#0a0c12' }}>
              <div className="flex items-end gap-3">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t('chat_placeholder')}
                  rows={1}
                  className="gank-input flex-1 resize-none"
                  style={{ minHeight: 42, maxHeight: 120 }}
                  disabled={isStreaming}
                />
                <button
                  onClick={isStreaming ? () => abortRef.current?.abort() : sendMessage}
                  disabled={!isStreaming && !input.trim()}
                  className="font-orbitron px-4 py-2.5 rounded transition-all flex-shrink-0"
                  style={{
                    fontSize: '10px',
                    letterSpacing: '0.06em',
                    background: isStreaming ? '#ef4444' : !input.trim() ? '#111820' : '#00e5ff',
                    color: isStreaming ? '#fff' : !input.trim() ? '#374151' : '#000',
                    cursor: !isStreaming && !input.trim() ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isStreaming ? 'STOP' : 'SEND'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* New Chat Modal — Agent Picker */}
      {showNewChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
          <div className="w-full max-w-2xl rounded-xl overflow-hidden" style={{ background: '#111827', border: '1px solid #1a2535' }}>
            <div className="p-5 border-b" style={{ borderColor: '#111820' }}>
              <span className="font-orbitron text-xs font-bold text-white" style={{ letterSpacing: '0.08em' }}>{t('chat_choose_agent')}</span>
              <p className="mt-1" style={{ fontSize: '10px', color: '#475569' }}>{t('chat_choose_desc')}</p>
            </div>
            <div className="p-5 max-h-96 overflow-y-auto">
              <div className="grid grid-cols-2 gap-2">
                {agents.map(agent => (
                  <button
                    key={agent.id}
                    onClick={() => createChat(agent.id)}
                    className="flex items-center gap-3 p-3 rounded-lg transition-all text-left hover:border-cyan-500/30"
                    style={{ background: '#0f1420', border: '1px solid #1a2535' }}
                  >
                    <PixelSprite agentId={agent.id} size={32} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-white truncate">{agent.name}</div>
                      <div className="font-orbitron truncate" style={{ fontSize: '8px', color: TEAM_COLOR[agent.team] || '#374151' }}>
                        {agent.role}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="p-4 border-t" style={{ borderColor: '#111820' }}>
              <button onClick={() => setShowNewChat(false)} className="w-full py-2 rounded font-orbitron text-xs" style={{ background: '#111820', border: '1px solid #1a2535', color: '#64748b' }}>
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
