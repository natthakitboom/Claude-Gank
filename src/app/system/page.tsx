'use client'

import { useEffect, useState } from 'react'
import type { Agent, Skill } from '@/lib/types'
import { MODEL_LABELS } from '@/lib/types'
import PixelSprite from '@/components/PixelSprite'
import { useLanguage } from '@/lib/i18n'

const TEAM_ORDER = ['CORE', 'TECH', 'CREATIVE', 'BUSINESS', 'FINANCE']
const TEAM_DISPLAY: Record<string, string> = { CORE: 'CORE', TECH: 'TECH', CREATIVE: 'CREATIVE', BUSINESS: 'BIZ', FINANCE: 'FINANCE' }
const TEAM_COLOR: Record<string, string> = { CORE: '#ff2d78', TECH: '#2d7fff', CREATIVE: '#a855f7', BUSINESS: '#22c55e', FINANCE: '#06b6d4' }

const CAT_COLOR: Record<string, string> = { management: '#ff2d78', tech: '#2d7fff', marketing: '#22c55e', business: '#06b6d4', creative: '#a855f7', finance: '#f59e0b', general: '#64748b' }

interface MemoryRow {
  id: string; agent_id: string; content: string; summary: string | null
  importance: number; created_at: string; agent_name: string; agent_sprite: string
}

interface NotifyConfig {
  id: string; platform: string; webhook_url: string; token: string; enabled: number
  notify_on_done: number; notify_on_failed: number; notify_on_skill_update: number
}

interface DeployConfig {
  host: string; port: number; username: string
  auth_method: string; ssh_key_path: string; ssh_password: string
  domain: string; deploy_path: string; ssl_mode: string; cloudflare_proxy: number
}

type Tab = 'agents' | 'skills' | 'memory' | 'notify' | 'deploy' | 'info'

