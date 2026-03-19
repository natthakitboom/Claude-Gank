'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import {
  ChevronRight, ChevronDown, File, Folder, FolderOpen,
  Save, Play, Square, RefreshCw, ChevronLeft, Send,
  Terminal, Code2, MessageSquare, Loader2, X, Plus,
} from 'lucide-react'

// Monaco Editor loaded client-side only
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false, loading: () => (
  <div className="flex items-center justify-center h-full text-gray-600 text-xs font-mono">Loading editor…</div>
)})

// ─── Types ──────────────────────────────────────────────────────────────────
interface FileNode { name: string; path: string; type: 'file' | 'dir'; size?: number; children?: FileNode[]; skipped?: boolean }
interface Project { id: string; name: string; description: string; work_dir: string; docker_compose_path: string; mission_id: string }
interface Agent { id: string; name: string; role: string; team: string; color: string }
interface ChatMsg { role: 'user' | 'agent'; text: string; agentName?: string }

// ─── Language detection ──────────────────────────────────────────────────────
function langFromPath(p: string) {
  const ext = p.split('.').pop()?.toLowerCase()
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    py: 'python', rs: 'rust', go: 'go', java: 'java', rb: 'ruby',
    css: 'css', scss: 'scss', html: 'html', json: 'json', yaml: 'yaml', yml: 'yaml',
    md: 'markdown', sh: 'shell', bash: 'shell', sql: 'sql', toml: 'toml',
    dockerfile: 'dockerfile', prisma: 'prisma', env: 'plaintext',
  }
  if (p.toLowerCase().includes('dockerfile')) return 'dockerfile'
  return map[ext || ''] || 'plaintext'
}

// ─── FileTree component ──────────────────────────────────────────────────────
function FileTree({ nodes, onSelect, selected }: { nodes: FileNode[]; onSelect: (n: FileNode) => void; selected: string }) {
  const [open, setOpen] = useState<Set<string>>(new Set())
  function toggle(path: string) {
    setOpen(s => { const n = new Set(s); n.has(path) ? n.delete(path) : n.add(path); return n })
  }
  function render(nodes: FileNode[], depth = 0): React.ReactNode {
    return nodes.map(n => (
      <div key={n.path}>
        <div
          className="flex items-center gap-1 cursor-pointer select-none hover:bg-white/5 rounded px-1 py-0.5 transition-colors"
          style={{ paddingLeft: `${8 + depth * 12}px`, background: selected === n.path ? 'rgba(0,230,255,0.08)' : undefined }}
          onClick={() => n.type === 'dir' ? toggle(n.path) : onSelect(n)}
        >
          {n.type === 'dir' ? (
            <>
              {open.has(n.path)
                ? <ChevronDown size={10} className="text-gray-500 flex-shrink-0" />
                : <ChevronRight size={10} className="text-gray-500 flex-shrink-0" />
              }
              {open.has(n.path)
                ? <FolderOpen size={12} className="flex-shrink-0" style={{ color: '#f0db4f' }} />
                : <Folder size={12} className="flex-shrink-0" style={{ color: '#f0db4f' }} />
              }
            </>
          ) : (
            <>
              <span className="w-[10px] flex-shrink-0" />
              <File size={12} className="flex-shrink-0 text-gray-500" />
            </>
          )}
          <span className="text-xs truncate" style={{ color: n.type === 'dir' ? '#e2e8f0' : '#94a3b8', fontSize: '11px' }}>
            {n.name}
          </span>
          {n.skipped && <span className="text-gray-600 ml-1" style={{ fontSize: '9px' }}>…</span>}
        </div>
        {n.type === 'dir' && open.has(n.path) && n.children && render(n.children, depth + 1)}
      </div>
    ))
  }
  return <>{render(nodes)}</>
}

