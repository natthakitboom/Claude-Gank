'use client'

import { useState, useEffect, useCallback } from 'react'
import { LayoutTemplate, Plus, Pencil, Trash2, ImageOff, Loader2, X, Check } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Template {
  id: string
  name: string
  description: string
  tech_stack: string
  figma_url: string
  figma_node_id: string
  figma_thumbnail_url: string
  figma_design_context: string
  system_prompt_extra: string
  tags_json: string
  created_at: string
}

interface TemplateForm {
  name: string
  description: string
  tech_stack: string
  figma_url: string
  figma_design_context: string
  system_prompt_extra: string
  tags: string
}

interface FigmaPreview {
  thumbnail_url: string
  node_name?: string
  file_name?: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const EMPTY_FORM: TemplateForm = {
  name: '',
  description: '',
  tech_stack: '',
  figma_url: '',
  figma_design_context: '',
  system_prompt_extra: '',
  tags: '',
}

function parseTags(tagsJson: string): string[] {
  try { return JSON.parse(tagsJson) as string[] } catch { return [] }
}

function formToPayload(form: TemplateForm) {
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    tech_stack: form.tech_stack.trim(),
    figma_url: form.figma_url.trim(),
    figma_design_context: form.figma_design_context.trim(),
    system_prompt_extra: form.system_prompt_extra.trim(),
    tags_json: JSON.stringify(
      form.tags.split(',').map(t => t.trim()).filter(Boolean)
    ),
  }
}

function templateToForm(t: Template): TemplateForm {
  return {
    name: t.name,
    description: t.description,
    tech_stack: t.tech_stack,
    figma_url: t.figma_url,
    figma_design_context: t.figma_design_context ?? '',
    system_prompt_extra: t.system_prompt_extra,
    tags: parseTags(t.tags_json).join(', '),
  }
}

// ── Shared input style ─────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  background: '#13101e',
  border: '1px solid #2d2848',
  borderRadius: 8,
  color: 'white',
  padding: '8px 12px',
  fontSize: 13,
  width: '100%',
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-orbitron, monospace)',
  fontSize: 8,
  letterSpacing: '0.08em',
  color: '#374151',
  textTransform: 'uppercase' as const,
  marginBottom: 4,
  display: 'block',
}

// ── Sub-component: Form fields ─────────────────────────────────────────────────

