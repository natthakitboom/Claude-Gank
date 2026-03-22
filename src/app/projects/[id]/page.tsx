'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import {
  ChevronRight, ChevronDown, File, Folder, FolderOpen,
  Save, Play, Square, RefreshCw, ChevronLeft, Send,
  Terminal, Code2, MessageSquare, Loader2, X, Columns2,
} from 'lucide-react'

// Monaco Editor loaded client-side only
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false, loading: () => (
  <div className="flex items-center justify-center h-full text-gray-600 text-xs font-mono">Loading editor…</div>
)})

// ─── Types ───────────────────────────────────────────────────────────────────
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

// ─── FileTree ────────────────────────────────────────────────────────────────
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
              {open.has(n.path) ? <ChevronDown size={10} className="text-gray-500 flex-shrink-0" /> : <ChevronRight size={10} className="text-gray-500 flex-shrink-0" />}
              {open.has(n.path) ? <FolderOpen size={12} className="flex-shrink-0" style={{ color: '#f0db4f' }} /> : <Folder size={12} className="flex-shrink-0" style={{ color: '#f0db4f' }} />}
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

// ─── Editor Pane (reusable for split view) ───────────────────────────────────
function EditorPane({
  openFiles, activeFile, setActiveFile, closeFile, updateContent,
  isFocused, onFocus,
}: {
  openFiles: { path: string; content: string; dirty: boolean }[]
  activeFile: string
  setActiveFile: (p: string) => void
  closeFile: (p: string) => void
  updateContent: (content: string, path: string) => void
  isFocused?: boolean
  onFocus?: () => void
}) {
  const activeFileObj = openFiles.find(f => f.path === activeFile)
  const editorContainerRef = useRef<HTMLDivElement>(null)
  const editorInstanceRef = useRef<Parameters<NonNullable<React.ComponentProps<typeof MonacoEditor>['onMount']>>[0] | null>(null)

  // ResizeObserver — บังคับ Monaco recalculate ทุกครั้งที่ container เปลี่ยนขนาด
  useEffect(() => {
    const container = editorContainerRef.current
    if (!container) return
    const ro = new ResizeObserver(() => {
      if (editorInstanceRef.current) {
        const { width, height } = container.getBoundingClientRect()
        if (width > 0 && height > 0) {
          editorInstanceRef.current.layout({ width, height })
        }
      }
    })
    ro.observe(container)
    return () => ro.disconnect()
  }, [])

  return (
    <div
      className="flex flex-col min-w-0"
      style={{ outline: isFocused ? '1px solid #00e5ff22' : 'none', flex: 1, minWidth: 0, overflow: 'hidden' }}
      onClick={onFocus}
    >
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
            <button onClick={e => { e.stopPropagation(); closeFile(f.path) }} className="text-gray-600 hover:text-gray-300 transition-colors">
              <X size={10} />
            </button>
          </div>
        ))}
      </div>
      {/* Editor — outer div เป็น flex item, inner div เป็น absolute ให้ Monaco มี bounding box ชัดเจน */}
      <div ref={editorContainerRef} style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
        {activeFileObj ? (
          <MonacoEditor
            width="100%"
            height="100%"
            language={langFromPath(activeFileObj.path)}
            value={activeFileObj.content}
            onChange={v => updateContent(v || '', activeFileObj.path)}
            theme="vs-dark"
            onMount={(editor) => {
              editorInstanceRef.current = editor
              editor.layout()
            }}
            options={{
              fontSize: 13,
              fontFamily: '"Fira Code", "Cascadia Code", Menlo, monospace',
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              lineNumbers: 'on',
              renderLineHighlight: 'gutter',
              wordWrap: 'off',
              tabSize: 2,
              padding: { top: 8 },
              automaticLayout: true,
              scrollbar: { vertical: 'auto', horizontal: 'auto' },
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-700">
            <Code2 size={40} className="opacity-20" />
            <p className="font-orbitron text-xs">เลือกไฟล์จาก File Tree ด้านซ้าย</p>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}

// ─── Main IDE ────────────────────────────────────────────────────────────────
export default function ProjectIDE({ params }: { params: { id: string } }) {
  const [project, setProject] = useState<Project | null>(null)
  const [fileTree, setFileTree] = useState<FileNode[]>([])
  const [openFiles, setOpenFiles] = useState<{ path: string; content: string; dirty: boolean }[]>([])
  const [activeFile, setActiveFile] = useState<string>('')        // left pane active
  const [rightFile, setRightFile] = useState<string>('')          // right pane active (split view)
  const [focusedPane, setFocusedPane] = useState<'left' | 'right'>('left')
  const [splitView, setSplitView] = useState(false)
  const [splitRatio, setSplitRatio] = useState(0.5)               // 0..1, left:right ratio

  const [terminal, setTerminal] = useState<string>('')
  const [cmd, setCmd] = useState('')
  const [running, setRunning] = useState(false)
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<string>('')
  const [chat, setChat] = useState<ChatMsg[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [panel, setPanel] = useState<'terminal' | 'chat' | 'git' | 'logs'>('terminal')
  const [gitLog, setGitLog] = useState<{ hash: string; fullHash: string; msg: string; date: string; author: string; tags: string[] }[]>([])
  const [gitLoading, setGitLoading] = useState(false)
  const [gitHasRepo, setGitHasRepo] = useState<boolean | null>(null) // null = ยังไม่รู้
  const [dockerLogs, setDockerLogs] = useState<string>('')
  const [logsStreaming, setLogsStreaming] = useState(false)
  const logsRef = useRef<HTMLDivElement>(null)
  const logsAbortRef = useRef<AbortController | null>(null)
  const [saving, setSaving] = useState(false)

  // Panel height (vertical resize)
  const [panelHeight, setPanelHeight] = useState(240)
  const vResizing = useRef(false)
  const vResizeStart = useRef({ y: 0, h: 0 })

  // Horizontal split divider
  const hResizing = useRef(false)
  const hResizeStart = useRef({ x: 0, ratio: 0.5 })
  const editorAreaRef = useRef<HTMLDivElement>(null)

  const termRef = useRef<HTMLDivElement>(null)
  const chatRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // ── Load project ─────────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`/api/projects/${params.id}/files`).then(r => r.json()).then(d => setFileTree(d.tree || []))
    fetch('/api/projects').then(r => r.json()).then((list: Project[]) => {
      const p = list.find(x => x.id === params.id)
      if (p) setProject(p)
    })
    fetch('/api/agents').then(r => r.json()).then((list: Agent[]) => {
      setAgents(list)
      const senior = list.find(a => a.id === 'agent-coder')
        || list.find(a => a.role?.toLowerCase().includes('senior'))
        || list.find(a => a.team === 'TECH')
      if (senior) setSelectedAgent(senior.id)
    })
    // โหลด chat history จาก DB + migrate จาก localStorage ถ้ามี
    fetch(`/api/projects/${params.id}/chat`).then(r => r.json()).then(async d => {
      if (d.messages?.length > 0) {
        setChat(d.messages.map((m: any) => ({ role: m.role, text: m.text, agentName: m.agent_name })))
      } else {
        // Migrate จาก localStorage ถ้ายังมีอยู่
        try {
          const local = JSON.parse(localStorage.getItem(`ide-chat-${params.id}`) || '[]')
          if (local.length > 0) {
            setChat(local)
            await fetch(`/api/projects/${params.id}/chat`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(local.map((m: ChatMsg) => ({ role: m.role, text: m.text, agent_name: m.agentName }))),
            })
            localStorage.removeItem(`ide-chat-${params.id}`)
          }
        } catch {}
      }
    })
  }, [params.id])

  useEffect(() => { if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight }, [terminal])
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [chat])

  // ── Vertical resize (bottom panel) ───────────────────────────────────────
  const onVResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    vResizing.current = true
    vResizeStart.current = { y: e.clientY, h: panelHeight }
  }, [panelHeight])

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!vResizing.current) return
      const delta = vResizeStart.current.y - e.clientY
      const next = Math.max(60, Math.min(700, vResizeStart.current.h + delta))
      setPanelHeight(next)
    }
    function onUp() { vResizing.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  // ── Horizontal split resize ───────────────────────────────────────────────
  const onHResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    hResizing.current = true
    hResizeStart.current = { x: e.clientX, ratio: splitRatio }
  }, [splitRatio])

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!hResizing.current || !editorAreaRef.current) return
      const rect = editorAreaRef.current.getBoundingClientRect()
      const ratio = Math.max(0.15, Math.min(0.85, (e.clientX - rect.left) / rect.width))
      setSplitRatio(ratio)
    }
    function onUp() { hResizing.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  // ── File operations ──────────────────────────────────────────────────────
  async function openFile(node: FileNode) {
    if (!openFiles.find(f => f.path === node.path)) {
      const res = await fetch(`/api/projects/${params.id}/files?file=${encodeURIComponent(node.path)}`)
      const data = await res.json()
      if (data.content !== undefined) {
        setOpenFiles(f => [...f, { path: node.path, content: data.content, dirty: false }])
      }
    }
    // open in focused pane
    if (splitView && focusedPane === 'right') setRightFile(node.path)
    else setActiveFile(node.path)
  }

  function closeFile(path: string) {
    setOpenFiles(f => f.filter(x => x.path !== path))
    if (activeFile === path) {
      const remaining = openFiles.filter(x => x.path !== path)
      setActiveFile(remaining[remaining.length - 1]?.path || '')
    }
    if (rightFile === path) setRightFile('')
  }

  function updateContent(content: string, path: string) {
    setOpenFiles(f => f.map(x => x.path === path ? { ...x, content, dirty: true } : x))
  }

  async function saveFile() {
    const targetPath = focusedPane === 'right' && splitView ? rightFile : activeFile
    const file = openFiles.find(f => f.path === targetPath)
    if (!file) return
    setSaving(true)
    await fetch(`/api/projects/${params.id}/files`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: file.path, content: file.content }),
    })
    setOpenFiles(f => f.map(x => x.path === targetPath ? { ...x, dirty: false } : x))
    setSaving(false)
  }

  // ── Terminal ─────────────────────────────────────────────────────────────
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
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cmd: cmdCopy }), signal: abort.signal,
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

  async function refreshTree() {
    const res = await fetch(`/api/projects/${params.id}/files`)
    const d = await res.json()
    setFileTree(d.tree || [])
  }

  // ── Stream SSE helper ────────────────────────────────────────────────────
  async function streamMission(missionId: string, onChunk: (text: string) => void) {
    const execRes = await fetch(`/api/missions/${missionId}/execute`, { method: 'POST' })
    if (!execRes.body) return ''
    const reader = execRes.body.getReader()
    const decoder = new TextDecoder()
    let partial = ''; let full = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      partial += decoder.decode(value)
      const lines = partial.split('\n'); partial = lines.pop() || ''
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try { const ev = JSON.parse(line.slice(6)); if (ev.type === 'chunk') { full += ev.text; onChunk(full) } } catch {}
        }
      }
    }
    return full
  }

  // ── Agent chat ───────────────────────────────────────────────────────────
  async function sendChat(e?: React.FormEvent) {
    e?.preventDefault()
    if (!chatInput.trim() || chatLoading || !selectedAgent) return
    const userMsg = chatInput.trim()
    setChatInput('')
    setChatLoading(true)
    setPanel('chat')
    setChat(c => [...c, { role: 'user', text: userMsg }])
    // Save user message to DB
    fetch(`/api/projects/${params.id}/chat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{ role: 'user', text: userMsg }]),
    }).catch(() => {})
    const agent = agents.find(a => a.id === selectedAgent)
    const isSecretary = agent?.id === 'agent-secretary' || agent?.role?.toLowerCase().includes('coordinator')
    const currentFile = focusedPane === 'right' && splitView ? rightFile : activeFile

    // Build conversation history (เอาแค่ 10 รอบล่าสุด เพื่อไม่ให้ context บวมเกิน)
    const historyMsgs = chat.slice(-20) // 10 รอบ = 20 messages (user+agent)
    const historyBlock = historyMsgs.length > 0
      ? `## 💬 บทสนทนาก่อนหน้า\n${historyMsgs.map(m =>
          m.role === 'user'
            ? `**User:** ${m.text}`
            : `**${m.agentName || 'Agent'}:** ${m.text.slice(0, 800)}${m.text.length > 800 ? '…' : ''}`
        ).join('\n\n')}\n\n---\n\n`
      : ''

    const description = `## 📁 Work Directory\nบันทึกไฟล์ทั้งหมดไว้ที่: \`${project?.work_dir}\`\n\n${historyBlock}## งาน (ข้อความล่าสุด)\n${userMsg}${currentFile ? `\n\n## ไฟล์ที่กำลังแก้ไข\n\`${currentFile}\`` : ''}`

    try {
      // ── Step 1: สร้าง mission แล้ว stream output ของ agent ที่เลือก ──────
      const missionRes = await fetch('/api/missions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: userMsg.slice(0, 80), description, agent_id: selectedAgent, priority: 'high', parent_mission_id: project?.mission_id || null }),
      })
      const mission = await missionRes.json()

      let secretaryOutput = ''
      await streamMission(mission.id, text => {
        secretaryOutput = text
        if (isSecretary) {
          // แสดง "เลขากำลังวิเคราะห์..." ขณะรอ
          setChat(c => {
            const last = c[c.length - 1]
            const preview = `⏳ กำลังวิเคราะห์และมอบหมายงาน…`
            if (last?.role === 'agent') return [...c.slice(0, -1), { ...last, text: preview }]
            return [...c, { role: 'agent', text: preview, agentName: agent?.name }]
          })
        } else {
          setChat(c => {
            const last = c[c.length - 1]
            if (last?.role === 'agent') return [...c.slice(0, -1), { ...last, text }]
            return [...c, { role: 'agent', text, agentName: agent?.name }]
          })
        }
      })

      // ── Step 2: ถ้าเป็นเลขา ให้ parse ---MINI-TASKS--- แล้ว execute ทุก agent ──
      if (isSecretary) {
        type MiniTask = { agent_name: string; title: string; description: string }
        const miniMatch = secretaryOutput.match(/---MINI-TASKS---\s*([\s\S]*?)\s*---END---/)
        let tasks: MiniTask[] = []
        if (miniMatch) {
          try { tasks = JSON.parse(miniMatch[1]) } catch {}
          if (!Array.isArray(tasks)) tasks = []
        }

        if (tasks.length > 0) {
          // แสดง summary ว่าเลขามอบหมายให้ใครบ้าง
          const names = tasks.map(t => t.agent_name).join(', ')
          setChat(c => {
            const last = c[c.length - 1]
            const msg = `✅ เลขามอบหมายงานให้: ${names}\nกำลังดำเนินงาน…`
            if (last?.role === 'agent') return [...c.slice(0, -1), { ...last, text: msg }]
            return [...c, { role: 'agent', text: msg, agentName: agent?.name }]
          })

          // Execute แต่ละ task ตามลำดับ (sequential เพื่อไม่ให้ไฟล์ conflict)
          for (const task of tasks) {
            const targetAgent = agents.find(a =>
              a.name.toLowerCase().includes(task.agent_name.toLowerCase()) ||
              task.agent_name.toLowerCase().includes(a.name.toLowerCase())
            )
            if (!targetAgent) continue

            // แจ้งว่า agent ไหนกำลังทำงาน
            setChat(c => [...c, {
              role: 'agent',
              text: `⚙️ ${targetAgent.name} กำลังทำงาน…`,
              agentName: targetAgent.name,
            }])

            const subDesc = `${task.description}\n\n## 📁 Work Directory\nบันทึกไฟล์ทั้งหมดไว้ที่: \`${project?.work_dir}\`${currentFile ? `\n\n## ไฟล์ที่กำลังแก้ไข\n\`${currentFile}\`` : ''}`
            const subMissionRes = await fetch('/api/missions', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: task.title.slice(0, 80),
                description: subDesc,
                agent_id: targetAgent.id,
                priority: 'high',
                parent_mission_id: project?.mission_id || null,
              }),
            })
            const subMission = await subMissionRes.json()

            let subOutput = ''
            await streamMission(subMission.id, text => {
              subOutput = text
              // อัพเดทข้อความของ agent นี้ใน chat (ล่าสุด)
              setChat(c => {
                const idx = [...c].reverse().findIndex(m => m.role === 'agent' && m.agentName === targetAgent.name)
                if (idx === -1) return [...c, { role: 'agent', text, agentName: targetAgent.name }]
                const realIdx = c.length - 1 - idx
                return [...c.slice(0, realIdx), { ...c[realIdx], text }, ...c.slice(realIdx + 1)]
              })
            })
            if (!subOutput) {
              setChat(c => {
                const idx = [...c].reverse().findIndex(m => m.role === 'agent' && m.agentName === targetAgent.name)
                const realIdx = c.length - 1 - idx
                return [...c.slice(0, realIdx), { ...c[realIdx], text: '(ไม่มี output)' }, ...c.slice(realIdx + 1)]
              })
            }
          }
        } else {
          // parse ไม่ได้ — แสดง output เลขาตรงๆ
          setChat(c => {
            const last = c[c.length - 1]
            if (last?.role === 'agent') return [...c.slice(0, -1), { ...last, text: secretaryOutput || '(ไม่มี output)' }]
            return [...c, { role: 'agent', text: secretaryOutput || '(ไม่มี output)', agentName: agent?.name }]
          })
        }
      }
    } catch (err) {
      setChat(c => [...c, { role: 'agent', text: `เกิดข้อผิดพลาด: ${String(err)}`, agentName: agent?.name }])
    }

    // Save agent responses to DB — อ่าน chat state ล่าสุดหลัง stream เสร็จ
    setChat(c => {
      const agentMsgs = c.filter(m => m.role === 'agent').slice(-(isSecretary ? 5 : 1))
      fetch(`/api/projects/${params.id}/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agentMsgs.map(m => ({ role: m.role, text: m.text, agent_name: m.agentName, agent_id: selectedAgent }))),
      }).catch(() => {})
      return c
    })

    setChatLoading(false)
    setTimeout(refreshTree, 2000)
  }

  const currentDirtyFile = openFiles.find(f => f.path === (focusedPane === 'right' && splitView ? rightFile : activeFile))?.dirty

  if (!project) return (
    <div className="flex items-center justify-center h-screen text-gray-600">
      <Loader2 className="animate-spin mr-2" size={16} />
      <span className="font-mono text-xs">Loading project…</span>
    </div>
  )

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#070b10', color: '#e2e8f0' }}>
      {/* ── Top Bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-3 py-2 flex-shrink-0" style={{ background: '#0a0e14', borderBottom: '1px solid #111820' }}>
        <a href="/projects" className="flex items-center gap-1 text-gray-500 hover:text-white transition-colors">
          <ChevronLeft size={14} />
        </a>
        <div className="w-px h-4" style={{ background: '#1a2535' }} />
        <Code2 size={14} style={{ color: '#00e5ff' }} />
        <span className="font-orbitron text-sm font-bold text-white">{project.name}</span>
        <span className="text-gray-600 text-xs font-mono truncate hidden md:block" style={{ maxWidth: 300 }}>{project.work_dir}</span>
        <div className="flex-1" />
        {/* Split view toggle */}
        <button
          onClick={() => { setSplitView(v => !v); if (!splitView) setRightFile(activeFile) }}
          title="Split editor (left / right)"
          className="flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors"
          style={{
            background: splitView ? '#001a40' : '#0d1117',
            border: `1px solid ${splitView ? '#0066ff66' : '#1a2535'}`,
            color: splitView ? '#60a5fa' : '#6b7280',
          }}
        >
          <Columns2 size={11} />
        </button>
        <button onClick={() => { setCmd('ls -la'); setTimeout(() => runCmd(), 50) }} disabled={running}
          className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-gray-400 hover:text-white transition-colors"
          style={{ background: '#0d1117', border: '1px solid #1a2535' }} title="List files">
          <Terminal size={11} /> ls
        </button>
        <button onClick={() => { setCmd('cat docker-compose.yml 2>/dev/null || echo "no docker-compose.yml"'); setTimeout(() => runCmd(), 50) }} disabled={running}
          className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-gray-400 hover:text-white transition-colors"
          style={{ background: '#0d1117', border: '1px solid #1a2535' }} title="View docker-compose">
          🐳
        </button>
        <button onClick={refreshTree}
          className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-gray-500 hover:text-white transition-colors"
          style={{ background: '#0d1117', border: '1px solid #1a2535' }}>
          <RefreshCw size={11} />
        </button>
        {currentDirtyFile && (
          <button onClick={saveFile} disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold text-white"
            style={{ background: '#0066ff' }}>
            <Save size={11} />
            {saving ? 'Saving…' : 'Save'}
          </button>
        )}
      </div>

      {/* ── Main layout ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* ── File tree ──────────────────────────────────────────────────── */}
        <div className="flex flex-col flex-shrink-0 overflow-y-auto" style={{ width: 220, background: '#0a0e14', borderRight: '1px solid #111820' }}>
          <div className="flex items-center justify-between px-3 py-2 flex-shrink-0" style={{ borderBottom: '1px solid #111820' }}>
            <span className="font-orbitron text-gray-500" style={{ fontSize: '9px', letterSpacing: '0.1em' }}>FILES</span>
            <button onClick={refreshTree} className="text-gray-600 hover:text-gray-400 transition-colors"><RefreshCw size={10} /></button>
          </div>
          {fileTree.length === 0 ? (
            <div className="px-3 py-4 text-gray-600 text-xs font-mono">empty directory</div>
          ) : (
            <div className="py-1 overflow-y-auto flex-1">
              <FileTree nodes={fileTree} onSelect={openFile} selected={focusedPane === 'right' && splitView ? rightFile : activeFile} />
            </div>
          )}
        </div>

        {/* ── Center: Editor + Bottom panel ──────────────────────────────── */}
        <div className="flex flex-col flex-1 min-w-0">

          {/* Editor area (split or single) */}
          <div ref={editorAreaRef} className="flex flex-1 min-h-0">
            {splitView ? (
              <>
                {/* Left pane */}
                <div style={{ width: `${splitRatio * 100}%` }} className="flex flex-col min-w-0">
                  <EditorPane
                    openFiles={openFiles} activeFile={activeFile} setActiveFile={setActiveFile}
                    closeFile={closeFile} updateContent={updateContent}
                    isFocused={focusedPane === 'left'} onFocus={() => setFocusedPane('left')}
                  />
                </div>

                {/* Vertical drag divider */}
                <div
                  onMouseDown={onHResizeStart}
                  className="flex-shrink-0 cursor-col-resize group relative"
                  style={{ width: 5, background: '#111820', borderLeft: '1px solid #1a2535' }}
                  title="Drag to resize"
                >
                  <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 bg-transparent group-hover:bg-blue-500/50 transition-colors" />
                </div>

                {/* Right pane */}
                <div style={{ flex: 1 }} className="flex flex-col min-w-0">
                  <EditorPane
                    openFiles={openFiles} activeFile={rightFile} setActiveFile={setRightFile}
                    closeFile={closeFile} updateContent={updateContent}
                    isFocused={focusedPane === 'right'} onFocus={() => setFocusedPane('right')}
                  />
                </div>
              </>
            ) : (
              <EditorPane
                openFiles={openFiles} activeFile={activeFile} setActiveFile={setActiveFile}
                closeFile={closeFile} updateContent={updateContent}
              />
            )}
          </div>

          {/* ── Vertical resize handle ──────────────────────────────────── */}
          <div
            onMouseDown={onVResizeStart}
            className="flex-shrink-0 cursor-row-resize group relative flex items-center justify-center"
            style={{ height: 5, background: '#0a0e14', borderTop: '1px solid #1a2535' }}
          >
            {/* Drag indicator dots */}
            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {[0,1,2,3,4].map(i => <div key={i} className="w-3 h-px rounded-full bg-blue-500/60" />)}
            </div>
          </div>

          {/* ── Bottom panel ───────────────────────────────────────────────── */}
          <div className="flex flex-col flex-shrink-0" style={{ height: panelHeight }}>
            {/* Panel tabs */}
            <div className="flex items-center flex-shrink-0" style={{ background: '#0a0e14', borderBottom: '1px solid #111820' }}>
              {[
                { key: 'terminal', icon: <Terminal size={11} />, label: 'TERMINAL' },
                { key: 'logs', icon: <span style={{ fontSize: 11 }}>📋</span>, label: 'LOGS' },
                { key: 'chat', icon: <MessageSquare size={11} />, label: 'ASK AGENT' },
                { key: 'git', icon: <span style={{ fontSize: 11 }}>⎇</span>, label: 'GIT' },
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
                <div ref={termRef} className="flex-1 overflow-y-auto px-3 py-2 font-mono text-xs text-green-400 whitespace-pre-wrap"
                  style={{ background: '#040709', fontSize: '11px', lineHeight: 1.6 }}>
                  {terminal || <span className="text-gray-700">// terminal output will appear here</span>}
                  {running && <span className="animate-pulse text-yellow-400">█</span>}
                </div>
                <form onSubmit={runCmd} className="flex items-center gap-2 px-3 py-2 flex-shrink-0" style={{ borderTop: '1px solid #111820', background: '#040709' }}>
                  <span className="text-green-500 font-mono text-xs flex-shrink-0">$</span>
                  <input
                    value={cmd} onChange={e => setCmd(e.target.value)}
                    className="flex-1 bg-transparent font-mono text-xs text-green-300 outline-none"
                    placeholder="npm install / docker compose up -d / ls -la …"
                    disabled={running} style={{ fontSize: '11px' }}
                  />
                  <button type="submit" disabled={running || !cmd.trim()}
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-xs disabled:opacity-40"
                    style={{ background: '#0a1a0a', border: '1px solid #1a3a1a', color: '#22c55e' }}>
                    {running ? <Loader2 size={10} className="animate-spin" /> : <Play size={10} />}
                  </button>
                </form>
              </div>
            )}

            {/* Agent chat */}
            {panel === 'chat' && (
              <div className="flex flex-col flex-1 min-h-0">
                <div className="flex items-center gap-2 px-3 py-1.5 flex-shrink-0" style={{ borderBottom: '1px solid #111820', background: '#0a0e14' }}>
                  <span className="font-orbitron text-gray-600" style={{ fontSize: '9px' }}>AGENT:</span>
                  <select value={selectedAgent} onChange={e => setSelectedAgent(e.target.value)}
                    className="flex-1 bg-transparent text-xs text-gray-300 outline-none cursor-pointer" style={{ fontSize: '11px' }}>
                    {agents.map(a => {
                      const isFast = a.id === 'agent-coder'
                      const isCoordinator = a.id === 'agent-secretary' || a.role?.toLowerCase().includes('coordinator')
                      const label = isFast
                        ? `⚡ ${a.name} — แก้ไฟล์โดยตรง (เร็ว)`
                        : isCoordinator
                          ? `🔀 ${a.name} — กระจายงานให้ทีม`
                          : `${a.name} — ${a.role}`
                      return <option key={a.id} value={a.id} style={{ background: '#0d1117' }}>{label}</option>
                    })}
                  </select>
                  {chat.length > 0 && (
                    <button
                      onClick={() => {
                        setChat([])
                        fetch(`/api/projects/${params.id}/chat`, { method: 'DELETE' }).catch(() => {})
                      }}
                      className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0"
                      title="Clear chat history"
                      type="button"
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>
                <div ref={chatRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-2" style={{ background: '#070b10' }}>
                  {chat.length === 0 && (() => {
                    const sel = agents.find(a => a.id === selectedAgent)
                    const isFast = sel?.id === 'agent-coder'
                    const isCoord = sel?.id === 'agent-secretary'
                    return (
                      <div className="space-y-1.5 py-2">
                        {isFast ? (
                          <div className="text-xs px-2 py-1.5 rounded" style={{ background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.12)', color: '#00e5ff70', fontSize: '10px' }}>
                            ⚡ Senior Developer จะอ่านและแก้ไฟล์โดยตรงทันที — เหมือน Replit AI
                          </div>
                        ) : isCoord ? (
                          <div className="text-xs px-2 py-1.5 rounded" style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)', color: 'rgba(245,158,11,0.6)', fontSize: '10px' }}>
                            🔀 เลขาจะวิเคราะห์งานและกระจายให้ agent ที่เหมาะสม
                          </div>
                        ) : (
                          <div className="text-gray-700 text-xs font-mono">// พิมพ์คำสั่งให้ {sel?.name || 'agent'} แก้ code ในโปรเจคนี้</div>
                        )}
                      </div>
                    )
                  })()}
                  {chat.map((m, i) => (
                    <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {m.role === 'agent' && (
                        <div className="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center text-xs" style={{ background: '#0d1117', border: '1px solid #1a2535' }}>🤖</div>
                      )}
                      <div className="rounded-lg px-3 py-2 text-xs font-mono max-w-[85%] whitespace-pre-wrap"
                        style={{
                          background: m.role === 'user' ? '#0066ff22' : '#0d1117',
                          border: `1px solid ${m.role === 'user' ? '#0066ff44' : '#1a2535'}`,
                          color: m.role === 'user' ? '#93c5fd' : '#94a3b8', fontSize: '11px',
                        }}>
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
                <form onSubmit={sendChat} className="flex items-center gap-2 px-3 py-2 flex-shrink-0" style={{ borderTop: '1px solid #111820', background: '#0a0e14' }}>
                  <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                    className="flex-1 bg-transparent text-xs text-gray-300 outline-none"
                    placeholder="สร้าง API endpoint / แก้ bug / เพิ่ม feature…"
                    disabled={chatLoading} style={{ fontSize: '11px' }} />
                  <button type="submit" disabled={chatLoading || !chatInput.trim()}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs disabled:opacity-40"
                    style={{ background: '#001a40', border: '1px solid #0066ff44', color: '#60a5fa' }}>
                    {chatLoading ? <Loader2 size={10} className="animate-spin" /> : <Send size={10} />}
                  </button>
                </form>
              </div>
            )}

            {/* Docker Logs */}
            {panel === 'logs' && (
              <div className="flex flex-col flex-1 min-h-0">
                <div className="flex items-center gap-2 px-3 py-1.5 flex-shrink-0" style={{ borderBottom: '1px solid #111820', background: '#0a0e14' }}>
                  <span className="font-orbitron text-gray-600" style={{ fontSize: '9px' }}>DOCKER LOGS</span>
                  <div className="flex-1" />
                  {logsStreaming && (
                    <span className="flex items-center gap-1 text-green-400" style={{ fontSize: '9px' }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" /> LIVE
                    </span>
                  )}
                  <button
                    onClick={async () => {
                      // Stop existing stream
                      if (logsAbortRef.current) { logsAbortRef.current.abort(); logsAbortRef.current = null }
                      if (logsStreaming) { setLogsStreaming(false); return }
                      setDockerLogs('')
                      setLogsStreaming(true)
                      const ctrl = new AbortController()
                      logsAbortRef.current = ctrl
                      try {
                        const res = await fetch(`/api/projects/${params.id}/logs`, { signal: ctrl.signal })
                        if (!res.body) { setLogsStreaming(false); return }
                        const reader = res.body.getReader()
                        const dec = new TextDecoder()
                        while (true) {
                          const { done, value } = await reader.read()
                          if (done) break
                          setDockerLogs(p => p + dec.decode(value))
                          if (logsRef.current) logsRef.current.scrollTop = logsRef.current.scrollHeight
                        }
                      } catch {}
                      setLogsStreaming(false)
                    }}
                    className="text-xs px-2 py-0.5 rounded transition-colors"
                    style={{
                      background: logsStreaming ? 'rgba(239,68,68,0.1)' : 'rgba(0,229,255,0.08)',
                      border: `1px solid ${logsStreaming ? 'rgba(239,68,68,0.3)' : 'rgba(0,229,255,0.2)'}`,
                      color: logsStreaming ? '#f87171' : '#00e5ff',
                      fontSize: '9px',
                    }}
                  >{logsStreaming ? '■ STOP' : '▶ STREAM'}</button>
                  <button onClick={() => setDockerLogs('')} className="text-gray-600 hover:text-gray-400 text-xs" style={{ fontSize: '9px' }}>CLEAR</button>
                </div>
                <div ref={logsRef} className="flex-1 overflow-y-auto px-3 py-2 font-mono"
                  style={{ background: '#040709', fontSize: '10px', lineHeight: 1.7, color: '#94a3b8', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {dockerLogs ? (
                    dockerLogs.split('\n').map((line, i) => {
                      const isError = /error|err:|fatal|exception/i.test(line)
                      const isWarn = /warn|warning/i.test(line)
                      const isOk = /ready|started|listening|success|✓|✅/i.test(line)
                      return (
                        <div key={i} style={{ color: isError ? '#f87171' : isWarn ? '#fbbf24' : isOk ? '#4ade80' : '#94a3b8' }}>
                          {line}
                        </div>
                      )
                    })
                  ) : (
                    <span className="text-gray-700">// กด ▶ STREAM เพื่อดู docker logs แบบ live</span>
                  )}
                </div>
              </div>
            )}

            {/* Git history */}
            {panel === 'git' && (() => {
              const loadGit = async () => {
                setGitLoading(true)
                try {
                  const r = await fetch(`/api/projects/${params.id}/git`)
                  const d = await r.json()
                  setGitLog(d.log || [])
                  setGitHasRepo(d.log?.length > 0 || !d.error?.includes('ไม่มี git'))
                  if (d.error?.includes('ไม่มี git')) setGitHasRepo(false)
                  else setGitHasRepo(true)
                } catch {}
                setGitLoading(false)
              }
              return (
              <div className="flex flex-col flex-1 min-h-0">
                <div className="flex items-center gap-2 px-3 py-1.5 flex-shrink-0" style={{ borderBottom: '1px solid #111820', background: '#0a0e14' }}>
                  <span className="font-orbitron text-gray-600" style={{ fontSize: '9px' }}>GIT LOG</span>
                  <button onClick={loadGit} className="text-gray-600 hover:text-gray-400 transition-colors ml-1">
                    <RefreshCw size={10} />
                  </button>
                  {gitHasRepo === false && (
                    <button
                      onClick={async () => {
                        setGitLoading(true)
                        const r = await fetch(`/api/projects/${params.id}/git`, {
                          method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ action: 'init' }),
                        })
                        const d = await r.json()
                        if (d.message) await loadGit()
                        else setGitLoading(false)
                      }}
                      className="flex items-center gap-1 px-2 py-0.5 rounded transition-colors"
                      style={{ background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.2)', color: '#00e5ff', fontSize: '9px' }}
                    >⎇ Init Git</button>
                  )}
                  {gitHasRepo === null && (
                    <button onClick={loadGit}
                      className="px-2 py-0.5 rounded text-xs"
                      style={{ background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.2)', color: '#00e5ff', fontSize: '9px' }}>
                      โหลด
                    </button>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1" style={{ background: '#070b10' }}>
                  {gitLoading && <div className="text-gray-600 text-xs font-mono px-1 animate-pulse">กำลังโหลด…</div>}
                  {!gitLoading && gitHasRepo === false && (
                    <div className="flex flex-col items-center justify-center h-full gap-3 py-8">
                      <div className="text-4xl opacity-30">⎇</div>
                      <div className="text-gray-600 text-xs font-mono text-center">
                        โปรเจคนี้ยังไม่มี git<br />กด Init Git เพื่อเริ่มต้น
                      </div>
                    </div>
                  )}
                  {!gitLoading && gitHasRepo === null && (
                    <div className="text-gray-700 text-xs font-mono px-1">// กด โหลด เพื่อดู git log</div>
                  )}
                  {!gitLoading && gitHasRepo && gitLog.length === 0 && (
                    <div className="text-gray-600 text-xs font-mono px-1">// ยังไม่มี commit</div>
                  )}
                  {gitLog.map((c, i) => (
                    <div key={c.hash} className="flex items-start gap-2 px-2 py-1.5 rounded group hover:bg-white/5"
                      style={{ border: '1px solid transparent' }}>
                      <span className="font-mono flex-shrink-0" style={{ color: '#f59e0b', fontSize: '10px' }}>{c.hash}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs truncate" style={{ color: '#94a3b8', fontSize: '11px' }}>{c.msg}</div>
                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                          <span style={{ color: '#4a5568', fontSize: '9px' }}>{c.author} · {c.date}</span>
                          {c.tags?.map(tag => (
                            <span key={tag} className="font-mono px-1 rounded"
                              style={{ background: 'rgba(168,85,247,0.15)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.3)', fontSize: '8px' }}>
                              🏷️ {tag.replace(/-[a-z0-9]{6,}$/, '')}
                            </span>
                          ))}
                        </div>
                      </div>
                      {i > 0 && (
                        <button
                          onClick={async () => {
                            if (!confirm(`⏪ Rollback ไปที่ commit "${c.msg.slice(0, 40)}"?\n\nการเปลี่ยนแปลงที่ยังไม่ commit จะถูก stash ไว้\nโค้ดจะกลับไปสถานะ ณ commit นี้`)) return
                            const r = await fetch(`/api/projects/${params.id}/git`, {
                              method: 'POST', headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ action: 'revert', hash: c.fullHash || c.hash }),
                            })
                            const d = await r.json()
                            alert(d.message || d.error || 'done')
                            refreshTree()
                            loadGit()
                          }}
                          className="flex-shrink-0 px-2 py-0.5 rounded transition-colors hover:bg-red-900/30"
                          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', fontSize: '9px' }}
                        >⏪ rollback</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )})()}
          </div>
        </div>
      </div>
    </div>
  )
}