// ─── Main IDE ────────────────────────────────────────────────────────────────
export default function ProjectIDE({ params }: { params: { id: string } }) {
  const [project, setProject] = useState<Project | null>(null)
  const [fileTree, setFileTree] = useState<FileNode[]>([])
  const [openFiles, setOpenFiles] = useState<{ path: string; content: string; dirty: boolean }[]>([])
  const [activeFile, setActiveFile] = useState<string>('')
  const [terminal, setTerminal] = useState<string>('')
  const [cmd, setCmd] = useState('')
  const [running, setRunning] = useState(false)
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<string>('')
  const [chat, setChat] = useState<ChatMsg[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [panel, setPanel] = useState<'terminal' | 'chat'>('terminal')
  const [saving, setSaving] = useState(false)
  const termRef = useRef<HTMLDivElement>(null)
  const chatRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Load project
  useEffect(() => {
    fetch(`/api/projects/${params.id}/files`)
      .then(r => r.json())
      .then(d => setFileTree(d.tree || []))
    fetch(`/api/projects`)
      .then(r => r.json())
      .then((list: Project[]) => {
        const p = list.find(x => x.id === params.id)
        if (p) setProject(p)
      })
    fetch('/api/agents')
      .then(r => r.json())
      .then((list: Agent[]) => {
        setAgents(list)
        const tech = list.find(a => a.team === 'TECH')
        if (tech) setSelectedAgent(tech.id)
      })
  }, [params.id])

  // Scroll terminal to bottom
  useEffect(() => {
    if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight
  }, [terminal])
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [chat])

  // Open file in editor
  async function openFile(node: FileNode) {
    if (openFiles.find(f => f.path === node.path)) {
      setActiveFile(node.path)
      return
    }
    const res = await fetch(`/api/projects/${params.id}/files?file=${encodeURIComponent(node.path)}`)
    const data = await res.json()
    if (data.content !== undefined) {
      setOpenFiles(f => [...f, { path: node.path, content: data.content, dirty: false }])
      setActiveFile(node.path)
    }
  }

  function closeFile(path: string) {
    setOpenFiles(f => f.filter(x => x.path !== path))
    if (activeFile === path) {
      const remaining = openFiles.filter(x => x.path !== path)
      setActiveFile(remaining[remaining.length - 1]?.path || '')
    }
  }

  function updateContent(content: string) {
    setOpenFiles(f => f.map(x => x.path === activeFile ? { ...x, content, dirty: true } : x))
  }

  async function saveFile() {
    const file = openFiles.find(f => f.path === activeFile)
    if (!file) return
    setSaving(true)
    await fetch(`/api/projects/${params.id}/files`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: file.path, content: file.content }),
    })
    setOpenFiles(f => f.map(x => x.path === activeFile ? { ...x, dirty: false } : x))
    setSaving(false)
  }

  // Run terminal command
  async function runCmd(e?: React.FormEvent) {
    e?.preventDefault()
    if (!cmd.trim() || running) return
    setRunning(true)
    setPanel('terminal')
    setTerminal(t => t + `\n$ ${cmd}\n`)
    const abort = new AbortController()
    abortRef.current = abort
    const cmdCopy = cmd
    setCmd('')
    try {
      const res = await fetch(`/api/projects/${params.id}/exec`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cmd: cmdCopy }),
        signal: abort.signal,
      })
      if (!res.body) return
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const text = decoder.decode(value)
        for (const line of text.split('\n')) {
          if (line.startsWith('data: ')) {
            try { const { text: t } = JSON.parse(line.slice(6)); setTerminal(prev => prev + t) } catch {}
          }
        }
      }
    } catch {}
    setRunning(false)
  }

  function killProcess() {
    abortRef.current?.abort()
    fetch(`/api/projects/${params.id}/exec`, { method: 'DELETE' })
    setTerminal(t => t + '\n[killed]\n')
    setRunning(false)
  }

  // Refresh file tree
  async function refreshTree() {
    const res = await fetch(`/api/projects/${params.id}/files`)
    const d = await res.json()
    setFileTree(d.tree || [])
  }

  // Agent chat — creates a mission for the selected agent
  async function sendChat(e?: React.FormEvent) {
    e?.preventDefault()
    if (!chatInput.trim() || chatLoading || !selectedAgent) return
    const userMsg = chatInput.trim()
    setChatInput('')
    setChatLoading(true)
    setPanel('chat')
    setChat(c => [...c, { role: 'user', text: userMsg }])

    const agent = agents.find(a => a.id === selectedAgent)

    // Create mission with work_dir context
    const description = `## 📁 Work Directory\nบันทึกไฟล์ทั้งหมดไว้ที่: \`${project?.work_dir}\`\n\n## งาน\n${userMsg}${activeFile ? `\n\n## ไฟล์ที่กำลังแก้ไข\n\`${activeFile}\`` : ''}`
    const missionRes = await fetch('/api/missions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: userMsg.slice(0, 80),
        description,
        agent_id: selectedAgent,
        priority: 'high',
        parent_mission_id: project?.mission_id || null,
      }),
    })
    const mission = await missionRes.json()

    // Stream execution
    let output = ''
    try {
      const execRes = await fetch(`/api/missions/${mission.id}/execute`, { method: 'POST' })
      if (execRes.body) {
        const reader = execRes.body.getReader()
        const decoder = new TextDecoder()
        let partial = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          partial += decoder.decode(value)
          const lines = partial.split('\n')
          partial = lines.pop() || ''
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try { const ev = JSON.parse(line.slice(6)); if (ev.type === 'chunk') output += ev.text } catch {}
            }
          }
          // Live update last chat msg
          setChat(c => {
            const last = c[c.length - 1]
            if (last?.role === 'agent') return [...c.slice(0, -1), { ...last, text: output }]
            return [...c, { role: 'agent', text: output, agentName: agent?.name }]
          })
        }
      }
    } catch {}

    if (!output) output = '(ไม่มี output)'
    setChat(c => {
      const last = c[c.length - 1]
      if (last?.role === 'agent') return [...c.slice(0, -1), { ...last, text: output }]
      return [...c, { role: 'agent', text: output, agentName: agent?.name }]
    })
    setChatLoading(false)
    // Refresh file tree since agent may have created/modified files
    setTimeout(refreshTree, 1000)
  }

  const activeFileObj = openFiles.find(f => f.path === activeFile)

  if (!project) return (
    <div className="flex items-center justify-center h-screen text-gray-600">
      <Loader2 className="animate-spin mr-2" size={16} />
      <span className="font-mono text-xs">Loading project…</span>
    </div>
  )

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#070b10', color: '#e2e8f0' }}>
      {/* ── Top Bar ── */}
      <div className="flex items-center gap-3 px-3 py-2 flex-shrink-0" style={{ background: '#0a0e14', borderBottom: '1px solid #111820' }}>
        <a href="/projects" className="flex items-center gap-1 text-gray-500 hover:text-white transition-colors">
          <ChevronLeft size={14} />
        </a>
        <div className="w-px h-4" style={{ background: '#1a2535' }} />
        <Code2 size={14} style={{ color: '#00e5ff' }} />
        <span className="font-orbitron text-sm font-bold text-white">{project.name}</span>
        <span className="text-gray-600 text-xs font-mono truncate hidden md:block" style={{ maxWidth: 300 }}>{project.work_dir}</span>
        <div className="flex-1" />
        {/* Quick run buttons */}
        <button
          onClick={() => { setCmd('ls -la'); setTimeout(() => runCmd(), 50) }}
          disabled={running}
          className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-gray-400 hover:text-white transition-colors"
          style={{ background: '#0d1117', border: '1px solid #1a2535' }}
          title="List files"
        >
          <Terminal size={11} /> ls
        </button>
        <button
          onClick={() => { setCmd('cat docker-compose.yml 2>/dev/null || echo "no docker-compose.yml"'); setTimeout(() => runCmd(), 50) }}
          disabled={running}
          className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-gray-400 hover:text-white transition-colors"
          style={{ background: '#0d1117', border: '1px solid #1a2535' }}
          title="View docker-compose"
        >
          🐳
        </button>
        <button
          onClick={refreshTree}
          className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-gray-500 hover:text-white transition-colors"
          style={{ background: '#0d1117', border: '1px solid #1a2535' }}
        >
          <RefreshCw size={11} />
        </button>
        {activeFileObj?.dirty && (
          <button
            onClick={saveFile}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold text-white"
            style={{ background: '#0066ff' }}
          >
            <Save size={11} />
            {saving ? 'Saving…' : 'Save'}
          </button>
        )}
      </div>

      {/* ── Main layout ── */}
      <div className="flex flex-1 min-h-0">

        {/* ── File tree ── */}
        <div className="flex flex-col flex-shrink-0 overflow-y-auto" style={{ width: 220, background: '#0a0e14', borderRight: '1px solid #111820' }}>
          <div className="flex items-center justify-between px-3 py-2 flex-shrink-0" style={{ borderBottom: '1px solid #111820' }}>
            <span className="font-orbitron text-gray-500" style={{ fontSize: '9px', letterSpacing: '0.1em' }}>FILES</span>
            <button onClick={refreshTree} className="text-gray-600 hover:text-gray-400 transition-colors">
              <RefreshCw size={10} />
            </button>
          </div>
          {fileTree.length === 0 ? (
            <div className="px-3 py-4 text-gray-600 text-xs font-mono">empty directory</div>
          ) : (
            <div className="py-1 overflow-y-auto flex-1">
              <FileTree nodes={fileTree} onSelect={openFile} selected={activeFile} />
            </div>
          )}
        </div>

        {/* ── Center: Editor + Bottom panel ── */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Tab bar */}
          <div className="flex items-center gap-0 overflow-x-auto flex-shrink-0" style={{ background: '#0a0e14', borderBottom: '1px solid #111820', minHeight: 34 }}>
            {openFiles.length === 0 ? (
              <div className="px-4 py-2 text-gray-600 text-xs font-mono">← click a file to open</div>
            ) : openFiles.map(f => (
              <div
                key={f.path}
                className="flex items-center gap-2 px-3 py-1.5 cursor-pointer flex-shrink-0 transition-colors"
                style={{
                  background: f.path === activeFile ? '#0d1117' : 'transparent',
                  borderRight: '1px solid #111820',
                  borderBottom: f.path === activeFile ? '1px solid #0066ff' : '1px solid transparent',
                }}
                onClick={() => setActiveFile(f.path)}
              >
                <span className="text-xs font-mono" style={{ color: f.path === activeFile ? '#e2e8f0' : '#6b7280', fontSize: '11px' }}>
                  {f.path.split('/').pop()}
                  {f.dirty && <span style={{ color: '#f0db4f' }}>●</span>}
                </span>
                <button
                  onClick={e => { e.stopPropagation(); closeFile(f.path) }}
                  className="text-gray-600 hover:text-gray-300 transition-colors"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>

          {/* Editor area */}
          <div className="flex-1 min-h-0" style={{ minHeight: 0 }}>
            {activeFileObj ? (
              <MonacoEditor
                height="100%"
                language={langFromPath(activeFileObj.path)}
                value={activeFileObj.content}
                onChange={v => updateContent(v || '')}
                theme="vs-dark"
                options={{
                  fontSize: 13,
                  fontFamily: '"Fira Code", "Cascadia Code", Menlo, monospace',
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  lineNumbers: 'on',
                  renderLineHighlight: 'gutter',
                  wordWrap: 'on',
                  tabSize: 2,
                  padding: { top: 8 },
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-700">
                <Code2 size={40} className="opacity-20" />
                <p className="font-orbitron text-xs">เลือกไฟล์จาก File Tree ด้านซ้าย</p>
              </div>
            )}
          </div>

          {/* Bottom panel — Terminal / Chat tabs */}
          <div className="flex flex-col flex-shrink-0" style={{ height: 240, borderTop: '1px solid #111820' }}>
            {/* Panel tabs */}
            <div className="flex items-center flex-shrink-0" style={{ background: '#0a0e14', borderBottom: '1px solid #111820' }}>
              {[
                { key: 'terminal', icon: <Terminal size={11} />, label: 'TERMINAL' },
                { key: 'chat', icon: <MessageSquare size={11} />, label: 'ASK AGENT' },
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => setPanel(t.key as any)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-orbitron transition-colors"
                  style={{
                    color: panel === t.key ? '#00e5ff' : '#4a5568',
                    borderBottom: panel === t.key ? '1px solid #00e5ff' : '1px solid transparent',
                    fontSize: '9px', letterSpacing: '0.08em',
                  }}
                >
                  {t.icon} {t.label}
                </button>
              ))}
              <div className="flex-1" />
              {panel === 'terminal' && running && (
                <button onClick={killProcess} className="flex items-center gap-1 px-3 py-1 text-xs text-red-400 hover:text-red-300">
                  <Square size={10} /> KILL
                </button>
              )}
              {panel === 'terminal' && (
                <button onClick={() => setTerminal('')} className="px-3 py-1 text-xs text-gray-600 hover:text-gray-400">CLEAR</button>
              )}
            </div>

            {/* Terminal */}
            {panel === 'terminal' && (
              <div className="flex flex-col flex-1 min-h-0">
                <div
                  ref={termRef}
                  className="flex-1 overflow-y-auto px-3 py-2 font-mono text-xs text-green-400 whitespace-pre-wrap"
                  style={{ background: '#040709', fontSize: '11px', lineHeight: 1.6 }}
                >
                  {terminal || <span className="text-gray-700">// terminal output will appear here</span>}
                  {running && <span className="animate-pulse text-yellow-400">█</span>}
                </div>
                <form onSubmit={runCmd} className="flex items-center gap-2 px-3 py-2 flex-shrink-0" style={{ borderTop: '1px solid #111820', background: '#040709' }}>
                  <span className="text-green-500 font-mono text-xs flex-shrink-0">$</span>
                  <input
                    value={cmd}
                    onChange={e => setCmd(e.target.value)}
                    className="flex-1 bg-transparent font-mono text-xs text-green-300 outline-none"
                    placeholder="npm install / docker compose up -d / ls -la …"
                    disabled={running}
                    style={{ fontSize: '11px' }}
                  />
                  <button
                    type="submit"
                    disabled={running || !cmd.trim()}
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-xs disabled:opacity-40"
                    style={{ background: '#0a1a0a', border: '1px solid #1a3a1a', color: '#22c55e' }}
                  >
                    {running ? <Loader2 size={10} className="animate-spin" /> : <Play size={10} />}
                  </button>
                </form>
              </div>
            )}

            {/* Agent chat */}
            {panel === 'chat' && (
              <div className="flex flex-col flex-1 min-h-0">
                {/* Agent selector */}
                <div className="flex items-center gap-2 px-3 py-1.5 flex-shrink-0" style={{ borderBottom: '1px solid #111820', background: '#0a0e14' }}>
                  <span className="font-orbitron text-gray-600" style={{ fontSize: '9px' }}>AGENT:</span>
                  <select
                    value={selectedAgent}
                    onChange={e => setSelectedAgent(e.target.value)}
                    className="flex-1 bg-transparent text-xs text-gray-300 outline-none cursor-pointer"
                    style={{ fontSize: '11px' }}
                  >
                    {agents.map(a => (
                      <option key={a.id} value={a.id} style={{ background: '#0d1117' }}>
                        {a.name} — {a.role}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Messages */}
                <div ref={chatRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-2" style={{ background: '#070b10' }}>
                  {chat.length === 0 && (
                    <div className="text-gray-700 text-xs font-mono py-2">// พิมพ์คำสั่งให้ agent เขียน/แก้ code ในโปรเจคนี้</div>
                  )}
                  {chat.map((m, i) => (
                    <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {m.role === 'agent' && (
                        <div className="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center text-xs" style={{ background: '#0d1117', border: '1px solid #1a2535' }}>🤖</div>
                      )}
                      <div
                        className="rounded-lg px-3 py-2 text-xs font-mono max-w-[85%] whitespace-pre-wrap"
                        style={{
                          background: m.role === 'user' ? '#0066ff22' : '#0d1117',
                          border: `1px solid ${m.role === 'user' ? '#0066ff44' : '#1a2535'}`,
                          color: m.role === 'user' ? '#93c5fd' : '#94a3b8',
                          fontSize: '11px',
                        }}
                      >
                        {m.agentName && <div className="font-orbitron mb-1" style={{ fontSize: '9px', color: '#00e5ff' }}>{m.agentName}</div>}
                        {m.text}
                      </div>
                    </div>
                  ))}
                  {chatLoading && chat[chat.length - 1]?.role === 'user' && (
                    <div className="flex gap-2">
                      <div className="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center text-xs" style={{ background: '#0d1117', border: '1px solid #1a2535' }}>🤖</div>
                      <div className="rounded-lg px-3 py-2 text-xs" style={{ background: '#0d1117', border: '1px solid #1a2535' }}>
                        <Loader2 size={12} className="animate-spin text-gray-500" />
                      </div>
                    </div>
                  )}
                </div>
                {/* Input */}
                <form onSubmit={sendChat} className="flex items-center gap-2 px-3 py-2 flex-shrink-0" style={{ borderTop: '1px solid #111820', background: '#0a0e14' }}>
                  <input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    className="flex-1 bg-transparent text-xs text-gray-300 outline-none"
                    placeholder="สร้าง API endpoint / แก้ bug / เพิ่ม feature…"
                    disabled={chatLoading}
                    style={{ fontSize: '11px' }}
                  />
                  <button
                    type="submit"
                    disabled={chatLoading || !chatInput.trim()}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs disabled:opacity-40"
                    style={{ background: '#001a40', border: '1px solid #0066ff44', color: '#60a5fa' }}
                  >
                    {chatLoading ? <Loader2 size={10} className="animate-spin" /> : <Send size={10} />}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