function TemplateFormFields({
  form,
  onChange,
  figmaPreview,
  fetchingFigma,
  onFetchFigma,
  tempId,
}: {
  form: TemplateForm
  onChange: (f: TemplateForm) => void
  figmaPreview: FigmaPreview | null
  fetchingFigma: boolean
  onFetchFigma: () => void
  tempId: string
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      {/* Name — full width */}
      <div style={{ gridColumn: '1 / -1' }}>
        <label style={labelStyle}>ชื่อเทมเพลต *</label>
        <input
          style={inputStyle}
          value={form.name}
          onChange={e => onChange({ ...form, name: e.target.value })}
          placeholder="เช่น Web App + Auth"
        />
      </div>

      {/* Description — full width */}
      <div style={{ gridColumn: '1 / -1' }}>
        <label style={labelStyle}>คำอธิบาย</label>
        <textarea
          style={{ ...inputStyle, resize: 'vertical', minHeight: 64 }}
          value={form.description}
          onChange={e => onChange({ ...form, description: e.target.value })}
          placeholder="อธิบายว่าเทมเพลตนี้เหมาะกับงานแบบไหน"
          rows={3}
        />
      </div>

      {/* Tech stack */}
      <div>
        <label style={labelStyle}>Tech Stack</label>
        <input
          style={inputStyle}
          value={form.tech_stack}
          onChange={e => onChange({ ...form, tech_stack: e.target.value })}
          placeholder="Next.js 15 + PostgreSQL + Docker"
        />
      </div>

      {/* Tags */}
      <div>
        <label style={labelStyle}>Tags (คั่นด้วย ,)</label>
        <input
          style={inputStyle}
          value={form.tags}
          onChange={e => onChange({ ...form, tags: e.target.value })}
          placeholder="web, fullstack, api"
        />
      </div>

      {/* Figma URL — full width */}
      <div style={{ gridColumn: '1 / -1' }}>
        <label style={labelStyle}>Figma URL (optional)</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            style={{ ...inputStyle, flex: 1 }}
            value={form.figma_url}
            onChange={e => onChange({ ...form, figma_url: e.target.value })}
            placeholder="https://www.figma.com/design/..."
          />
          <button
            type="button"
            onClick={onFetchFigma}
            disabled={!form.figma_url.trim() || fetchingFigma}
            style={{
              background: form.figma_url.trim() ? '#1c1830' : '#13101e',
              border: '1px solid #2d2848',
              borderRadius: 8,
              color: form.figma_url.trim() ? '#c4bfe8' : '#374151',
              padding: '8px 14px',
              fontSize: 12,
              cursor: form.figma_url.trim() && !fetchingFigma ? 'pointer' : 'not-allowed',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {fetchingFigma ? <Loader2 size={13} className="animate-spin" /> : <ImageOff size={13} />}
            Fetch Preview
          </button>
        </div>

        {/* Figma thumbnail preview */}
        {figmaPreview && figmaPreview.thumbnail_url && (
          <div style={{ marginTop: 8, borderRadius: 8, overflow: 'hidden', border: '1px solid #2d2848', maxHeight: 140 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={figmaPreview.thumbnail_url}
              alt="Figma preview"
              style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }}
            />
            {(figmaPreview.file_name || figmaPreview.node_name) && (
              <div style={{ background: '#0d0b14', padding: '6px 10px', fontSize: 11, color: '#9b93c8' }}>
                {figmaPreview.file_name && <span>{figmaPreview.file_name}</span>}
                {figmaPreview.node_name && <span style={{ color: '#635c8a' }}> / {figmaPreview.node_name}</span>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Figma Design Context — full width */}
      <div style={{ gridColumn: '1 / -1' }}>
        <label style={labelStyle}>Figma Design Context <span style={{ color: '#7367f0', fontWeight: 600 }}>✦ agents จะได้รับข้อมูลนี้</span></label>
        <textarea
          style={{ ...inputStyle, resize: 'vertical', minHeight: 120, fontFamily: 'monospace', fontSize: 11 }}
          value={form.figma_design_context}
          onChange={e => onChange({ ...form, figma_design_context: e.target.value })}
          placeholder="Design system ที่ agent จะใช้ เช่น สี, font, component style, layout rules...&#10;สามารถ paste มาจาก Figma หรือเขียน design spec ได้เลย"
          rows={6}
        />
        <p style={{ fontSize: 10, color: '#4b5563', marginTop: 4 }}>
          ข้อมูลนี้จะถูกส่งให้ UX/UI agent และ Frontend agent ทุก task — ยิ่งละเอียดยิ่งดี
        </p>
      </div>

      {/* System Prompt Extra — full width */}
      <div style={{ gridColumn: '1 / -1' }}>
        <label style={labelStyle}>System Prompt เพิ่มเติม</label>
        <textarea
          style={{ ...inputStyle, resize: 'vertical', minHeight: 72, fontFamily: 'monospace', fontSize: 12 }}
          value={form.system_prompt_extra}
          onChange={e => onChange({ ...form, system_prompt_extra: e.target.value })}
          placeholder="คำสั่งพิเศษที่จะถูกเพิ่มเข้าไปใน prompt เมื่อใช้เทมเพลตนี้..."
          rows={3}
        />
      </div>
    </div>
  )
}

// ── Sub-component: Template Card ───────────────────────────────────────────────

function TemplateCard({
  template,
  isEditing,
  editForm,
  editFigmaPreview,
  editFetchingFigma,
  onEditStart,
  onEditCancel,
  onEditFormChange,
  onEditFetchFigma,
  onEditSave,
  onDelete,
}: {
  template: Template
  isEditing: boolean
  editForm: TemplateForm
  editFigmaPreview: FigmaPreview | null
  editFetchingFigma: boolean
  onEditStart: () => void
  onEditCancel: () => void
  onEditFormChange: (f: TemplateForm) => void
  onEditFetchFigma: () => void
  onEditSave: () => void
  onDelete: () => void
}) {
  const tags = parseTags(template.tags_json)

  const cardStyle: React.CSSProperties = {
    background: '#1c1830',
    border: '1px solid #1a1422',
    borderRadius: 16,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  }

  if (isEditing) {
    return (
      <div style={cardStyle}>
        <div style={{ padding: '16px 16px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontFamily: 'var(--font-orbitron, monospace)', fontSize: 9, letterSpacing: '0.08em', color: '#635c8a', textTransform: 'uppercase' }}>แก้ไขเทมเพลต</span>
            <button onClick={onEditCancel} style={{ background: 'none', border: 'none', color: '#635c8a', cursor: 'pointer', padding: 2 }}>
              <X size={14} />
            </button>
          </div>
          <TemplateFormFields
            form={editForm}
            onChange={onEditFormChange}
            figmaPreview={editFigmaPreview}
            fetchingFigma={editFetchingFigma}
            onFetchFigma={onEditFetchFigma}
            tempId={template.id}
          />
        </div>
        <div style={{ padding: '12px 16px 16px', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onEditCancel}
            style={{ background: '#13101e', border: '1px solid #2d2848', borderRadius: 8, color: '#9b93c8', padding: '8px 16px', fontSize: 12, cursor: 'pointer' }}
          >
            ยกเลิก
          </button>
          <button
            onClick={onEditSave}
            style={{ background: '#E8365D', border: 'none', borderRadius: 8, color: 'white', padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Check size={13} /> บันทึก
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ ...cardStyle, gap: 0 }}>
      {/* Thumbnail */}
      <div style={{ height: 160, background: '#0d0b14', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
        {template.figma_thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={template.figma_thumbnail_url}
            alt={template.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <LayoutTemplate size={40} style={{ color: '#2d2848' }} />
        )}
        {template.figma_url && (
          <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(13,11,20,0.8)', border: '1px solid #2d2848', borderRadius: 6, padding: '2px 7px', fontSize: 10, color: '#9b93c8' }}>
            Figma
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div>
          <div style={{ fontWeight: 700, color: 'white', fontSize: 15, lineHeight: 1.3 }}>{template.name}</div>
          {template.description && (
            <div style={{ color: '#6b7280', fontSize: 12, marginTop: 4, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {template.description}
            </div>
          )}
        </div>

        {/* Tech stack */}
        {template.tech_stack && (
          <div style={{ display: 'inline-flex', alignItems: 'center' }}>
            <span style={{ background: 'rgba(6,182,212,0.1)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.25)', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontFamily: 'monospace' }}>
              {template.tech_stack}
            </span>
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {tags.map(tag => (
              <span key={tag} style={{ background: 'rgba(99,92,138,0.2)', color: '#c4bfe8', borderRadius: 4, padding: '1px 7px', fontSize: 10 }}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid #1a1422', margin: '0 16px' }} />

      {/* Actions */}
      <div style={{ padding: '10px 16px', display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-end' }}>
        <button
          onClick={onEditStart}
          title="แก้ไข"
          style={{ background: '#13101e', border: '1px solid #2d2848', borderRadius: 8, color: '#9b93c8', padding: '7px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}
        >
          <Pencil size={13} /> แก้ไข
        </button>
        <button
          onClick={onDelete}
          title="ลบ"
          style={{ background: '#13101e', border: '1px solid #2d2848', borderRadius: 8, color: '#6b7280', padding: '7px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)

  // Create form state
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<TemplateForm>(EMPTY_FORM)
  const [creating, setCreating] = useState(false)
  const [fetchingFigma, setFetchingFigma] = useState(false)
  const [figmaPreview, setFigmaPreview] = useState<FigmaPreview | null>(null)

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<TemplateForm>(EMPTY_FORM)
  const [editFetchingFigma, setEditFetchingFigma] = useState(false)
  const [editFigmaPreview, setEditFigmaPreview] = useState<FigmaPreview | null>(null)

  // ── Data fetching ────────────────────────────────────────────────────────────

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/project-templates')
      const data = await res.json() as Template[]
      setTemplates(Array.isArray(data) ? data : [])
    } catch {
      setTemplates([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTemplates() }, [fetchTemplates])

  // ── Figma fetch helpers ──────────────────────────────────────────────────────

  const fetchFigmaPreview = async (
    figmaUrl: string,
    tempId: string,
    setFetching: (v: boolean) => void,
    setPreview: (v: FigmaPreview | null) => void
  ) => {
    if (!figmaUrl.trim()) return
    setFetching(true)
    try {
      const res = await fetch(`/api/project-templates/${tempId}/figma-preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ figma_url: figmaUrl }),
      })
      const data = await res.json() as { ok?: boolean; thumbnail_url?: string; node_name?: string; file_name?: string; error?: string }
      if (data.ok && data.thumbnail_url) {
        setPreview({ thumbnail_url: data.thumbnail_url, node_name: data.node_name, file_name: data.file_name })
      } else {
        setPreview(null)
        alert(data.error ?? 'ไม่สามารถ fetch Figma ได้')
      }
    } catch {
      setPreview(null)
    } finally {
      setFetching(false)
    }
  }

  // ── Create ───────────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!form.name.trim()) return
    setCreating(true)
    try {
      const payload = {
        ...formToPayload(form),
        figma_thumbnail_url: figmaPreview?.thumbnail_url ?? '',
      }
      const res = await fetch('/api/project-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        setForm(EMPTY_FORM)
        setFigmaPreview(null)
        setShowCreate(false)
        await fetchTemplates()
      } else {
        const err = await res.json() as { error?: string }
        alert(err.error ?? 'เกิดข้อผิดพลาด')
      }
    } finally {
      setCreating(false)
    }
  }

  // ── Edit ─────────────────────────────────────────────────────────────────────

  const handleEditStart = (t: Template) => {
    setEditingId(t.id)
    setEditForm(templateToForm(t))
    setEditFigmaPreview(t.figma_thumbnail_url ? { thumbnail_url: t.figma_thumbnail_url } : null)
  }

  const handleEditSave = async () => {
    if (!editingId || !editForm.name.trim()) return
    const payload = {
      ...formToPayload(editForm),
      figma_thumbnail_url: editFigmaPreview?.thumbnail_url ?? '',
    }
    try {
      const res = await fetch(`/api/project-templates/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        setEditingId(null)
        setEditFigmaPreview(null)
        await fetchTemplates()
      } else {
        const err = await res.json() as { error?: string }
        alert(err.error ?? 'เกิดข้อผิดพลาด')
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการบันทึก')
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────────

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`ลบเทมเพลต "${name}" ใช่หรือไม่?`)) return
    try {
      const res = await fetch(`/api/project-templates/${id}`, { method: 'DELETE' })
      if (res.ok) await fetchTemplates()
      else alert('ลบไม่สำเร็จ')
    } catch {
      alert('เกิดข้อผิดพลาด')
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '32px 32px 48px', minHeight: '100vh', background: '#13101e', color: 'white' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-orbitron, monospace)', fontSize: 22, fontWeight: 700, color: '#ede9f8', letterSpacing: '0.04em', marginBottom: 4 }}>
            TEMPLATES
          </h1>
          <p style={{ color: '#5a5680', fontSize: 13 }}>// เทมเพลตสำหรับสร้างโปรเจกต์ใหม่ด้วย AI</p>
        </div>
        <button
          onClick={() => { setShowCreate(v => !v); setFigmaPreview(null); setForm(EMPTY_FORM) }}
          style={{
            background: showCreate ? 'rgba(232,54,93,0.15)' : '#E8365D',
            border: showCreate ? '1px solid rgba(232,54,93,0.4)' : 'none',
            borderRadius: 10,
            color: showCreate ? '#E8365D' : 'white',
            padding: '10px 20px',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            letterSpacing: '0.03em',
          }}
        >
          {showCreate ? <X size={15} /> : <Plus size={15} />}
          {showCreate ? 'ปิด' : '+ NEW TEMPLATE'}
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div style={{ background: '#1c1830', border: '1px solid #2d2848', borderRadius: 16, padding: 20, marginBottom: 28 }}>
          <div style={{ fontFamily: 'var(--font-orbitron, monospace)', fontSize: 9, letterSpacing: '0.08em', color: '#635c8a', textTransform: 'uppercase', marginBottom: 14 }}>
            เทมเพลตใหม่
          </div>
          <TemplateFormFields
            form={form}
            onChange={setForm}
            figmaPreview={figmaPreview}
            fetchingFigma={fetchingFigma}
            onFetchFigma={() => fetchFigmaPreview(form.figma_url, 'new', setFetchingFigma, setFigmaPreview)}
            tempId="new"
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
            <button
              onClick={() => { setShowCreate(false); setForm(EMPTY_FORM); setFigmaPreview(null) }}
              style={{ background: '#13101e', border: '1px solid #2d2848', borderRadius: 8, color: '#9b93c8', padding: '9px 18px', fontSize: 13, cursor: 'pointer' }}
            >
              ยกเลิก
            </button>
            <button
              onClick={handleCreate}
              disabled={!form.name.trim() || creating}
              style={{
                background: form.name.trim() && !creating ? '#E8365D' : '#2d2848',
                border: 'none',
                borderRadius: 8,
                color: form.name.trim() && !creating ? 'white' : '#635c8a',
                padding: '9px 22px',
                fontSize: 13,
                fontWeight: 700,
                cursor: form.name.trim() && !creating ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: 7,
              }}
            >
              {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {creating ? 'กำลังสร้าง...' : 'CREATE'}
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, padding: '64px 0', color: '#635c8a' }}>
          <Loader2 size={18} className="animate-spin" />
          <span style={{ fontFamily: 'var(--font-orbitron, monospace)', fontSize: 11, letterSpacing: '0.08em' }}>LOADING TEMPLATES...</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && templates.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, background: 'rgba(99,92,138,0.1)', border: '1px solid #2d2848', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LayoutTemplate size={30} style={{ color: '#3d3660' }} />
          </div>
          <div style={{ fontFamily: 'var(--font-orbitron, monospace)', fontSize: 13, color: '#5a5680', letterSpacing: '0.04em' }}>ยังไม่มีเทมเพลต</div>
          <div style={{ color: '#374151', fontSize: 13, maxWidth: 320 }}>สร้างเทมเพลตเพื่อเริ่มต้นโปรเจกต์ใหม่ได้เร็วขึ้น พร้อม tech stack และ Figma design ที่กำหนดไว้แล้ว</div>
          <button
            onClick={() => setShowCreate(true)}
            style={{ marginTop: 4, background: '#E8365D', border: 'none', borderRadius: 10, color: 'white', padding: '10px 22px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}
          >
            <Plus size={14} /> สร้างเทมเพลตแรก
          </button>
        </div>
      )}

      {/* Templates Grid */}
      {!loading && templates.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {templates.map(t => (
            <TemplateCard
              key={t.id}
              template={t}
              isEditing={editingId === t.id}
              editForm={editForm}
              editFigmaPreview={editFigmaPreview}
              editFetchingFigma={editFetchingFigma}
              onEditStart={() => handleEditStart(t)}
              onEditCancel={() => { setEditingId(null); setEditFigmaPreview(null) }}
              onEditFormChange={setEditForm}
              onEditFetchFigma={() => fetchFigmaPreview(editForm.figma_url, t.id, setEditFetchingFigma, setEditFigmaPreview)}
              onEditSave={handleEditSave}
              onDelete={() => handleDelete(t.id, t.name)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