export default function SystemPage() {
  const { t, lang } = useLanguage()
  const [tab, setTab] = useState<Tab>('agents')
  const [agents, setAgents] = useState<Agent[]>([])
  const [skills, setSkills] = useState<Skill[]>([])
  const [memories, setMemories] = useState<MemoryRow[]>([])
  const [stats, setStats] = useState<any>(null)
  const [notifyConfigs, setNotifyConfigs] = useState<NotifyConfig[]>([])
  const [testResult, setTestResult] = useState('')

  // Bulk agent model state
  const [selectedAgentIds, setSelectedAgentIds] = useState<Set<string>>(new Set())
  const [bulkModel, setBulkModel] = useState('')
  const [bulkEffort, setBulkEffort] = useState('')
  const [bulkApplying, setBulkApplying] = useState(false)
  const [autoEffortRunning, setAutoEffortRunning] = useState(false)
  const [autoEffortResult, setAutoEffortResult] = useState<{ id: string; name: string; effort: string }[] | null>(null)

  // System config state
  const [claudePath, setClaudePath] = useState('')
  const [claudePathAutoDetected, setClaudePathAutoDetected] = useState(false)
  const [claudePathSaving, setClaudePathSaving] = useState(false)
  const [claudePathResult, setClaudePathResult] = useState<{ ok?: boolean; version?: string; error?: string } | null>(null)

  // Projects base path state
  const [projectsBasePath, setProjectsBasePath] = useState('')
  const [projectsPathSaving, setProjectsPathSaving] = useState(false)
  const [projectsPathResult, setProjectsPathResult] = useState<{ ok?: boolean; path?: string; error?: string; cleared?: boolean } | null>(null)

  // Jira state
  const [jiraBaseUrl, setJiraBaseUrl] = useState('')
  const [jiraEmail, setJiraEmail] = useState('')
  const [jiraToken, setJiraToken] = useState('')
  const [jiraSaving, setJiraSaving] = useState(false)
  const [jiraResult, setJiraResult] = useState<{ ok?: boolean; display_name?: string; error?: string; cleared?: boolean } | null>(null)
  const [jiraConfigured, setJiraConfigured] = useState(false)

  // Figma MCP state
  const [figmaToken, setFigmaToken] = useState('')
  const [figmaSaving, setFigmaSaving] = useState(false)
  const [figmaResult, setFigmaResult] = useState<{ ok?: boolean; display_name?: string; email?: string; error?: string; cleared?: boolean } | null>(null)
  const [figmaConfigured, setFigmaConfigured] = useState(false)

  // Microsoft SSO state
  const [msTenantId, setMsTenantId] = useState('')
  const [msClientId, setMsClientId] = useState('')
  const [msClientSecret, setMsClientSecret] = useState('')
  const [msSsoConfigured, setMsSsoConfigured] = useState(false)
  const [msSsoEnvEnabled, setMsSsoEnvEnabled] = useState(false)
  const [msSaving, setMsSaving] = useState(false)
  const [msResult, setMsResult] = useState<{ ok?: boolean; message?: string; error?: string; cleared?: boolean } | null>(null)

  // Ollama state
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434')
  const [ollamaModels, setOllamaModels] = useState<string[]>([])
  const [ollamaSaving, setOllamaSaving] = useState(false)
  const [ollamaResult, setOllamaResult] = useState<{ ok?: boolean; models?: string[]; error?: string } | null>(null)

  // Deploy state
  const [deployConfig, setDeployConfig] = useState<DeployConfig>({ host: '', port: 22, username: 'root', auth_method: 'sshkey', ssh_key_path: '~/.ssh/id_rsa', ssh_password: '', domain: '', deploy_path: '/apps', ssl_mode: 'cloudflare', cloudflare_proxy: 1 })
  const [deploySaving, setDeploySaving] = useState(false)
  const [deploySaved, setDeploySaved] = useState(false)
  const [deployTesting, setDeployTesting] = useState(false)
  const [deployTestResult, setDeployTestResult] = useState<{ ok: boolean; uname?: string; docker?: string; memory?: string; disk?: string; error?: string } | null>(null)
  const [deployProjects, setDeployProjects] = useState<{ id: string; name: string; work_dir: string }[]>([])

  // Skills state
  const [filterCat, setFilterCat] = useState('all')
  const [showCreateSkill, setShowCreateSkill] = useState(false)
  const [viewSkill, setViewSkill] = useState<Skill | null>(null)
  const [skillForm, setSkillForm] = useState({ name: '', description: '', prompt_template: '', category: 'general', icon: '⚡' })

  // Memory state
  const [filterAgent, setFilterAgent] = useState('all')
  const [showAddMemory, setShowAddMemory] = useState(false)
  const [memForm, setMemForm] = useState({ agent_id: '', content: '', importance: 5 })

  useEffect(() => {
    fetch('/api/agents').then((r) => r.json()).then((d) => { setAgents(d); setMemForm((f) => ({ ...f, agent_id: d[0]?.id || '' })) })
    fetch('/api/skills').then((r) => r.json()).then(setSkills)
    fetch('/api/stats').then((r) => r.json()).then(setStats)
    fetch('/api/notify').then((r) => r.json()).then(setNotifyConfigs)
    fetch('/api/deploy/config').then((r) => r.json()).then((d) => { if (d.host !== undefined) setDeployConfig(d) })
    fetch('/api/system/config').then((r) => r.json()).then((d) => {
      if (d.claude_cli_path) { setClaudePath(d.claude_cli_path); if (d.auto_detected) setClaudePathAutoDetected(true) }
      if (d.projects_base_path) setProjectsBasePath(d.projects_base_path)
      if (d.ollama_base_url) setOllamaUrl(d.ollama_base_url)
      if (d.ollama_models?.length) setOllamaModels(d.ollama_models)
      if (d.jira_base_url) setJiraBaseUrl(d.jira_base_url)
      if (d.jira_email) setJiraEmail(d.jira_email)
      if (d.jira_configured) setJiraConfigured(true)
      if (d.figma_configured) setFigmaConfigured(true)
      if (d.ms_sso_configured) setMsSsoConfigured(true)
      if (d.ms_tenant_id) setMsTenantId(d.ms_tenant_id)
      if (d.ms_client_id) setMsClientId(d.ms_client_id)
      if (d.ms_sso_env_enabled) setMsSsoEnvEnabled(true)
    })
    fetch('/api/projects').then((r) => r.json()).then((d) => setDeployProjects(Array.isArray(d) ? d : []))
  }, [])

  useEffect(() => {
    const url = filterAgent === 'all' ? '/api/memory' : `/api/memory?agent_id=${filterAgent}`
    fetch(url).then((r) => r.json()).then(setMemories)
  }, [filterAgent])

  const createSkill = async () => {
    await fetch('/api/skills', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(skillForm) })
    setShowCreateSkill(false)
    setSkillForm({ name: '', description: '', prompt_template: '', category: 'general', icon: '⚡' })
    setSkills(await (await fetch('/api/skills')).json())
  }

  const addMemory = async () => {
    await fetch('/api/memory', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(memForm) })
    setShowAddMemory(false)
    setMemForm((f) => ({ ...f, content: '', importance: 5 }))
    setMemories(await (await fetch(filterAgent === 'all' ? '/api/memory' : `/api/memory?agent_id=${filterAgent}`)).json())
  }

  const addNotifyConfig = async (platform: 'line' | 'teams') => {
    const res = await fetch('/api/notify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform, notify_on_failed: 1 }),
    })
    setNotifyConfigs(await res.json())
  }

  const updateNotifyConfig = async (id: string, patch: Partial<NotifyConfig>) => {
    await fetch('/api/notify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    })
    setNotifyConfigs(await (await fetch('/api/notify')).json())
  }

  const deleteNotifyConfig = async (id: string) => {
    await fetch('/api/notify', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setNotifyConfigs(await (await fetch('/api/notify')).json())
  }

  const testNotify = async () => {
    setTestResult(t('sys_notify_sending'))
    const res = await fetch('/api/notify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'send',
        title: '🔔 Test Notification — ทดสอบการแจ้งเตือน',
        message: `✅ ระบบแจ้งเตือนทำงานปกติ!\n\n📊 สถานะระบบ:\n• Agents: ${agents.length} คน\n• Platform: MI Gang Dashboard\n• Connection: สำเร็จ\n\n💬 เมื่อ agent ทำงานเสร็จหรือล้มเหลว จะส่งข้อความแบบนี้ให้อัตโนมัติ พร้อมรายละเอียดผลลัพธ์ของ mission`,
        agent_name: 'System',
      }),
    })
    const data = await res.json()
    setTestResult(`Sent to ${data.sent}/${data.total} platforms`)
    setTimeout(() => setTestResult(''), 3000)
  }

  const updateAgent = async (id: string, patch: Partial<Agent>) => {
    await fetch(`/api/agents/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
    setAgents(await (await fetch('/api/agents')).json())
  }

  const deleteMemory = async (id: string) => {
    await fetch(`/api/memory?id=${id}`, { method: 'DELETE' })
    setMemories(await (await fetch(filterAgent === 'all' ? '/api/memory' : `/api/memory?agent_id=${filterAgent}`)).json())
  }

  const saveDeployConfig = async () => {
    setDeploySaving(true)
    await fetch('/api/deploy/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(deployConfig) })
    setDeploySaving(false)
    setDeploySaved(true)
    setTimeout(() => setDeploySaved(false), 2000)
  }

  const testDeployConnection = async () => {
    setDeployTesting(true)
    setDeployTestResult(null)
    try {
      const res = await fetch('/api/deploy/test', { method: 'POST' })
      const data = await res.json()
      setDeployTestResult(data)
    } catch (e: any) {
      setDeployTestResult({ ok: false, error: e.message })
    }
    setDeployTesting(false)
  }

  const impColor = (n: number) => n >= 8 ? '#ef4444' : n >= 6 ? '#f59e0b' : n >= 4 ? '#2d7fff' : '#374151'
  const categories = ['all', ...Array.from(new Set(skills.map((s) => s.category)))]
  const filteredSkills = filterCat === 'all' ? skills : skills.filter((s) => s.category === filterCat)

  return (
    <div className="p-6 min-h-screen">
      {/* Header */}
      <div className="mb-4">
        <h1 className="font-orbitron font-bold text-white" style={{ fontSize: '28px', letterSpacing: '0.05em' }}>{t('system_title')}</h1>
        <p className="font-orbitron mt-1" style={{ fontSize: '10px', color: '#374151', letterSpacing: '0.1em' }}>{t('system_subtitle')}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b mb-6" style={{ borderColor: '#181218' }}>
        {([['agents', t('sys_tab_agents')], ['skills', t('sys_tab_skills')], ['memory', t('sys_tab_memory')], ['notify', t('sys_tab_notify')], ['deploy', t('sys_tab_deploy')], ['info', t('sys_tab_info')]] as [Tab, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={`gank-tab ${tab === key ? 'active' : ''}`}>{label}</button>
        ))}
      </div>

      {/* ════════ AGENTS TAB ════════ */}
      {tab === 'agents' && (() => {
        const allIds = agents.map(a => a.id)
        const allSelected = allIds.length > 0 && allIds.every(id => selectedAgentIds.has(id))
        const someSelected = selectedAgentIds.size > 0

        const toggleAgent = (id: string) => setSelectedAgentIds(prev => {
          const next = new Set(prev)
          next.has(id) ? next.delete(id) : next.add(id)
          return next
        })

        const toggleAll = () => setSelectedAgentIds(allSelected ? new Set() : new Set(allIds))

        const applyBulk = async () => {
          if (!bulkModel && !bulkEffort) return
          setBulkApplying(true)
          const ids = selectedAgentIds.size > 0 ? Array.from(selectedAgentIds) : allIds
          const patch: Partial<Agent> = {}
          if (bulkModel) patch.model = bulkModel
          if (bulkEffort) patch.effort = bulkEffort as Agent['effort']
          await Promise.all(ids.map(id => updateAgent(id, patch)))
          setBulkApplying(false)
          setSelectedAgentIds(new Set())
        }

        const runAutoEffort = async () => {
          setAutoEffortRunning(true)
          setAutoEffortResult(null)
          try {
            const res = await fetch('/api/system/auto-effort', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ agents: agents.map(a => ({ id: a.id, name: a.name, role: a.role, team: a.team, model: a.model })) }),
            })
            const data = await res.json() as { ok?: boolean; recommendations?: Record<string, string>; error?: string }
            if (data.ok && data.recommendations) {
              const preview = agents
                .filter(a => data.recommendations![a.id])
                .map(a => ({ id: a.id, name: a.name, effort: data.recommendations![a.id] }))
              setAutoEffortResult(preview)
              // Apply all recommendations
              await Promise.all(
                Object.entries(data.recommendations).map(([id, effort]) =>
                  updateAgent(id, { effort: effort as Agent['effort'] })
                )
              )
            } else {
              alert(data.error ?? t('err_ai_analyze'))
            }
          } catch {
            alert(t('err_connection'))
          } finally {
            setAutoEffortRunning(false)
          }
        }

        return (
          <div className="space-y-3">
            {/* Bulk toolbar */}
            <div className="rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap" style={{ background: '#181218', border: '1px solid #2E1E27' }}>
              {/* Select all checkbox */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  style={{ accentColor: '#E8365D', width: 14, height: 14, cursor: 'pointer' }}
                />
                <span className="font-orbitron text-white" style={{ fontSize: '9px', letterSpacing: '0.06em' }}>
                  {someSelected ? `${selectedAgentIds.size} / ${allIds.length} ${t('sys_selected')}` : t('sys_select_all')}
                </span>
              </label>

              <div style={{ width: 1, height: 20, background: '#2E1E27' }} />

              {/* Bulk model */}
              <div className="flex items-center gap-2">
                <label className="font-orbitron" style={{ fontSize: '8px', color: '#64748b', letterSpacing: '0.06em' }}>MODEL</label>
                <select
                  value={bulkModel}
                  onChange={e => setBulkModel(e.target.value)}
                  className="gank-input"
                  style={{ fontSize: '9px', padding: '3px 6px', minWidth: 170 }}
                >
                  <option value="">{t('sys_no_change')}</option>
                  <optgroup label="── Claude">
                    {Object.entries(MODEL_LABELS).map(([id, label]) => (
                      <option key={id} value={id}>{label}</option>
                    ))}
                  </optgroup>
                  {ollamaModels.length > 0 && (
                    <optgroup label="── Ollama (Local)">
                      {ollamaModels.map((m) => (
                        <option key={`ollama:${m}`} value={`ollama:${m}`}>{m}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* Bulk effort */}
              <div className="flex items-center gap-2">
                <label className="font-orbitron" style={{ fontSize: '8px', color: '#64748b', letterSpacing: '0.06em' }}>EFFORT</label>
                <select
                  value={bulkEffort}
                  onChange={e => setBulkEffort(e.target.value)}
                  className="gank-input"
                  style={{ fontSize: '9px', padding: '3px 6px' }}
                >
                  <option value="">{t('sys_no_change')}</option>
                  <option value="low">{t('effort_option_low')}</option>
                  <option value="normal">{t('effort_option_normal')}</option>
                  <option value="high">{t('effort_option_high')}</option>
                </select>
              </div>

              {/* Apply button */}
              <button
                onClick={applyBulk}
                disabled={bulkApplying || (!bulkModel && !bulkEffort)}
                className="font-orbitron px-3 py-1.5 rounded-lg transition-all ml-auto"
                style={{
                  fontSize: '9px', letterSpacing: '0.05em',
                  background: (!bulkModel && !bulkEffort) || bulkApplying ? '#1a1020' : 'rgba(232,54,93,0.15)',
                  border: `1px solid ${(!bulkModel && !bulkEffort) || bulkApplying ? '#2E1E27' : 'rgba(232,54,93,0.4)'}`,
                  color: (!bulkModel && !bulkEffort) || bulkApplying ? '#374151' : '#E8365D',
                  cursor: (!bulkModel && !bulkEffort) || bulkApplying ? 'not-allowed' : 'pointer',
                }}
              >
                {bulkApplying ? t('sys_applying') : someSelected ? `${t('sys_apply_to')} ${selectedAgentIds.size} ${t('sys_agents_label')}` : `${t('sys_apply_to_all')} (${allIds.length})`}
              </button>

              {/* AI Auto Effort button */}
              <button
                onClick={runAutoEffort}
                disabled={autoEffortRunning}
                className="font-orbitron px-3 py-1.5 rounded-lg transition-all"
                style={{
                  fontSize: '9px', letterSpacing: '0.05em',
                  background: autoEffortRunning ? '#1a1020' : 'rgba(168,85,247,0.12)',
                  border: `1px solid ${autoEffortRunning ? '#2E1E27' : 'rgba(168,85,247,0.35)'}`,
                  color: autoEffortRunning ? '#374151' : '#a855f7',
                  cursor: autoEffortRunning ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}
              >
                {autoEffortRunning
                  ? <><span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span> {t('sys_ai_analyzing')}</>
                  : <>{t('sys_ai_auto_effort')}</>}
              </button>
            </div>

            {/* AI result preview */}
            {autoEffortResult && (
              <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.2)' }}>
                <div className="font-orbitron mb-2 flex items-center justify-between" style={{ fontSize: '8px', color: '#a855f7', letterSpacing: '0.06em' }}>
                  <span>{t('sys_ai_effort_applied')}</span>
                  <button onClick={() => setAutoEffortResult(null)} style={{ background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', fontSize: 10 }}>✕</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {autoEffortResult.map(r => (
                    <div key={r.id} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1" style={{ background: '#181218', border: '1px solid #2E1E27' }}>
                      <span className="text-xs text-white">{r.name}</span>
                      <span className="font-orbitron px-1.5 py-0.5 rounded" style={{
                        fontSize: '7px',
                        background: r.effort === 'high' ? 'rgba(239,68,68,0.15)' : r.effort === 'normal' ? 'rgba(45,127,255,0.15)' : 'rgba(34,197,94,0.15)',
                        color: r.effort === 'high' ? '#ef4444' : r.effort === 'normal' ? '#2d7fff' : '#22c55e',
                      }}>
                        {r.effort.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Agent rows */}
            {TEAM_ORDER.map((team) => {
              const teamAgents = agents.filter((a) => a.team === team)
              if (teamAgents.length === 0) return null
              const tColor = TEAM_COLOR[team] || '#374151'
              const teamAllSelected = teamAgents.every(a => selectedAgentIds.has(a.id))
              return (
                <div key={team}>
                  {/* Team header with select-team checkbox */}
                  <div className="font-orbitron mb-2 flex items-center gap-2" style={{ fontSize: '9px', color: tColor, letterSpacing: '0.1em' }}>
                    <input
                      type="checkbox"
                      checked={teamAllSelected}
                      onChange={() => {
                        const teamIds = teamAgents.map(a => a.id)
                        setSelectedAgentIds(prev => {
                          const next = new Set(prev)
                          teamAllSelected ? teamIds.forEach(id => next.delete(id)) : teamIds.forEach(id => next.add(id))
                          return next
                        })
                      }}
                      style={{ accentColor: tColor, width: 12, height: 12, cursor: 'pointer' }}
                    />
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: tColor, display: 'inline-block' }} />
                    {team}
                    <span style={{ color: '#374151', fontWeight: 400 }}>({teamAgents.length})</span>
                  </div>
                  <div className="rounded-xl overflow-hidden" style={{ background: '#181218', border: '1px solid #2E1E27' }}>
                    {teamAgents.map((agent, idx) => (
                      <div
                        key={agent.id}
                        className="flex items-center gap-3 px-4 py-3 transition-colors"
                        style={{
                          borderTop: idx > 0 ? '1px solid #1a1020' : undefined,
                          background: selectedAgentIds.has(agent.id) ? 'rgba(232,54,93,0.04)' : undefined,
                        }}
                      >
                        {/* Row checkbox */}
                        <input
                          type="checkbox"
                          checked={selectedAgentIds.has(agent.id)}
                          onChange={() => toggleAgent(agent.id)}
                          style={{ accentColor: '#E8365D', width: 13, height: 13, cursor: 'pointer', flexShrink: 0 }}
                        />
                        <PixelSprite agentId={agent.id} size={32} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white">{lang === 'EN' && agent.name_en ? agent.name_en : agent.name}</div>
                          <div className="font-orbitron" style={{ fontSize: '8px', color: '#475569' }}>{agent.role}</div>
                        </div>

                        {/* Model selector */}
                        <div className="flex flex-col gap-0.5">
                          <label className="font-orbitron" style={{ fontSize: '7px', color: '#374151', letterSpacing: '0.06em' }}>MODEL</label>
                          <select
                            value={agent.model}
                            onChange={e => updateAgent(agent.id, { model: e.target.value })}
                            className="gank-input"
                            style={{ fontSize: '9px', padding: '3px 6px', minWidth: 160 }}
                          >
                            <optgroup label="── Claude">
                              {Object.entries(MODEL_LABELS).map(([id, label]) => (
                                <option key={id} value={id}>{label}</option>
                              ))}
                            </optgroup>
                            {ollamaModels.length > 0 && (
                              <optgroup label="── Ollama (Local)">
                                {ollamaModels.map((m) => (
                                  <option key={`ollama:${m}`} value={`ollama:${m}`}>{m}</option>
                                ))}
                              </optgroup>
                            )}
                          </select>
                        </div>

                        {/* Effort selector */}
                        <div className="flex flex-col gap-0.5">
                          <label className="font-orbitron" style={{ fontSize: '7px', color: '#374151', letterSpacing: '0.06em' }}>EFFORT</label>
                          <select
                            value={agent.effort}
                            onChange={e => updateAgent(agent.id, { effort: e.target.value as Agent['effort'] })}
                            className="gank-input"
                            style={{ fontSize: '9px', padding: '3px 6px' }}
                          >
                            <option value="low">{t('effort_option_low')}</option>
                            <option value="normal">{t('effort_option_normal')}</option>
                            <option value="high">{t('effort_option_high')}</option>
                          </select>
                        </div>

                        {/* Current model badge */}
                        <div className="font-orbitron px-2 py-1 rounded flex-shrink-0" style={{
                          fontSize: '8px',
                          background: agent.model.startsWith('ollama:') ? 'rgba(251,191,36,0.15)'
                            : agent.model.includes('opus') ? 'rgba(168,85,247,0.15)'
                            : agent.model.includes('sonnet') ? 'rgba(45,127,255,0.15)'
                            : 'rgba(34,197,94,0.15)',
                          color: agent.model.startsWith('ollama:') ? '#fbbf24'
                            : agent.model.includes('opus') ? '#a855f7'
                            : agent.model.includes('sonnet') ? '#2d7fff'
                            : '#22c55e',
                        }}>
                          {agent.model.startsWith('ollama:') ? 'OLLAMA' : agent.model.includes('opus') ? 'OPUS' : agent.model.includes('sonnet') ? 'SONNET' : 'HAIKU'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )
      })()}

      {/* ════════ SKILLS TAB ════════ */}
      {tab === 'skills' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="font-orbitron" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>{t('sys_skill_library')} ({skills.length})</div>
            <button onClick={() => setShowCreateSkill(true)} className="btn-deploy" style={{ padding: '6px 14px', fontSize: '9px' }}>{t('sys_create_skill')}</button>
          </div>

          {/* Category filter */}
          <div className="flex gap-1.5 flex-wrap mb-4">
            {categories.map((cat) => (
              <button key={cat} onClick={() => setFilterCat(cat)}
                className="font-orbitron text-xs px-2.5 py-1 rounded transition-all"
                style={filterCat === cat
                  ? { background: cat === 'all' ? 'rgba(212,67,107,0.15)' : `${CAT_COLOR[cat] || '#64748b'}33`, color: cat === 'all' ? '#E8365D' : CAT_COLOR[cat] || '#64748b', fontSize: '9px', letterSpacing: '0.05em' }
                  : { background: '#181218', color: '#374151', fontSize: '9px', letterSpacing: '0.05em' }}>
                {cat === 'all' ? 'ALL' : cat.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Skills Grid */}
          <div className="grid grid-cols-3 gap-3">
            {filteredSkills.map((skill) => {
              const color = CAT_COLOR[skill.category] || '#64748b'
              return (
                <button key={skill.id} onClick={() => setViewSkill(skill)}
                  className="rounded-lg p-4 text-left transition-all hover:border-opacity-80"
                  style={{ background: '#181218', border: '1px solid #1a2030' }}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg" style={{ background: `${color}22` }}>{skill.icon}</div>
                    <span className="cat-badge" style={{ background: `${color}22`, color, fontSize: '8px' }}>{skill.category.toUpperCase()}</span>
                  </div>
                  <div className="text-sm font-medium text-white mb-1">{skill.name}</div>
                  <div className="text-xs line-clamp-2 mb-2" style={{ color: '#64748b' }}>{skill.description}</div>
                  <div className="font-orbitron" style={{ fontSize: '8px', color: '#374151' }}>USED {skill.usage_count || 0}x</div>
                </button>
              )
            })}
            <button onClick={() => setShowCreateSkill(true)}
              className="rounded-lg p-4 flex flex-col items-center justify-center gap-2 transition-all"
              style={{ background: '#0A0709', border: '2px dashed #1a2030', minHeight: 140 }}>
              <span className="text-xl" style={{ color: '#1f2937' }}>+</span>
              <span className="font-orbitron" style={{ fontSize: '9px', color: '#1f2937', letterSpacing: '0.08em' }}>{t('sys_create_skill')}</span>
            </button>
          </div>

          {/* View Skill Modal */}
          {viewSkill && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }}
              onClick={(e) => { if (e.target === e.currentTarget) setViewSkill(null) }}>
              <div className="w-full max-w-lg rounded-xl overflow-hidden" style={{ background: '#181218', border: '1px solid #2A1622' }}>
                <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: '#181218' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl" style={{ background: `${CAT_COLOR[viewSkill.category] || '#64748b'}22` }}>{viewSkill.icon}</div>
                    <div>
                      <div className="text-white font-semibold">{viewSkill.name}</div>
                      <span className="cat-badge" style={{ background: `${CAT_COLOR[viewSkill.category]}22`, color: CAT_COLOR[viewSkill.category], fontSize: '8px' }}>{viewSkill.category.toUpperCase()}</span>
                    </div>
                  </div>
                  <button onClick={() => setViewSkill(null)} className="text-xs" style={{ color: '#374151' }}>✕</button>
                </div>
                <div className="p-5 space-y-3">
                  <div className="text-sm" style={{ color: '#94a3b8' }}>{viewSkill.description}</div>
                  <div>
                    <div className="font-orbitron mb-1" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>PROMPT TEMPLATE</div>
                    <div className="terminal rounded-lg p-3 text-xs">{viewSkill.prompt_template}</div>
                  </div>
                  <div className="flex gap-3">
                    <span className="font-orbitron" style={{ fontSize: '9px', color: '#374151' }}>{t('sys_skill_used')} {viewSkill.usage_count || 0}x</span>
                    <span className="font-orbitron" style={{ fontSize: '9px', color: '#1f2937' }}>{t('sys_skill_created')} {new Date(viewSkill.created_at).toLocaleDateString('th-TH')}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Create Skill Modal */}
          {showCreateSkill && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
              <div className="w-full max-w-lg rounded-xl overflow-hidden" style={{ background: '#181218', border: '1px solid #2A1622' }}>
                <div className="p-5 border-b" style={{ borderColor: '#181218' }}>
                  <span className="font-orbitron text-xs font-bold text-white" style={{ letterSpacing: '0.08em' }}>{t('sys_create_skill_modal')}</span>
                </div>
                <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-orbitron block mb-1" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>NAME</label>
                      <input type="text" value={skillForm.name} onChange={(e) => setSkillForm((f) => ({ ...f, name: e.target.value }))} className="gank-input" placeholder="e.g. SWOT Analysis" />
                    </div>
                    <div>
                      <label className="font-orbitron block mb-1" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>ICON</label>
                      <input type="text" value={skillForm.icon} onChange={(e) => setSkillForm((f) => ({ ...f, icon: e.target.value }))} className="gank-input text-center text-xl" />
                    </div>
                  </div>
                  <div>
                    <label className="font-orbitron block mb-1" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>CATEGORY</label>
                    <select value={skillForm.category} onChange={(e) => setSkillForm((f) => ({ ...f, category: e.target.value }))} className="gank-input">
                      {Object.keys(CAT_COLOR).map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="font-orbitron block mb-1" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>DESCRIPTION</label>
                    <input type="text" value={skillForm.description} onChange={(e) => setSkillForm((f) => ({ ...f, description: e.target.value }))} className="gank-input" />
                  </div>
                  <div>
                    <label className="font-orbitron block mb-1" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>PROMPT TEMPLATE</label>
                    <textarea rows={5} value={skillForm.prompt_template} onChange={(e) => setSkillForm((f) => ({ ...f, prompt_template: e.target.value }))} className="gank-input resize-none" style={{ fontFamily: 'monospace' }} />
                  </div>
                </div>
                <div className="p-4 border-t flex gap-2" style={{ borderColor: '#181218' }}>
                  <button onClick={createSkill} disabled={!skillForm.name || !skillForm.prompt_template} className="btn-deploy flex-1">{t('sys_skill_create_btn')}</button>
                  <button onClick={() => setShowCreateSkill(false)} className="px-4 py-2 rounded text-xs font-orbitron" style={{ background: '#181218', border: '1px solid #2A1622', color: '#64748b', letterSpacing: '0.08em' }}>{t('sys_skill_cancel_btn')}</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════ MEMORY TAB ════════ */}
      {tab === 'memory' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="font-orbitron" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>{t('sys_memory_db')} ({memories.length})</div>
            <button onClick={() => setShowAddMemory(true)} className="btn-deploy" style={{ padding: '6px 14px', fontSize: '9px' }}>{t('sys_add_memory')}</button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: t('total'), value: memories.length, color: '#2d7fff' },
              { label: t('sys_high_importance'), value: memories.filter((m) => m.importance >= 8).length, color: '#ef4444' },
              { label: t('agents_count'), value: new Set(memories.map((m) => m.agent_id)).size, color: '#22c55e' },
            ].map((s) => (
              <div key={s.label} className="stat-card">
                <div className="font-orbitron mb-1" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>{s.label}</div>
                <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Agent filter */}
          <div className="flex gap-1.5 flex-wrap mb-4">
            <button onClick={() => setFilterAgent('all')} className="font-orbitron text-xs px-2.5 py-1 rounded transition-all"
              style={filterAgent === 'all' ? { background: 'rgba(212,67,107,0.15)', color: '#E8365D', fontSize: '9px' } : { background: '#181218', color: '#374151', fontSize: '9px' }}>ALL</button>
            {agents.map((a) => (
              <button key={a.id} onClick={() => setFilterAgent(a.id)} className="flex items-center gap-1 px-2 py-1 rounded transition-all"
                style={filterAgent === a.id ? { background: 'rgba(212,67,107,0.1)', border: '1px solid #E8365D33' } : { background: '#181218', border: '1px solid transparent' }}>
                <PixelSprite agentId={a.id} size={14} />
                <span className="text-xs" style={{ color: filterAgent === a.id ? '#e2e8f0' : '#374151' }}>{lang === 'EN' && a.name_en ? a.name_en : a.name}</span>
              </button>
            ))}
          </div>

          {/* Memory grid */}
          {memories.length === 0 ? (
            <div className="text-center py-12 rounded-lg font-orbitron" style={{ background: '#0A0709', border: '1px solid #181218', color: '#1f2937', fontSize: '9px', letterSpacing: '0.08em' }}>
              {t('sys_no_memories')}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {memories.map((mem) => (
                <div key={mem.id} className="rounded-lg p-4 fade-in-up" style={{ background: '#181218', border: '1px solid #1a2030' }}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <PixelSprite agentId={mem.agent_id} size={22} />
                      <div>
                        <div className="text-xs font-medium text-white">{mem.agent_name}</div>
                        <div className="font-orbitron" style={{ fontSize: '8px', color: '#1f2937' }}>{new Date(mem.created_at).toLocaleString('th-TH')}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-orbitron px-1.5 py-0.5 rounded" style={{ fontSize: '8px', background: `${impColor(mem.importance)}22`, color: impColor(mem.importance) }}>
                        ★ {mem.importance}
                      </span>
                      <button onClick={() => deleteMemory(mem.id)} className="text-xs transition-colors" style={{ color: '#1f2937' }}>✕</button>
                    </div>
                  </div>
                  {mem.summary && <div className="text-xs font-medium mb-1" style={{ color: '#94a3b8' }}>{mem.summary}</div>}
                  <div className="text-xs leading-relaxed line-clamp-4" style={{ color: '#64748b' }}>{mem.content}</div>
                  <div className="mt-2 h-1 rounded-full" style={{ background: '#181218' }}>
                    <div className="h-full rounded-full" style={{ width: `${(mem.importance / 10) * 100}%`, background: impColor(mem.importance) }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Memory Modal */}
          {showAddMemory && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
              <div className="w-full max-w-md rounded-xl overflow-hidden" style={{ background: '#181218', border: '1px solid #2A1622' }}>
                <div className="p-5 border-b" style={{ borderColor: '#181218' }}>
                  <span className="font-orbitron text-xs font-bold text-white" style={{ letterSpacing: '0.08em' }}>{t('sys_add_memory_modal')}</span>
                </div>
                <div className="p-5 space-y-3">
                  <div>
                    <label className="font-orbitron block mb-1" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>AGENT</label>
                    <select value={memForm.agent_id} onChange={(e) => setMemForm((f) => ({ ...f, agent_id: e.target.value }))} className="gank-input">
                      {agents.map((a) => <option key={a.id} value={a.id}>{lang === 'EN' && a.name_en ? a.name_en : a.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="font-orbitron block mb-1" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>CONTENT</label>
                    <textarea rows={4} value={memForm.content} onChange={(e) => setMemForm((f) => ({ ...f, content: e.target.value }))} className="gank-input resize-none" placeholder={t('sys_mem_content_placeholder')} />
                  </div>
                  <div>
                    <label className="font-orbitron block mb-2" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>IMPORTANCE: {memForm.importance}/10</label>
                    <input type="range" min={1} max={10} value={memForm.importance} onChange={(e) => setMemForm((f) => ({ ...f, importance: Number(e.target.value) }))} className="w-full" />
                  </div>
                </div>
                <div className="p-4 border-t flex gap-2" style={{ borderColor: '#181218' }}>
                  <button onClick={addMemory} disabled={!memForm.content} className="btn-deploy flex-1">{t('sys_mem_save_btn')}</button>
                  <button onClick={() => setShowAddMemory(false)} className="px-4 py-2 rounded text-xs font-orbitron" style={{ background: '#181218', border: '1px solid #2A1622', color: '#64748b', letterSpacing: '0.08em' }}>{t('sys_mem_cancel_btn')}</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════ NOTIFY TAB ════════ */}
      {tab === 'notify' && (
        <div className="max-w-3xl space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-white font-semibold text-sm">{t('sys_notify_title')}</h2>
              <p style={{ fontSize: '10px', color: '#475569' }}>{t('sys_notify_desc')}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => addNotifyConfig('line')} className="font-orbitron px-3 py-1.5 rounded" style={{ fontSize: '9px', background: 'rgba(6,199,85,0.15)', border: '1px solid rgba(6,199,85,0.4)', color: '#06c755' }}>
                + LINE
              </button>
              <button onClick={() => addNotifyConfig('teams')} className="font-orbitron px-3 py-1.5 rounded" style={{ fontSize: '9px', background: 'rgba(98,100,167,0.15)', border: '1px solid rgba(98,100,167,0.4)', color: '#6264a7' }}>
                + TEAMS
              </button>
            </div>
          </div>

          {notifyConfigs.length === 0 && (
            <div className="text-center py-12 rounded-lg" style={{ background: '#181218', border: '1px solid #2E1E27' }}>
              <div style={{ fontSize: '32px', opacity: 0.3 }}>🔔</div>
              <div className="font-orbitron mt-2" style={{ fontSize: '9px', color: '#374151' }}>{t('sys_notify_empty')}</div>
            </div>
          )}

          {notifyConfigs.map(config => (
            <div key={config.id} className="rounded-lg overflow-hidden" style={{ background: '#181218', border: `1px solid ${config.platform === 'line' ? 'rgba(6,199,85,0.3)' : 'rgba(98,100,167,0.3)'}` }}>
              <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid #2E1E27' }}>
                <div className="flex items-center gap-3">
                  <span style={{ fontSize: '20px' }}>{config.platform === 'line' ? '💚' : '💜'}</span>
                  <div>
                    <span className="font-orbitron font-bold text-white" style={{ fontSize: '11px', letterSpacing: '0.06em' }}>
                      {config.platform === 'line' ? 'LINE Messaging API' : 'Microsoft Teams'}
                    </span>
                    <span className="font-orbitron ml-2 px-1.5 py-0.5 rounded" style={{
                      fontSize: '7px',
                      background: config.enabled ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                      color: config.enabled ? '#22c55e' : '#ef4444',
                    }}>
                      {config.enabled ? t('sys_notify_active') : t('sys_notify_disabled')}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateNotifyConfig(config.id, { enabled: config.enabled ? 0 : 1 })}
                    className="relative rounded-full transition-colors"
                    style={{ width: 36, height: 20, background: config.enabled ? '#10b981' : '#1f2937' }}
                  >
                    <span className="absolute rounded-full bg-white transition-all" style={{ width: 14, height: 14, top: 3, left: config.enabled ? 19 : 3 }} />
                  </button>
                  <button onClick={() => deleteNotifyConfig(config.id)} className="text-xs" style={{ color: '#ef4444' }}>✕</button>
                </div>
              </div>

              <div className="p-4 space-y-3">
                {config.platform === 'line' ? (
                  <div className="space-y-3">
                    <div>
                      <label className="font-orbitron block mb-1" style={{ fontSize: '8px', color: '#06c755', letterSpacing: '0.08em' }}>CHANNEL ACCESS TOKEN</label>
                      <input
                        type="password"
                        placeholder="Channel Access Token จาก LINE Developers Console"
                        defaultValue={config.token}
                        onBlur={(e) => updateNotifyConfig(config.id, { token: e.target.value })}
                        className="gank-input"
                        style={{ fontSize: '10px' }}
                      />
                      <div style={{ fontSize: '8px', color: '#374151', marginTop: 4 }}>
                        {t('sys_notify_line_channel_hint')}
                      </div>
                    </div>
                    <div>
                      <label className="font-orbitron block mb-1" style={{ fontSize: '8px', color: '#06c755', letterSpacing: '0.08em' }}>TARGET ID (userId / groupId)</label>
                      <input
                        type="text"
                        placeholder="U1234... หรือ C1234... (userId หรือ groupId)"
                        defaultValue={config.webhook_url}
                        onBlur={(e) => updateNotifyConfig(config.id, { webhook_url: e.target.value })}
                        className="gank-input"
                        style={{ fontSize: '10px' }}
                      />
                      <div style={{ fontSize: '8px', color: '#374151', marginTop: 4 }}>
                        {t('sys_notify_line_target_hint')}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="font-orbitron block mb-1" style={{ fontSize: '8px', color: '#6264a7', letterSpacing: '0.08em' }}>TEAMS WORKFLOW WEBHOOK URL</label>
                    <input
                      type="text"
                      placeholder="https://prod-xx.xxx.logic.azure.com/workflows/..."
                      defaultValue={config.webhook_url}
                      onBlur={(e) => updateNotifyConfig(config.id, { webhook_url: e.target.value })}
                      className="gank-input"
                      style={{ fontSize: '10px' }}
                    />
                    <div style={{ fontSize: '8px', color: '#374151', marginTop: 4 }}>
                      {t('sys_notify_teams_hint')}
                    </div>
                    <div style={{ fontSize: '8px', color: '#374151', marginTop: 2 }}>
                      {t('sys_notify_teams_steps')}
                    </div>
                  </div>
                )}

                <div>
                  <label className="font-orbitron block mb-1.5" style={{ fontSize: '8px', color: '#64748b', letterSpacing: '0.08em' }}>{t('sys_notify_when_label')}</label>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { key: 'notify_on_done', label: t('sys_notify_done_label'), color: '#22c55e' },
                      { key: 'notify_on_failed', label: t('sys_notify_failed_label'), color: '#ef4444' },
                      { key: 'notify_on_skill_update', label: t('sys_notify_skill_label'), color: '#a855f7' },
                    ].map(opt => {
                      const active = (config as any)[opt.key]
                      return (
                        <button
                          key={opt.key}
                          onClick={() => updateNotifyConfig(config.id, { [opt.key]: active ? 0 : 1 } as any)}
                          className="font-orbitron px-2.5 py-1 rounded transition-all"
                          style={{
                            fontSize: '8px',
                            background: active ? `${opt.color}20` : '#0F0B0D',
                            color: active ? opt.color : '#374151',
                            border: `1px solid ${active ? `${opt.color}40` : '#2A1622'}`,
                          }}
                        >
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Agent filter */}
                <div>
                  <label className="font-orbitron block mb-1.5" style={{ fontSize: '8px', color: '#64748b', letterSpacing: '0.08em' }}>{t('sys_notify_agents_label')}</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {(() => {
                      const filter: string[] = JSON.parse((config as any).agent_filter_json || '[]')
                      const isAll = filter.length === 0
                      return (
                        <>
                          <button
                            onClick={() => updateNotifyConfig(config.id, { agent_filter_json: '[]' } as any)}
                            className="font-orbitron px-2 py-1 rounded transition-all"
                            style={{
                              fontSize: '8px',
                              background: isAll ? 'rgba(212,67,107,0.15)' : '#0F0B0D',
                              color: isAll ? '#E8365D' : '#374151',
                              border: `1px solid ${isAll ? 'rgba(212,67,107,0.3)' : '#2A1622'}`,
                            }}
                          >
                            ALL
                          </button>
                          {agents.map(agent => {
                            const active = filter.includes(agent.id)
                            return (
                              <button
                                key={agent.id}
                                onClick={() => {
                                  const newFilter = active
                                    ? filter.filter(id => id !== agent.id)
                                    : [...filter, agent.id]
                                  updateNotifyConfig(config.id, { agent_filter_json: JSON.stringify(newFilter) } as any)
                                }}
                                className="font-orbitron px-2 py-1 rounded transition-all"
                                style={{
                                  fontSize: '7px',
                                  background: active ? 'rgba(45,127,255,0.15)' : '#0F0B0D',
                                  color: active ? '#2d7fff' : '#374151',
                                  border: `1px solid ${active ? 'rgba(45,127,255,0.3)' : '#2A1622'}`,
                                }}
                              >
                                {lang === 'EN' && agent.name_en ? agent.name_en : agent.name}
                              </button>
                            )
                          })}
                        </>
                      )
                    })()}
                  </div>
                  <div style={{ fontSize: '7px', color: '#374151', marginTop: 4 }}>
                    {t('sys_notify_all_agents_hint')}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Test button */}
          {notifyConfigs.length > 0 && (
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={testNotify}
                className="font-orbitron px-4 py-2 rounded transition-all"
                style={{ fontSize: '9px', background: 'rgba(212,67,107,0.1)', border: '1px solid rgba(212,67,107,0.3)', color: '#E8365D' }}
              >
                {t('sys_notify_test_btn')}
              </button>
              {testResult && (
                <span className="font-orbitron" style={{ fontSize: '9px', color: testResult.includes('Sending') ? '#94a3b8' : '#22c55e' }}>
                  {testResult}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ════════ DEPLOY TAB ════════ */}
      {tab === 'deploy' && (
        <div className="max-w-3xl space-y-6">
          <div className="font-orbitron mb-2" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>
            {t('sys_deploy_title')} — {t('sys_deploy_subtitle')}
          </div>

          {/* Connection Settings */}
          <div className="rounded-xl p-5 space-y-4" style={{ background: '#181218', border: '1px solid #2E1E27' }}>
            <div className="font-orbitron font-bold text-white flex items-center gap-2" style={{ fontSize: '12px', letterSpacing: '0.05em' }}>
              <span style={{ color: '#E8365D' }}>01</span> SERVER CONNECTION
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-orbitron block mb-1.5" style={{ fontSize: '8px', color: '#64748b', letterSpacing: '0.08em' }}>HOST / IP ADDRESS *</label>
                <input
                  type="text"
                  value={deployConfig.host}
                  onChange={e => setDeployConfig(c => ({ ...c, host: e.target.value }))}
                  placeholder="203.154.xx.xx"
                  className="w-full rounded px-3 py-2 font-mono text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1"
                  style={{ background: '#0F0B0D', border: '1px solid #2A1622' }}
                />
              </div>
              <div>
                <label className="font-orbitron block mb-1.5" style={{ fontSize: '8px', color: '#64748b', letterSpacing: '0.08em' }}>SSH PORT</label>
                <input
                  type="number"
                  value={deployConfig.port}
                  onChange={e => setDeployConfig(c => ({ ...c, port: Number(e.target.value) }))}
                  className="w-full rounded px-3 py-2 font-mono text-sm text-white focus:outline-none focus:ring-1"
                  style={{ background: '#0F0B0D', border: '1px solid #2A1622' }}
                />
              </div>
            </div>

            {/* Auth method toggle */}
            <div>
              <label className="font-orbitron block mb-2" style={{ fontSize: '8px', color: '#64748b', letterSpacing: '0.08em' }}>AUTHENTICATION METHOD</label>
              <div className="flex gap-2">
                {[{ v: 'sshkey', label: '🔑 SSH KEY', desc: 'Key file' }, { v: 'password', label: '🔒 PASSWORD', desc: 'Username + Pass' }].map(opt => (
                  <button
                    key={opt.v}
                    onClick={() => setDeployConfig(c => ({ ...c, auth_method: opt.v }))}
                    className="flex-1 rounded-lg px-4 py-2.5 text-left transition-all"
                    style={{
                      background: deployConfig.auth_method === opt.v ? 'rgba(212,67,107,0.08)' : '#0F0B0D',
                      border: `1px solid ${deployConfig.auth_method === opt.v ? 'rgba(212,67,107,0.35)' : '#2A1622'}`,
                    }}
                  >
                    <div className="font-orbitron font-bold" style={{ fontSize: '10px', color: deployConfig.auth_method === opt.v ? '#E8365D' : '#64748b', letterSpacing: '0.05em' }}>{opt.label}</div>
                    <div className="font-mono" style={{ fontSize: '9px', color: '#374151', marginTop: 2 }}>{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-orbitron block mb-1.5" style={{ fontSize: '8px', color: '#64748b', letterSpacing: '0.08em' }}>USERNAME</label>
                <input
                  type="text"
                  value={deployConfig.username}
                  onChange={e => setDeployConfig(c => ({ ...c, username: e.target.value }))}
                  placeholder="root"
                  className="w-full rounded px-3 py-2 font-mono text-sm text-white placeholder-gray-600 focus:outline-none"
                  style={{ background: '#0F0B0D', border: '1px solid #2A1622' }}
                />
              </div>
              {deployConfig.auth_method === 'password' ? (
                <div>
                  <label className="font-orbitron block mb-1.5" style={{ fontSize: '8px', color: '#64748b', letterSpacing: '0.08em' }}>PASSWORD</label>
                  <input
                    type="password"
                    value={deployConfig.ssh_password}
                    onChange={e => setDeployConfig(c => ({ ...c, ssh_password: e.target.value }))}
                    placeholder="••••••••"
                    className="w-full rounded px-3 py-2 font-mono text-sm text-white placeholder-gray-600 focus:outline-none"
                    style={{ background: '#0F0B0D', border: '1px solid #2A1622' }}
                  />
                </div>
              ) : (
                <div>
                  <label className="font-orbitron block mb-1.5" style={{ fontSize: '8px', color: '#64748b', letterSpacing: '0.08em' }}>SSH KEY PATH</label>
                  <input
                    type="text"
                    value={deployConfig.ssh_key_path}
                    onChange={e => setDeployConfig(c => ({ ...c, ssh_key_path: e.target.value }))}
                    placeholder="~/.ssh/id_rsa"
                    className="w-full rounded px-3 py-2 font-mono text-sm text-white placeholder-gray-600 focus:outline-none"
                    style={{ background: '#0F0B0D', border: '1px solid #2A1622' }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Domain & SSL */}
          <div className="rounded-xl p-5 space-y-4" style={{ background: '#181218', border: '1px solid #2E1E27' }}>
            <div className="font-orbitron font-bold text-white flex items-center gap-2" style={{ fontSize: '12px', letterSpacing: '0.05em' }}>
              <span style={{ color: '#E8365D' }}>02</span> DOMAIN & SSL
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-orbitron block mb-1.5" style={{ fontSize: '8px', color: '#64748b', letterSpacing: '0.08em' }}>DOMAIN NAME *</label>
                <input
                  type="text"
                  value={deployConfig.domain}
                  onChange={e => setDeployConfig(c => ({ ...c, domain: e.target.value }))}
                  placeholder="myapp.com"
                  className="w-full rounded px-3 py-2 font-mono text-sm text-white placeholder-gray-600 focus:outline-none"
                  style={{ background: '#0F0B0D', border: '1px solid #2A1622' }}
                />
                <div className="mt-1" style={{ fontSize: '8px', color: '#374151' }}>
                  *.domain → wildcard subdomain (leave.myapp.com, booking.myapp.com)
                </div>
              </div>
              <div>
                <label className="font-orbitron block mb-1.5" style={{ fontSize: '8px', color: '#64748b', letterSpacing: '0.08em' }}>BASE DIRECTORY ON VPS</label>
                <input
                  type="text"
                  value={deployConfig.deploy_path}
                  onChange={e => setDeployConfig(c => ({ ...c, deploy_path: e.target.value }))}
                  placeholder="/apps"
                  className="w-full rounded px-3 py-2 font-mono text-sm text-white placeholder-gray-600 focus:outline-none"
                  style={{ background: '#0F0B0D', border: '1px solid #2A1622' }}
                />
                <div className="mt-1" style={{ fontSize: '8px', color: '#374151' }}>
                  แต่ละ project จะอยู่ใน {deployConfig.deploy_path || '/apps'}/<span style={{ color: '#E8365D' }}>project-slug</span>
                </div>
              </div>
            </div>

            {/* Project deployment preview */}
            {deployProjects.length > 0 && (
              <div>
                <div className="font-orbitron mb-2 flex items-center gap-2" style={{ fontSize: '8px', color: '#64748b', letterSpacing: '0.08em' }}>
                  PROJECTS — AUTO-COMPUTED PATHS
                  <span className="rounded px-1.5 py-0.5 font-mono" style={{ fontSize: '7px', background: 'rgba(212,67,107,0.08)', color: '#E8365D', border: '1px solid rgba(212,67,107,0.15)' }}>
                    {deployProjects.length} projects
                  </span>
                </div>
                <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #2A1622' }}>
                  <table className="w-full">
                    <thead>
                      <tr style={{ background: '#0a0f16' }}>
                        <th className="text-left px-3 py-2 font-orbitron" style={{ fontSize: '7px', color: '#374151', letterSpacing: '0.08em' }}>PROJECT</th>
                        <th className="text-left px-3 py-2 font-orbitron" style={{ fontSize: '7px', color: '#374151', letterSpacing: '0.08em' }}>VPS PATH</th>
                        <th className="text-left px-3 py-2 font-orbitron" style={{ fontSize: '7px', color: '#374151', letterSpacing: '0.08em' }}>URL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deployProjects.map((p, i) => {
                        const slug = p.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
                        const vpsPath = `${deployConfig.deploy_path || '/apps'}/${slug}`
                        const url = deployConfig.domain ? `${slug}.${deployConfig.domain}` : '—'
                        return (
                          <tr key={p.id} style={{ borderTop: i > 0 ? '1px solid #0F0B0D' : undefined, background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                            <td className="px-3 py-2">
                              <span className="font-mono text-xs text-white">{p.name}</span>
                            </td>
                            <td className="px-3 py-2">
                              <span className="font-mono" style={{ fontSize: '11px', color: '#22c55e' }}>{vpsPath}</span>
                            </td>
                            <td className="px-3 py-2">
                              <span className="font-mono" style={{ fontSize: '11px', color: deployConfig.domain ? '#E8365D' : '#374151' }}>
                                {deployConfig.ssl_mode !== 'none' && deployConfig.domain ? 'https://' : ''}{url}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-1.5" style={{ fontSize: '7px', color: '#374151' }}>
                  ⚡ ระบบจะสร้าง directory + Nginx config + SSL ให้อัตโนมัติตาม path ด้านบน
                </div>
              </div>
            )}

            {deployProjects.length === 0 && (
              <div className="rounded-lg p-4 text-center" style={{ background: '#0F0B0D', border: '1px solid #2A1622' }}>
                <div className="font-orbitron" style={{ fontSize: '9px', color: '#374151' }}>{t('sys_deploy_no_projects')}</div>
              </div>
            )}

            <div>
              <label className="font-orbitron block mb-2" style={{ fontSize: '8px', color: '#64748b', letterSpacing: '0.08em' }}>SSL MODE</label>
              <div className="flex gap-2">
                {[
                  { value: 'cloudflare', label: '☁️ CLOUDFLARE', desc: 'SSL ผ่าน Cloudflare Proxy (แนะนำ)' },
                  { value: 'letsencrypt', label: '🔒 LET\'S ENCRYPT', desc: 'Auto-renew SSL cert บน VPS' },
                  { value: 'none', label: '🚫 NONE', desc: 'HTTP only (dev/internal)' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setDeployConfig(c => ({ ...c, ssl_mode: opt.value }))}
                    className="flex-1 rounded-lg p-3 text-left transition-all"
                    style={{
                      background: deployConfig.ssl_mode === opt.value ? 'rgba(212,67,107,0.08)' : '#0F0B0D',
                      border: `1px solid ${deployConfig.ssl_mode === opt.value ? 'rgba(212,67,107,0.3)' : '#2A1622'}`,
                    }}
                  >
                    <div className="font-orbitron text-white" style={{ fontSize: '10px', letterSpacing: '0.05em' }}>{opt.label}</div>
                    <div style={{ fontSize: '8px', color: '#4a5568', marginTop: 2 }}>{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {deployConfig.ssl_mode === 'cloudflare' && (
              <div className="rounded-lg p-3 flex items-center gap-3" style={{ background: '#0F0B0D', border: '1px solid #2A1622' }}>
                <label className="flex items-center gap-2 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={!!deployConfig.cloudflare_proxy}
                    onChange={e => setDeployConfig(c => ({ ...c, cloudflare_proxy: e.target.checked ? 1 : 0 }))}
                    className="rounded"
                  />
                  <span className="font-orbitron text-white" style={{ fontSize: '10px' }}>Cloudflare Proxy 🟠 (CDN + DDoS Protection + Hide IP)</span>
                </label>
              </div>
            )}
          </div>

          {/* How it works */}
          <div className="rounded-xl p-5" style={{ background: '#181218', border: '1px solid #2E1E27' }}>
            <div className="font-orbitron font-bold text-white flex items-center gap-2 mb-3" style={{ fontSize: '12px', letterSpacing: '0.05em' }}>
              <span style={{ color: '#E8365D' }}>03</span> HOW IT WORKS
            </div>
            <div className="grid grid-cols-5 gap-3">
              {[
                { step: '1', icon: '📦', label: 'RSYNC', desc: 'Upload project files' },
                { step: '2', icon: '🐳', label: 'DOCKER', desc: 'Build & start containers' },
                { step: '3', icon: '🌐', label: 'NGINX', desc: 'Auto reverse proxy' },
                { step: '4', icon: '🔒', label: 'SSL', desc: deployConfig.ssl_mode === 'cloudflare' ? 'Cloudflare auto' : deployConfig.ssl_mode === 'letsencrypt' ? 'Certbot auto' : 'HTTP only' },
                { step: '5', icon: '✅', label: 'LIVE', desc: 'subdomain.domain' },
              ].map(s => (
                <div key={s.step} className="text-center rounded-lg p-3" style={{ background: '#0F0B0D', border: '1px solid #2A1622' }}>
                  <div style={{ fontSize: '20px' }}>{s.icon}</div>
                  <div className="font-orbitron text-white mt-1" style={{ fontSize: '9px', letterSpacing: '0.05em' }}>{s.label}</div>
                  <div style={{ fontSize: '7px', color: '#4a5568', marginTop: 2 }}>{s.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={saveDeployConfig}
              disabled={deploySaving}
              className="font-orbitron px-5 py-2.5 rounded-lg font-semibold transition-all"
              style={{ fontSize: '11px', letterSpacing: '0.05em', background: 'rgba(212,67,107,0.15)', border: '1px solid rgba(212,67,107,0.3)', color: '#E8365D' }}
            >
              {deploySaving ? t('sys_deploy_saving') : deploySaved ? t('sys_deploy_saved') : t('sys_deploy_save_btn')}
            </button>
            <button
              onClick={testDeployConnection}
              disabled={deployTesting || !deployConfig.host}
              className="font-orbitron px-5 py-2.5 rounded-lg font-semibold transition-all"
              style={{
                fontSize: '11px', letterSpacing: '0.05em',
                background: deployConfig.host ? 'rgba(34,197,94,0.15)' : '#0F0B0D',
                border: `1px solid ${deployConfig.host ? 'rgba(34,197,94,0.3)' : '#2A1622'}`,
                color: deployConfig.host ? '#22c55e' : '#374151',
                cursor: deployConfig.host ? 'pointer' : 'not-allowed',
              }}
            >
              {deployTesting ? t('sys_deploy_testing') : t('sys_deploy_test_btn')}
            </button>
          </div>

          {/* Test result */}
          {deployTestResult && (
            <div
              className="rounded-xl p-4"
              style={{
                background: deployTestResult.ok ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.05)',
                border: `1px solid ${deployTestResult.ok ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
              }}
            >
              {deployTestResult.ok ? (
                <div className="space-y-2">
                  <div className="font-orbitron font-bold flex items-center gap-2" style={{ fontSize: '12px', color: '#22c55e' }}>
                    {t('sys_deploy_success')}
                  </div>
                  <div className="font-mono text-xs space-y-1" style={{ color: '#94a3b8' }}>
                    <div><span style={{ color: '#4a5568' }}>OS:</span> {deployTestResult.uname}</div>
                    <div><span style={{ color: '#4a5568' }}>Docker:</span> {deployTestResult.docker}</div>
                    <div><span style={{ color: '#4a5568' }}>Memory:</span> {deployTestResult.memory}</div>
                    <div><span style={{ color: '#4a5568' }}>Disk:</span> {deployTestResult.disk}</div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="font-orbitron font-bold flex items-center gap-2" style={{ fontSize: '12px', color: '#ef4444' }}>
                    {t('sys_deploy_failed')}
                  </div>
                  <div className="font-mono text-xs" style={{ color: '#f87171' }}>{deployTestResult.error}</div>
                  <div style={{ fontSize: '9px', color: '#4a5568', marginTop: 4 }}>
                    {t('sys_deploy_check_hint')}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* DNS Reminder */}
          <div className="rounded-xl p-4" style={{ background: '#0F0B0D', border: '1px dashed #2E1E27' }}>
            <div className="font-orbitron mb-2" style={{ fontSize: '9px', color: '#f59e0b', letterSpacing: '0.08em' }}>{t('sys_deploy_cloudflare_dns')}</div>
            <div className="font-mono text-xs space-y-1" style={{ color: '#64748b' }}>
              <div>1. Cloudflare Dashboard → DNS → Add Record</div>
              <div>2. <span style={{ color: '#E8365D' }}>A</span> | <span style={{ color: '#E8365D' }}>@</span> | <span style={{ color: '#22c55e' }}>{deployConfig.host || '<VPS_IP>'}</span> | Proxy 🟠</div>
              <div>3. <span style={{ color: '#E8365D' }}>A</span> | <span style={{ color: '#E8365D' }}>*</span> | <span style={{ color: '#22c55e' }}>{deployConfig.host || '<VPS_IP>'}</span> | Proxy 🟠 (Wildcard)</div>
              <div>4. SSL/TLS → <span style={{ color: '#22c55e' }}>Full</span></div>
            </div>
          </div>
        </div>
      )}

      {/* ════════ SYSTEM INFO TAB ════════ */}
      {tab === 'info' && (
        <div className="max-w-3xl space-y-4">
          {/* System Status */}
          <div className="rounded-lg p-5" style={{ background: '#181218', border: '1px solid #1a2030' }}>
            <div className="flex items-center gap-3 mb-3">
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
              <span className="font-orbitron font-bold text-white" style={{ fontSize: '13px', letterSpacing: '0.08em' }}>{t('sys_info_online')}</span>
            </div>
            <div className="font-orbitron" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.05em' }}>
              CLAUDE GANK COMMAND CENTER v1.0.0 | POWERED BY ANTHROPIC CLAUDE
            </div>
          </div>

          {/* Claude CLI Path */}
          <div className="rounded-xl p-5 space-y-4" style={{ background: '#181218', border: '1px solid #2E1E27' }}>
            <div className="font-orbitron font-bold text-white flex items-center gap-2" style={{ fontSize: '12px', letterSpacing: '0.05em' }}>
              <span style={{ color: '#E8365D' }}>⚙️</span> CLAUDE CLI PATH
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <label className="font-orbitron" style={{ fontSize: '8px', color: '#64748b', letterSpacing: '0.08em' }}>PATH TO CLAUDE EXECUTABLE</label>
                  {claudePathAutoDetected && (
                    <span className="font-orbitron rounded px-1.5 py-0.5" style={{ fontSize: '7px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#22c55e' }}>
                      {t('sys_info_auto_detected')}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={claudePath}
                    onChange={e => { setClaudePath(e.target.value); setClaudePathResult(null) }}
                    placeholder="/Users/you/.local/bin/claude"
                    className="flex-1 rounded px-3 py-2 font-mono text-sm text-white placeholder-gray-600 focus:outline-none"
                    style={{ background: '#0F0B0D', border: '1px solid #2A1622' }}
                  />
                  <button
                    disabled={claudePathSaving || !claudePath}
                    onClick={async () => {
                      setClaudePathSaving(true)
                      setClaudePathResult(null)
                      const res = await fetch('/api/system/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ claude_cli_path: claudePath }) })
                      const data = await res.json()
                      setClaudePathResult(data)
                      setClaudePathSaving(false)
                    }}
                    className="font-orbitron px-4 py-2 rounded-lg font-semibold whitespace-nowrap"
                    style={{ fontSize: '10px', letterSpacing: '0.05em', background: 'rgba(212,67,107,0.12)', border: '1px solid rgba(212,67,107,0.25)', color: '#E8365D' }}
                  >
                    {claudePathSaving ? t('sys_info_saving') : t('sys_info_save_test')}
                  </button>
                </div>
                <div className="mt-1.5" style={{ fontSize: '8px', color: '#374151' }}>
                  {t('sys_info_which_claude')} <span className="font-mono px-1 rounded" style={{ background: '#0F0B0D', color: '#E8365D' }}>which claude</span>
                </div>
              </div>

              {claudePathResult && (
                <div className="rounded-lg px-3 py-2" style={{ background: claudePathResult.ok ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)', border: `1px solid ${claudePathResult.ok ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                  {claudePathResult.ok ? (
                    <div className="font-mono text-xs" style={{ color: '#22c55e' }}>
                      ✅ {claudePathResult.version}
                    </div>
                  ) : (
                    <div className="font-mono text-xs" style={{ color: '#ef4444' }}>
                      ❌ {claudePathResult.error || claudePathResult.version}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Projects Base Path */}
          <div className="rounded-xl p-5 space-y-4" style={{ background: '#181218', border: '1px solid #2E1E27' }}>
            <div className="font-orbitron font-bold text-white flex items-center gap-2" style={{ fontSize: '12px', letterSpacing: '0.05em' }}>
              <span style={{ color: '#E8365D' }}>📁</span> PROJECTS BASE PATH
            </div>
            <div className="space-y-3">
              <div>
                <label className="font-orbitron block mb-1.5" style={{ fontSize: '8px', color: '#64748b', letterSpacing: '0.08em' }}>
                  PATH TO PROJECTS DIRECTORY
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={projectsBasePath}
                    onChange={e => { setProjectsBasePath(e.target.value); setProjectsPathResult(null) }}
                    placeholder="/Users/you/projects"
                    className="flex-1 rounded px-3 py-2 font-mono text-sm text-white placeholder-gray-600 focus:outline-none"
                    style={{ background: '#0F0B0D', border: '1px solid #2A1622' }}
                  />
                  <button
                    disabled={projectsPathSaving}
                    onClick={async () => {
                      setProjectsPathSaving(true)
                      setProjectsPathResult(null)
                      const res = await fetch('/api/system/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projects_base_path: projectsBasePath }) })
                      const data = await res.json()
                      setProjectsPathResult(data)
                      setProjectsPathSaving(false)
                    }}
                    className="font-orbitron px-4 py-2 rounded-lg font-semibold whitespace-nowrap"
                    style={{ fontSize: '10px', letterSpacing: '0.05em', background: 'rgba(212,67,107,0.12)', border: '1px solid rgba(212,67,107,0.25)', color: '#E8365D' }}
                  >
                    {projectsPathSaving ? 'SAVING...' : 'SAVE'}
                  </button>
                </div>
                <div className="mt-1.5" style={{ fontSize: '8px', color: '#374151' }}>
                  Root directory where all projects will be created. e.g.{' '}
                  <span className="font-mono px-1 rounded" style={{ background: '#0F0B0D', color: '#E8365D' }}>/Users/you/projects</span>
                </div>
              </div>
              {projectsPathResult && (
                <div className="rounded-lg px-3 py-2" style={{ background: projectsPathResult.ok ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)', border: `1px solid ${projectsPathResult.ok ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                  {projectsPathResult.ok ? (
                    <div className="font-mono text-xs" style={{ color: '#22c55e' }}>
                      ✅ {projectsPathResult.cleared ? 'Cleared' : `Saved: ${projectsPathResult.path}`}
                    </div>
                  ) : (
                    <div className="font-mono text-xs" style={{ color: '#ef4444' }}>
                      ❌ {projectsPathResult.error}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Ollama Config */}
          <div className="rounded-xl p-5 space-y-4" style={{ background: '#181218', border: '1px solid #2E1E27' }}>
            <div className="font-orbitron font-bold text-white flex items-center gap-2" style={{ fontSize: '12px', letterSpacing: '0.05em' }}>
              <span style={{ color: '#fbbf24' }}>🦙</span> LOCAL MODEL (OLLAMA)
              <span className="font-orbitron px-1.5 py-0.5 rounded" style={{ fontSize: '7px', background: ollamaModels.length > 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${ollamaModels.length > 0 ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.2)'}`, color: ollamaModels.length > 0 ? '#22c55e' : '#ef4444' }}>
                {ollamaModels.length > 0 ? `● ${ollamaModels.length} MODELS` : '● OFFLINE'}
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <label className="font-orbitron" style={{ fontSize: '8px', color: '#64748b', letterSpacing: '0.08em' }}>OLLAMA BASE URL</label>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={ollamaUrl}
                  onChange={e => { setOllamaUrl(e.target.value); setOllamaResult(null) }}
                  placeholder="http://localhost:11434"
                  className="flex-1 rounded px-3 py-2 font-mono text-sm text-white placeholder-gray-600 focus:outline-none"
                  style={{ background: '#0F0B0D', border: '1px solid #2A1622' }}
                />
                <button
                  disabled={ollamaSaving || !ollamaUrl}
                  onClick={async () => {
                    setOllamaSaving(true)
                    setOllamaResult(null)
                    const res = await fetch('/api/system/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ollama_base_url: ollamaUrl }) })
                    const data = await res.json()
                    setOllamaResult(data)
                    if (data.ok && data.models) setOllamaModels(data.models)
                    setOllamaSaving(false)
                  }}
                  className="font-orbitron px-4 py-2 rounded-lg font-semibold whitespace-nowrap"
                  style={{ fontSize: '10px', letterSpacing: '0.05em', background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.25)', color: '#fbbf24' }}
                >
                  {ollamaSaving ? t('sys_info_saving') : t('sys_info_connect')}
                </button>
              </div>
              <div className="mt-1.5" style={{ fontSize: '8px', color: '#374151' }}>
                {t('sys_info_ollama_install')} <span className="font-mono px-1 rounded" style={{ background: '#0F0B0D', color: '#fbbf24' }}>ollama serve</span> then pull: <span className="font-mono px-1 rounded" style={{ background: '#0F0B0D', color: '#fbbf24' }}>ollama pull qwen3:8b</span>
              </div>
            </div>

            {ollamaResult && (
              <div className="rounded-lg px-3 py-2" style={{ background: ollamaResult.ok ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)', border: `1px solid ${ollamaResult.ok ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                {ollamaResult.ok ? (
                  <div className="font-mono text-xs" style={{ color: '#22c55e' }}>
                    ✅ Connected — {ollamaResult.models?.length || 0} models available
                  </div>
                ) : (
                  <div className="font-mono text-xs" style={{ color: '#ef4444' }}>❌ {ollamaResult.error}</div>
                )}
              </div>
            )}

            {ollamaModels.length > 0 && (
              <div>
                <div className="font-orbitron mb-2" style={{ fontSize: '8px', color: '#64748b', letterSpacing: '0.08em' }}>{t('sys_info_ollama_models_tab')}</div>
                <div className="flex flex-wrap gap-1.5">
                  {ollamaModels.map(m => (
                    <span key={m} className="font-mono rounded px-2 py-1" style={{ fontSize: '10px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', color: '#fbbf24' }}>
                      ollama:{m}
                    </span>
                  ))}
                </div>
                <div className="mt-2" style={{ fontSize: '8px', color: '#374151' }}>
                  {t('sys_info_available_models_hint')}
                </div>
              </div>
            )}

            {ollamaModels.length === 0 && (
              <div className="rounded-lg p-3" style={{ background: '#0F0B0D', border: '1px dashed #2A1622' }}>
                <div className="font-orbitron mb-1" style={{ fontSize: '8px', color: '#374151', letterSpacing: '0.05em' }}>QUICK START</div>
                <div className="font-mono space-y-1" style={{ fontSize: '10px', color: '#4b5563' }}>
                  <div><span style={{ color: '#fbbf24' }}>$</span> brew install ollama</div>
                  <div><span style={{ color: '#fbbf24' }}>$</span> ollama serve</div>
                  <div><span style={{ color: '#fbbf24' }}>$</span> ollama pull qwen3:8b</div>
                </div>
              </div>
            )}
          </div>

          {/* Jira Config */}
          <div className="rounded-xl p-5 space-y-4" style={{ background: '#181218', border: '1px solid #2E1E27' }}>
            <div className="font-orbitron font-bold text-white flex items-center gap-2" style={{ fontSize: '12px', letterSpacing: '0.05em' }}>
              <span style={{ color: '#2d7fff' }}>🔷</span> JIRA INTEGRATION
              <span className="font-orbitron px-1.5 py-0.5 rounded" style={{ fontSize: '7px', background: jiraConfigured ? 'rgba(34,197,94,0.1)' : 'rgba(100,116,139,0.1)', border: `1px solid ${jiraConfigured ? 'rgba(34,197,94,0.25)' : 'rgba(100,116,139,0.2)'}`, color: jiraConfigured ? '#22c55e' : '#64748b' }}>
                {jiraConfigured ? '● CONNECTED' : '● NOT SET'}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="font-orbitron block mb-1" style={{ fontSize: '8px', color: '#64748b', letterSpacing: '0.08em' }}>JIRA BASE URL</label>
                <input
                  type="text"
                  value={jiraBaseUrl}
                  onChange={e => { setJiraBaseUrl(e.target.value); setJiraResult(null) }}
                  placeholder="https://yourcompany.atlassian.net"
                  className="w-full rounded px-3 py-2 font-mono text-sm text-white placeholder-gray-600 focus:outline-none"
                  style={{ background: '#0F0B0D', border: '1px solid #2A1622' }}
                />
              </div>
              <div>
                <label className="font-orbitron block mb-1" style={{ fontSize: '8px', color: '#64748b', letterSpacing: '0.08em' }}>JIRA EMAIL</label>
                <input
                  type="email"
                  value={jiraEmail}
                  onChange={e => { setJiraEmail(e.target.value); setJiraResult(null) }}
                  placeholder="you@company.com"
                  className="w-full rounded px-3 py-2 font-mono text-sm text-white placeholder-gray-600 focus:outline-none"
                  style={{ background: '#0F0B0D', border: '1px solid #2A1622' }}
                />
              </div>
              <div>
                <label className="font-orbitron block mb-1" style={{ fontSize: '8px', color: '#64748b', letterSpacing: '0.08em' }}>
                  API TOKEN <span style={{ color: '#374151' }}>— สร้างได้ที่ id.atlassian.com/manage-profile/security/api-tokens</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={jiraToken}
                    onChange={e => { setJiraToken(e.target.value); setJiraResult(null) }}
                    placeholder={jiraConfigured ? '••••••••••••••• (configured)' : 'ATATT3xFfGF0...'}
                    className="flex-1 rounded px-3 py-2 font-mono text-sm text-white placeholder-gray-600 focus:outline-none"
                    style={{ background: '#0F0B0D', border: '1px solid #2A1622' }}
                  />
                  <button
                    disabled={jiraSaving}
                    onClick={async () => {
                      setJiraSaving(true)
                      setJiraResult(null)
                      const res = await fetch('/api/system/config', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ jira_base_url: jiraBaseUrl, jira_email: jiraEmail, jira_api_token: jiraToken }),
                      })
                      const data = await res.json()
                      setJiraResult(data)
                      if (data.ok && !data.cleared) setJiraConfigured(true)
                      if (data.cleared) setJiraConfigured(false)
                      setJiraSaving(false)
                    }}
                    className="font-orbitron px-4 py-2 rounded-lg font-semibold whitespace-nowrap"
                    style={{ fontSize: '10px', letterSpacing: '0.05em', background: 'rgba(45,127,255,0.12)', border: '1px solid rgba(45,127,255,0.25)', color: '#2d7fff' }}
                  >
                    {jiraSaving ? t('sys_info_saving') : t('sys_info_save_jira')}
                  </button>
                </div>
              </div>
            </div>

            {jiraResult && (
              <div className="rounded-lg px-3 py-2" style={{ background: jiraResult.ok ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)', border: `1px solid ${jiraResult.ok ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                {jiraResult.ok ? (
                  <div className="font-mono text-xs" style={{ color: '#22c55e' }}>
                    {jiraResult.cleared ? t('sys_info_jira_cleared') : `✅ Connected as ${jiraResult.display_name}`}
                  </div>
                ) : (
                  <div className="font-mono text-xs" style={{ color: '#ef4444' }}>❌ {jiraResult.error}</div>
                )}
              </div>
            )}

            <div className="rounded-lg p-3" style={{ background: '#0F0B0D', border: '1px dashed #2A1622' }}>
              <div className="font-orbitron mb-2" style={{ fontSize: '8px', color: '#374151', letterSpacing: '0.05em' }}>HOW AGENTS USE JIRA</div>
              <div className="font-mono space-y-1" style={{ fontSize: '9px', color: '#4b5563' }}>
                <div>Agent output block ใน system prompt:</div>
                <div style={{ color: '#64748b' }}>---JIRA---</div>
                <div style={{ color: '#64748b' }}>{`{ "action": "create_issue", "project_key": "PROJ",`}</div>
                <div style={{ color: '#64748b' }}>{`  "summary": "...", "issue_type": "Bug" }`}</div>
                <div style={{ color: '#64748b' }}>---END---</div>
                <div className="mt-1" style={{ color: '#374151' }}>actions: create_issue · transition · comment</div>
              </div>
            </div>
          </div>

          {/* Figma MCP */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="font-orbitron" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>FIGMA MCP</div>
              <span className="font-orbitron px-1.5 py-0.5 rounded" style={{ fontSize: '7px', background: figmaConfigured ? 'rgba(34,197,94,0.1)' : 'rgba(100,116,139,0.1)', border: `1px solid ${figmaConfigured ? 'rgba(34,197,94,0.25)' : 'rgba(100,116,139,0.2)'}`, color: figmaConfigured ? '#22c55e' : '#64748b' }}>
                {figmaConfigured ? '● CONNECTED' : '● NOT SET'}
              </span>
            </div>
            <div className="rounded-xl p-4 space-y-3" style={{ background: '#181218', border: '1px solid #1a1020' }}>
              <div>
                <div className="font-orbitron mb-1.5" style={{ fontSize: '8px', color: '#374151', letterSpacing: '0.05em' }}>PERSONAL ACCESS TOKEN</div>
                <input
                  type="password"
                  className="w-full rounded-lg px-3 py-2 text-sm text-white font-mono"
                  style={{ background: '#0F0B0D', border: '1px solid #2A1622', outline: 'none' }}
                  placeholder={figmaConfigured ? '••••••••••••••• (configured)' : 'figd_xxxxxxxxxxxxxxxxxx'}
                  value={figmaToken}
                  onChange={e => setFigmaToken(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <a
                  href="https://www.figma.com/developers/api#access-tokens"
                  target="_blank" rel="noopener noreferrer"
                  className="font-orbitron text-blue-400 hover:text-blue-300 transition-colors"
                  style={{ fontSize: '8px' }}
                >
                  {t('sys_info_figma_how_to_create')}
                </a>
                <button
                  disabled={figmaSaving}
                  onClick={async () => {
                    setFigmaSaving(true)
                    setFigmaResult(null)
                    const res = await fetch('/api/system/config', {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ figma_access_token: figmaToken }),
                    })
                    const data = await res.json()
                    setFigmaResult(data)
                    if (data.ok) { setFigmaConfigured(!!figmaToken); setFigmaToken('') }
                    setFigmaSaving(false)
                  }}
                  className="font-orbitron px-3 py-1.5 rounded-lg transition-all"
                  style={{ fontSize: '9px', background: figmaSaving ? '#1a0d20' : '#2d0a3d', border: '1px solid #7c3aed50', color: figmaSaving ? '#6b7280' : '#a78bfa', cursor: figmaSaving ? 'not-allowed' : 'pointer', letterSpacing: '0.05em' }}
                >
                  {figmaSaving ? t('sys_info_saving') : t('sys_info_save_figma')}
                </button>
              </div>

              {figmaResult && (
                <div className="rounded-lg px-3 py-2" style={{ background: figmaResult.ok ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)', border: `1px solid ${figmaResult.ok ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                  {figmaResult.ok ? (
                    <div className="font-mono text-xs" style={{ color: '#22c55e' }}>
                      {figmaResult.cleared ? t('sys_info_figma_cleared') : `✅ Connected as ${figmaResult.display_name} (${figmaResult.email})`}
                    </div>
                  ) : (
                    <div className="font-mono text-xs" style={{ color: '#ef4444' }}>❌ {figmaResult.error}</div>
                  )}
                </div>
              )}

              <div className="rounded-lg p-3" style={{ background: '#0F0B0D', border: '1px dashed #2A1622' }}>
                <div className="font-orbitron mb-2" style={{ fontSize: '8px', color: '#374151', letterSpacing: '0.05em' }}>MCP SERVER CONFIG</div>
                <div className="font-mono space-y-0.5" style={{ fontSize: '9px', color: '#4b5563' }}>
                  <div style={{ color: '#64748b' }}>{`// เขียนให้อัตโนมัติใน .claude/settings.local.json`}</div>
                  <div style={{ color: '#64748b' }}>{`"figma": {`}</div>
                  <div style={{ color: '#64748b' }}>{`  "command": "npx",`}</div>
                  <div style={{ color: '#64748b' }}>{`  "args": ["-y", "@figma/mcp-server"],`}</div>
                  <div style={{ color: '#64748b' }}>{`  "env": { "FIGMA_ACCESS_TOKEN": "..." }`}</div>
                  <div style={{ color: '#64748b' }}>{`}`}</div>
                  <div className="mt-1.5" style={{ color: '#374151' }}>{t('sys_info_mcp_restart')}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Microsoft SSO */}
          <div className="rounded-xl p-5 space-y-4" style={{ background: '#181218', border: '1px solid #2E1E27' }}>
            <div className="font-orbitron font-bold text-white flex items-center gap-2" style={{ fontSize: '12px', letterSpacing: '0.05em' }}>
              <span style={{ color: '#00A4EF' }}>🔷</span> MICROSOFT SSO (Azure AD / Entra ID)
              <span className="font-orbitron px-1.5 py-0.5 rounded" style={{ fontSize: '7px', background: msSsoConfigured ? 'rgba(34,197,94,0.1)' : 'rgba(100,116,139,0.1)', border: `1px solid ${msSsoConfigured ? 'rgba(34,197,94,0.25)' : 'rgba(100,116,139,0.2)'}`, color: msSsoConfigured ? '#22c55e' : '#64748b' }}>
                {msSsoConfigured ? (msSsoEnvEnabled ? '● ACTIVE' : '● CONFIGURED') : '● NOT SET'}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="font-orbitron block mb-1" style={{ fontSize: '8px', color: '#64748b', letterSpacing: '0.08em' }}>TENANT ID</label>
                <input
                  type="text"
                  value={msTenantId}
                  onChange={e => { setMsTenantId(e.target.value); setMsResult(null) }}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="w-full rounded px-3 py-2 font-mono text-sm text-white placeholder-gray-600 focus:outline-none"
                  style={{ background: '#0F0B0D', border: '1px solid #2A1622' }}
                />
                <div className="mt-1" style={{ fontSize: '8px', color: '#374151' }}>
                  Azure Portal → Microsoft Entra ID → Overview → Directory (tenant) ID
                </div>
              </div>
              <div>
                <label className="font-orbitron block mb-1" style={{ fontSize: '8px', color: '#64748b', letterSpacing: '0.08em' }}>CLIENT ID (Application ID)</label>
                <input
                  type="text"
                  value={msClientId}
                  onChange={e => { setMsClientId(e.target.value); setMsResult(null) }}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="w-full rounded px-3 py-2 font-mono text-sm text-white placeholder-gray-600 focus:outline-none"
                  style={{ background: '#0F0B0D', border: '1px solid #2A1622' }}
                />
              </div>
              <div>
                <label className="font-orbitron block mb-1" style={{ fontSize: '8px', color: '#64748b', letterSpacing: '0.08em' }}>CLIENT SECRET</label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={msClientSecret}
                    onChange={e => { setMsClientSecret(e.target.value); setMsResult(null) }}
                    placeholder={msSsoConfigured ? '••••••••••••••• (configured)' : 'xxxxxxxxxxxxxxxxxxxxxxxxxxxx'}
                    className="flex-1 rounded px-3 py-2 font-mono text-sm text-white placeholder-gray-600 focus:outline-none"
                    style={{ background: '#0F0B0D', border: '1px solid #2A1622' }}
                  />
                  <button
                    disabled={msSaving}
                    onClick={async () => {
                      setMsSaving(true)
                      setMsResult(null)
                      const res = await fetch('/api/system/config', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ms_tenant_id: msTenantId, ms_client_id: msClientId, ms_client_secret: msClientSecret }),
                      })
                      const data = await res.json()
                      setMsResult(data)
                      if (data.ok && !data.cleared) { setMsSsoConfigured(true); setMsClientSecret('') }
                      if (data.cleared) setMsSsoConfigured(false)
                      setMsSaving(false)
                    }}
                    className="font-orbitron px-4 py-2 rounded-lg font-semibold whitespace-nowrap"
                    style={{ fontSize: '10px', letterSpacing: '0.05em', background: 'rgba(0,164,239,0.12)', border: '1px solid rgba(0,164,239,0.3)', color: '#00A4EF' }}
                  >
                    {msSaving ? t('sys_info_saving') : t('sys_info_save_ms')}
                  </button>
                </div>
              </div>
            </div>

            {msResult && (
              <div className="rounded-lg px-3 py-2" style={{ background: msResult.ok ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)', border: `1px solid ${msResult.ok ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                <div className="font-mono text-xs" style={{ color: msResult.ok ? '#22c55e' : '#ef4444' }}>
                  {msResult.ok ? `✅ ${msResult.cleared ? t('sys_info_sso_cleared') : msResult.message}` : `❌ ${msResult.error}`}
                </div>
              </div>
            )}

            {/* Redirect URI instruction */}
            <div className="rounded-lg p-3 space-y-2" style={{ background: '#0F0B0D', border: '1px dashed #2A1622' }}>
              <div className="font-orbitron mb-1" style={{ fontSize: '8px', color: '#374151', letterSpacing: '0.05em' }}>AZURE AD APP REGISTRATION</div>
              <div className="font-mono" style={{ fontSize: '9px', color: '#4b5563' }}>
                <div>1. Azure Portal → App registrations → New registration</div>
                <div>2. Redirect URI (Web):</div>
                <div className="mt-1 px-2 py-1 rounded" style={{ background: '#181218', color: '#00A4EF' }}>
                  {'{YOUR_DOMAIN}'}/api/auth/callback/azure-ad
                </div>
                <div className="mt-1">   local: <span style={{ color: '#00A4EF' }}>http://localhost:9001/api/auth/callback/azure-ad</span></div>
                <div>3. Certificates &amp; secrets → New client secret → copy value</div>
                <div>4. API permissions → add <span style={{ color: '#a78bfa' }}>User.Read</span> → Grant admin consent</div>
              </div>
            </div>

            {/* Enable enforcement */}
            <div className="rounded-lg p-3 space-y-1.5" style={{ background: '#0F0B0D', border: '1px dashed #2A1622' }}>
              <div className="font-orbitron mb-1" style={{ fontSize: '8px', color: '#374151', letterSpacing: '0.05em' }}>ENABLE SSO PROTECTION</div>
              <div className="font-mono space-y-1" style={{ fontSize: '9px', color: '#4b5563' }}>
                <div>เพิ่มใน <span style={{ color: '#fbbf24' }}>.env.local</span> แล้ว restart server:</div>
                <div className="px-2 py-1 rounded mt-1" style={{ background: '#181218' }}>
                  <div><span style={{ color: '#22c55e' }}>NEXTAUTH_SECRET</span>=<span style={{ color: '#c4bfe8' }}>{'<random-secret>'}</span></div>
                  <div><span style={{ color: '#22c55e' }}>NEXTAUTH_URL</span>=<span style={{ color: '#c4bfe8' }}>{'<your-app-url>'}</span></div>
                  <div><span style={{ color: '#22c55e' }}>MS_SSO_ENABLED</span>=<span style={{ color: '#E8365D' }}>1</span></div>
                </div>
                <div className="mt-1" style={{ color: msSsoEnvEnabled ? '#22c55e' : '#374151' }}>
                  {msSsoEnvEnabled ? '● MS_SSO_ENABLED=1 ตั้งค่าแล้ว — SSO บังคับใช้งาน' : '○ MS_SSO_ENABLED ยังไม่ได้ตั้งค่า — app เปิดใช้งานปกติ (ไม่บังคับ login)'}
                </div>
              </div>
            </div>
          </div>

          {/* DB Stats */}
          <div>
            <div className="font-orbitron mb-2" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>DATABASE STATISTICS</div>
            <div className="grid grid-cols-5 gap-3">
              {[
                { label: 'AGENTS', value: stats?.totalAgents ?? 0, color: '#2d7fff' },
                { label: 'MISSIONS', value: stats?.totalMissions ?? 0, color: '#E8365D' },
                { label: 'MEMORIES', value: stats?.totalMemories ?? 0, color: '#a855f7' },
                { label: 'SKILLS', value: skills.length, color: '#f59e0b' },
                { label: 'MESSAGES', value: stats?.totalMessages ?? 0, color: '#22c55e' },
              ].map((s) => (
                <div key={s.label} className="stat-card text-center">
                  <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
                  <div className="font-orbitron mt-1" style={{ fontSize: '8px', color: '#374151', letterSpacing: '0.05em' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Model Config */}
          <div>
            <div className="font-orbitron mb-2" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>MODEL CONFIGURATION</div>
            <div className="space-y-2">
              {Object.entries(MODEL_LABELS).map(([id, label]) => (
                <div key={id} className="rounded-lg p-3 flex items-center justify-between" style={{ background: '#181218', border: '1px solid #1a2030' }}>
                  <div>
                    <span className="text-sm text-white">{label}</span>
                    <div className="font-orbitron mt-0.5" style={{ fontSize: '8px', color: '#374151' }}>{id}</div>
                  </div>
                  <span className="font-orbitron px-2 py-1 rounded" style={{ fontSize: '9px', background: '#181218', color: '#E8365D' }}>ACTIVE</span>
                </div>
              ))}
            </div>
          </div>

          {/* Team Roster */}
          <div>
            <div className="font-orbitron mb-2" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>TEAM ROSTER</div>
            <div className="space-y-2">
              {TEAM_ORDER.map((team) => {
                const ta = agents.filter((a) => a.team === team)
                const ts = stats?.teamStats?.find((t: any) => t.team === team)
                return (
                  <div key={team} className="rounded-lg p-3 flex items-center gap-3" style={{ background: '#181218', border: '1px solid #1a2030' }}>
                    <span className="font-orbitron font-bold" style={{ fontSize: '11px', color: TEAM_COLOR[team], letterSpacing: '0.05em', width: 70 }}>{TEAM_DISPLAY[team]}</span>
                    <div className="flex items-center gap-1">
                      {ta.map((a) => <PixelSprite key={a.id} agentId={a.id} size={22} />)}
                    </div>
                    <div className="flex-1" />
                    <span className="font-orbitron" style={{ fontSize: '9px', color: '#374151' }}>{ta.length} AGENTS</span>
                    <span className="font-orbitron" style={{ fontSize: '9px', color: TEAM_COLOR[team] }}>{ts?.mission_count ?? 0} MISSIONS</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* API Endpoints */}
          <div>
            <div className="font-orbitron mb-2" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>API ENDPOINTS</div>
            <div className="terminal rounded-lg p-4 text-xs space-y-1">
              {[
                'GET    /api/agents', 'POST   /api/agents', 'PATCH  /api/agents/:id',
                'GET    /api/missions', 'POST   /api/missions', 'POST   /api/missions/:id/execute',
                'GET    /api/memory', 'POST   /api/memory', 'DELETE /api/memory',
                'GET    /api/skills', 'POST   /api/skills',
                'GET    /api/messages', 'POST   /api/messages',
                'GET    /api/stats',
              ].map((ep) => <div key={ep}>{ep}</div>)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
