'use client'

import { useEffect, useState, useRef } from 'react'
import type { Agent } from '@/lib/types'
import PixelSprite from '@/components/PixelSprite'

const TEAM_CAT_CLASS: Record<string, string> = { CORE: 'cat-core', TECH: 'cat-tech', CREATIVE: 'cat-creative', BUSINESS: 'cat-biz', FINANCE: 'cat-finance' }
const TEAM_DISPLAY: Record<string, string> = { CORE: 'CORE', TECH: 'TECH', CREATIVE: 'CREATIVE', BUSINESS: 'BIZ', FINANCE: 'FINANCE' }
const TYPE_CLASS: Record<string, string> = { message: 'type-message', task: 'type-task', result: 'type-result', broadcast: 'type-broadcast' }

interface MessageRow {
  id: string; from_agent: string; to_agent: string | null; type: string; content: string
  created_at: string; from_agent_name: string; from_agent_sprite: string
  to_agent_name: string | null; to_agent_sprite: string | null; mission_id: string | null
}

export default function CommsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [filterAgent, setFilterAgent] = useState('all')
  const [sending, setSending] = useState(false)
  const [showCompose, setShowCompose] = useState(false)
  const [form, setForm] = useState({ from_agent: '', to_agent: '', type: 'message', content: '' })
  const feedRef = useRef<HTMLDivElement>(null)

  const fetchAgents = async () => {
    const res = await fetch('/api/agents')
    const data = await res.json()
    setAgents(data)
    if (data.length > 0 && !form.from_agent) setForm((f) => ({ ...f, from_agent: data[0].id }))
  }

  const fetchMessages = async () => {
    const url = filterAgent === 'all' ? '/api/messages' : `/api/messages?agent_id=${filterAgent}`
    const res = await fetch(url)
    setMessages(await res.json())
  }

  useEffect(() => { fetchAgents() }, [])
  useEffect(() => { fetchMessages(); const i = setInterval(fetchMessages, 3000); return () => clearInterval(i) }, [filterAgent])

  const sendMessage = async () => {
    if (!form.from_agent || !form.content) return
    setSending(true)
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_agent: form.from_agent,
          to_agent: form.to_agent || null,
          type: form.type,
          content: form.content,
        }),
      })
      setForm((f) => ({ ...f, content: '' }))
      setShowCompose(false)
      fetchMessages()
    } finally { setSending(false) }
  }

  const agentName = (id: string) => agents.find((a) => a.id === id)?.name || id

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 p-6 pb-0">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="font-orbitron font-bold text-white" style={{ fontSize: '28px', letterSpacing: '0.05em' }}>COMMS</h1>
            <p className="font-orbitron mt-1" style={{ fontSize: '10px', color: '#374151', letterSpacing: '0.1em' }}>// INTER-AGENT COMMUNICATION CHANNEL</p>
          </div>
          <button onClick={() => setShowCompose(true)} className="btn-deploy">+ BROADCAST</button>
        </div>

        {/* Agent filter */}
        <div className="flex gap-2 flex-wrap pb-4">
          <button
            onClick={() => setFilterAgent('all')}
            className="font-orbitron text-xs px-3 py-1.5 rounded transition-all"
            style={filterAgent === 'all'
              ? { background: 'rgba(0,229,255,0.15)', color: '#00e5ff', fontSize: '9px', letterSpacing: '0.08em' }
              : { background: '#111820', color: '#374151', fontSize: '9px', letterSpacing: '0.08em' }}
          >
            ALL
          </button>
          {agents.map((a) => (
            <button
              key={a.id}
              onClick={() => setFilterAgent(a.id)}
              className="flex items-center gap-1.5 px-2 py-1 rounded transition-all"
              style={filterAgent === a.id
                ? { background: 'rgba(0,229,255,0.1)', border: '1px solid #00e5ff33' }
                : { background: '#111820', border: '1px solid transparent' }}
            >
              <PixelSprite agentId={a.id} size={16} />
              <span className="text-xs" style={{ color: filterAgent === a.id ? '#e2e8f0' : '#374151' }}>{a.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Message Feed */}
      <div ref={feedRef} className="flex-1 overflow-y-auto px-6 pb-6">
        {messages.length === 0 ? (
          <div className="text-center py-16 font-orbitron" style={{ color: '#1f2937', fontSize: '11px', letterSpacing: '0.08em' }}>
            // NO TRANSMISSIONS DETECTED
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((msg) => (
              <div key={msg.id} className="rounded-lg p-4" style={{ background: '#111827', border: '1px solid #1a2030' }}>
                <div className="flex items-center gap-2 mb-2">
                  <PixelSprite agentId={msg.from_agent} size={28} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{msg.from_agent_name}</span>
                      <span className={`cat-badge ${TYPE_CLASS[msg.type] || 'type-message'}`} style={{ fontSize: '8px' }}>{msg.type.toUpperCase()}</span>
                      {msg.to_agent ? (
                        <span className="font-orbitron" style={{ fontSize: '8px', color: '#374151' }}>TO: {msg.to_agent_name}</span>
                      ) : msg.type === 'broadcast' ? (
                        <span className="font-orbitron" style={{ fontSize: '8px', color: '#00e5ff' }}>TO: ALL AGENTS</span>
                      ) : null}
                    </div>
                    <div className="font-orbitron" style={{ fontSize: '8px', color: '#1f2937' }}>
                      {new Date(msg.created_at).toLocaleString('th-TH')}
                    </div>
                  </div>
                </div>
                <div className="text-sm ml-9 leading-relaxed" style={{ color: '#94a3b8' }}>{msg.content}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
          <div className="w-full max-w-lg rounded-xl overflow-hidden" style={{ background: '#111827', border: '1px solid #1a2535' }}>
            <div className="p-5 border-b" style={{ borderColor: '#111820' }}>
              <span className="font-orbitron text-xs font-bold text-white" style={{ letterSpacing: '0.08em' }}>NEW TRANSMISSION</span>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-orbitron block mb-1" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>FROM</label>
                  <select value={form.from_agent} onChange={(e) => setForm((f) => ({ ...f, from_agent: e.target.value }))} className="gank-input">
                    {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="font-orbitron block mb-1" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>TO</label>
                  <select value={form.to_agent} onChange={(e) => setForm((f) => ({ ...f, to_agent: e.target.value }))} className="gank-input">
                    <option value="">BROADCAST ALL</option>
                    {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="font-orbitron block mb-1" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>TYPE</label>
                <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className="gank-input">
                  <option value="message">MESSAGE</option>
                  <option value="task">TASK</option>
                  <option value="broadcast">BROADCAST</option>
                </select>
              </div>
              <div>
                <label className="font-orbitron block mb-1" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>CONTENT</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                  rows={4}
                  className="gank-input resize-none"
                  placeholder="Enter message..."
                />
              </div>
            </div>
            <div className="p-4 border-t flex gap-2" style={{ borderColor: '#111820' }}>
              <button onClick={sendMessage} disabled={sending || !form.content} className="btn-deploy flex-1">
                {sending ? 'SENDING...' : 'TRANSMIT'}
              </button>
              <button onClick={() => setShowCompose(false)} className="px-4 py-2 rounded text-xs font-orbitron" style={{ background: '#111820', border: '1px solid #1a2535', color: '#64748b', letterSpacing: '0.08em' }}>
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
