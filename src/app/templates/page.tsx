'use client'

import { useState, useEffect, useCallback } from 'react'
import { LayoutTemplate, Plus, Pencil, Trash2, ImageOff, Loader2, X, Check, Wand2, Layers, Eye, EyeOff } from 'lucide-react'
import { useLanguage } from '@/lib/i18n'

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
  mcp_url: string
  system_prompt_extra: string
  tags_json: string
  created_at: string
  ms_tenant_id: string
  ms_client_id: string
  ms_client_secret: string
}

interface TemplateForm {
  name: string
  description: string
  tech_stack: string
  has_figma: boolean
  figma_url: string
  figma_design_context: string
  system_prompt_extra: string
  tags: string
  ms_tenant_id: string
  ms_client_id: string
  ms_client_secret: string
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
  has_figma: false,
  figma_url: '',
  figma_design_context: '',
  system_prompt_extra: '',
  tags: '',
  ms_tenant_id: '',
  ms_client_id: '',
  ms_client_secret: '',
}

function parseTags(tagsJson: string): string[] {
  try { return JSON.parse(tagsJson) as string[] } catch { return [] }
}

function formToPayload(form: TemplateForm) {
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    tech_stack: form.tech_stack.trim(),
    figma_url: form.has_figma ? form.figma_url.trim() : '',
    figma_design_context: form.figma_design_context.trim(),
    system_prompt_extra: form.system_prompt_extra.trim(),
    tags_json: JSON.stringify(
      form.tags.split(',').map(t => t.trim()).filter(Boolean)
    ),
    ms_tenant_id: form.ms_tenant_id.trim(),
    ms_client_id: form.ms_client_id.trim(),
    ms_client_secret: form.ms_client_secret.trim(),
  }
}

function templateToForm(t: Template): TemplateForm {
  return {
    name: t.name,
    description: t.description,
    tech_stack: t.tech_stack,
    has_figma: !!t.figma_url,
    figma_url: t.figma_url,
    figma_design_context: t.figma_design_context ?? '',
    system_prompt_extra: t.system_prompt_extra,
    tags: parseTags(t.tags_json).join(', '),
    ms_tenant_id: t.ms_tenant_id ?? '',
    ms_client_id: t.ms_client_id ?? '',
    ms_client_secret: t.ms_client_secret ?? '',
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
  onExtractDesign,
  extractingDesign,
  onAiFill,
  aiFillingContext,
}: {
  form: TemplateForm
  onChange: (f: TemplateForm) => void
  figmaPreview: FigmaPreview | null
  fetchingFigma: boolean
  onFetchFigma: () => void
  onExtractDesign: () => void
  extractingDesign: boolean
  onAiFill: () => void
  aiFillingContext: boolean
}) {
  const { t } = useLanguage()
  const [showSecret, setShowSecret] = useState(false)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      {/* Name — full width */}
      <div style={{ gridColumn: '1 / -1' }}>
        <label style={labelStyle}>{t('tpl_name_label')}</label>
        <input
          style={inputStyle}
          value={form.name}
          onChange={e => onChange({ ...form, name: e.target.value })}
          placeholder={t('tpl_name_placeholder')}
        />
      </div>

      {/* Description — full width */}
      <div style={{ gridColumn: '1 / -1' }}>
        <label style={labelStyle}>{t('tpl_desc_label')}</label>
        <textarea
          style={{ ...inputStyle, resize: 'vertical', minHeight: 64 }}
          value={form.description}
          onChange={e => onChange({ ...form, description: e.target.value })}
          placeholder={t('tpl_desc_placeholder')}
          rows={3}
        />
      </div>

      {/* Tech stack */}
      <div>
        <label style={labelStyle}>{t('tpl_tech_stack_label')}</label>
        <input
          style={inputStyle}
          value={form.tech_stack}
          onChange={e => onChange({ ...form, tech_stack: e.target.value })}
          placeholder="Next.js 15 + PostgreSQL + Docker"
        />
      </div>

      {/* Tags */}
      <div>
        <label style={labelStyle}>{t('tpl_tags_label')}</label>
        <input
          style={inputStyle}
          value={form.tags}
          onChange={e => onChange({ ...form, tags: e.target.value })}
          placeholder="web, fullstack, api"
        />
      </div>

      {/* Figma URL — optional, full width */}
      <div style={{ gridColumn: '1 / -1' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <button
            type="button"
            onClick={() => onChange({ ...form, has_figma: !form.has_figma, figma_url: form.has_figma ? '' : form.figma_url })}
            style={{
              background: form.has_figma ? 'rgba(167,139,250,0.15)' : '#13101e',
              border: `1px solid ${form.has_figma ? '#a78bfa' : '#2d2848'}`,
              borderRadius: 7,
              color: form.has_figma ? '#a78bfa' : '#6b7280',
              padding: '5px 14px',
              fontSize: 12,
              fontWeight: form.has_figma ? 700 : 400,
              cursor: 'pointer',
            }}
          >
            Figma URL
          </button>
          {!form.has_figma && <span style={{ fontSize: 11, color: '#374151' }}>{t('tpl_figma_hint')}</span>}
        </div>

        {form.has_figma && (
          <div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                style={{ ...inputStyle, flex: 1 }}
                value={form.figma_url}
                onChange={e => onChange({ ...form, figma_url: e.target.value })}
                placeholder="https://www.figma.com/design/..."
                autoFocus
              />
              <button
                type="button"
                onClick={onFetchFigma}
                disabled={!form.figma_url.trim() || fetchingFigma}
                style={{
                  background: form.figma_url.trim() ? '#1c1830' : '#13101e',
                  border: '1px solid #2d2848', borderRadius: 8,
                  color: form.figma_url.trim() ? '#c4bfe8' : '#374151',
                  padding: '8px 12px', fontSize: 12,
                  cursor: form.figma_url.trim() && !fetchingFigma ? 'pointer' : 'not-allowed',
                  whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5,
                }}
              >
                {fetchingFigma ? <Loader2 size={12} className="animate-spin" /> : <ImageOff size={12} />}
                Preview
              </button>
              <button
                type="button"
                onClick={onExtractDesign}
                disabled={!form.figma_url.trim() || extractingDesign}
                style={{
                  background: form.figma_url.trim() ? 'rgba(99,92,138,0.15)' : '#13101e',
                  border: `1px solid ${form.figma_url.trim() ? 'rgba(167,139,250,0.4)' : '#2d2848'}`,
                  borderRadius: 8, color: form.figma_url.trim() ? '#a78bfa' : '#374151',
                  padding: '8px 12px', fontSize: 12,
                  cursor: form.figma_url.trim() && !extractingDesign ? 'pointer' : 'not-allowed',
                  whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5,
                }}
              >
                {extractingDesign ? <Loader2 size={12} className="animate-spin" /> : <Layers size={12} />}
                Extract
              </button>
            </div>
            {figmaPreview?.thumbnail_url && (
              <div style={{ marginTop: 8, borderRadius: 8, overflow: 'hidden', border: '1px solid #2d2848', maxHeight: 130 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={figmaPreview.thumbnail_url} alt="Figma preview" style={{ width: '100%', height: 130, objectFit: 'cover', display: 'block' }} />
                {(figmaPreview.file_name || figmaPreview.node_name) && (
                  <div style={{ background: '#0d0b14', padding: '5px 10px', fontSize: 11, color: '#9b93c8' }}>
                    {figmaPreview.file_name && <span>{figmaPreview.file_name}</span>}
                    {figmaPreview.node_name && <span style={{ color: '#635c8a' }}> / {figmaPreview.node_name}</span>}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Figma Design Context — full width */}
      <div style={{ gridColumn: '1 / -1' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>
            {t('tpl_design_context_label')} <span style={{ color: '#7367f0', fontWeight: 600 }}>{t('tpl_design_context_suffix')}</span>
          </label>
          <button
            type="button"
            onClick={onAiFill}
            disabled={aiFillingContext}
            title={t('tpl_ai_fill_tooltip')}
            style={{
              background: aiFillingContext ? '#13101e' : 'rgba(232,54,93,0.1)',
              border: `1px solid ${aiFillingContext ? '#2d2848' : 'rgba(232,54,93,0.35)'}`,
              borderRadius: 6,
              color: aiFillingContext ? '#374151' : '#E8365D',
              padding: '4px 10px',
              fontSize: 11,
              cursor: aiFillingContext ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontWeight: 600,
            }}
          >
            {aiFillingContext ? <Loader2 size={11} className="animate-spin" /> : <Wand2 size={11} />}
            {aiFillingContext ? t('tpl_ai_filling') : t('tpl_ai_fill_btn')}
          </button>
        </div>
        <textarea
          style={{ ...inputStyle, resize: 'vertical', minHeight: 120, fontFamily: 'monospace', fontSize: 11 }}
          value={form.figma_design_context}
          onChange={e => onChange({ ...form, figma_design_context: e.target.value })}
          placeholder={t('tpl_design_context_placeholder')}
          rows={6}
        />
        <p style={{ fontSize: 10, color: '#4b5563', marginTop: 4 }}>
          {t('tpl_design_context_hint')}
        </p>
      </div>

      {/* System Prompt Extra — full width */}
      <div style={{ gridColumn: '1 / -1' }}>
        <label style={labelStyle}>{t('tpl_system_prompt_label')}</label>
        <textarea
          style={{ ...inputStyle, resize: 'vertical', minHeight: 72, fontFamily: 'monospace', fontSize: 12 }}
          value={form.system_prompt_extra}
          onChange={e => onChange({ ...form, system_prompt_extra: e.target.value })}
          placeholder={t('tpl_system_prompt_placeholder')}
          rows={3}
        />
      </div>

      {/* Microsoft SSO — full width */}
      <div style={{ gridColumn: '1 / -1' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <button
            type="button"
            onClick={() => onChange({ ...form, ms_tenant_id: form.ms_tenant_id ? '' : form.ms_tenant_id, ms_client_id: form.ms_tenant_id ? '' : form.ms_client_id })}
            style={{
              background: form.ms_tenant_id ? 'rgba(0,164,239,0.12)' : '#13101e',
              border: `1px solid ${form.ms_tenant_id ? '#00A4EF' : '#2d2848'}`,
              borderRadius: 7,
              color: form.ms_tenant_id ? '#00A4EF' : '#6b7280',
              padding: '5px 14px',
              fontSize: 12,
              fontWeight: form.ms_tenant_id ? 700 : 400,
              cursor: 'pointer',
            }}
          >
            Microsoft SSO
          </button>
          {!form.ms_tenant_id && (
            <span style={{ fontSize: 11, color: '#374151' }}>{t('tpl_ms_hint')}</span>
          )}
        </div>

        {form.ms_tenant_id !== undefined && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label style={labelStyle}>Tenant ID</label>
              <input
                style={inputStyle}
                value={form.ms_tenant_id}
                onChange={e => onChange({ ...form, ms_tenant_id: e.target.value })}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              />
            </div>
            <div>
              <label style={labelStyle}>Client ID (Application ID)</label>
              <input
                style={inputStyle}
                value={form.ms_client_id}
                onChange={e => onChange({ ...form, ms_client_id: e.target.value })}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Client Secret</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showSecret ? 'text' : 'password'}
                  style={{ ...inputStyle, paddingRight: 36 }}
                  value={form.ms_client_secret}
                  onChange={e => onChange({ ...form, ms_client_secret: e.target.value })}
                  placeholder="••••••••••••••••••••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(s => !s)}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563', padding: 0,
                    display: 'flex', alignItems: 'center',
                  }}
                >
                  {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Sub-component: Template Card ───────────────────────────────────────────────

function TemplateCard({
  template,
  onEditStart,
  onDelete,
}: {
  template: Template
  onEditStart: () => void
  onDelete: () => void
}) {
  const { t } = useLanguage()
  const tags = parseTags(template.tags_json)

  return (
    <div style={{ background: '#1c1830', border: '1px solid #1a1422', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Thumbnail */}
      <div style={{ height: 130, background: '#0d0b14', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
        {template.figma_thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={template.figma_thumbnail_url} alt={template.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <LayoutTemplate size={32} style={{ color: '#2d2848' }} />
        )}
        {template.figma_url && (
          <div style={{ position: 'absolute', top: 7, right: 7, background: 'rgba(13,11,20,0.85)', border: '1px solid #2d2848', borderRadius: 5, padding: '2px 6px', fontSize: 9, color: '#9b93c8' }}>
            Figma
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontWeight: 700, color: 'white', fontSize: 13, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {template.name}
        </div>
        {template.description && (
          <div style={{ color: '#6b7280', fontSize: 11, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {template.description}
          </div>
        )}
        {template.tech_stack && (
          <span style={{ background: 'rgba(6,182,212,0.1)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.25)', borderRadius: 5, padding: '2px 7px', fontSize: 10, fontFamily: 'monospace', alignSelf: 'flex-start' }}>
            {template.tech_stack}
          </span>
        )}
        {tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {tags.map(tag => (
              <span key={tag} style={{ background: 'rgba(99,92,138,0.2)', color: '#c4bfe8', borderRadius: 4, padding: '1px 6px', fontSize: 9 }}>{tag}</span>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ borderTop: '1px solid #1a1422', padding: '8px 14px', display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <button onClick={onEditStart} style={{ background: '#13101e', border: '1px solid #2d2848', borderRadius: 7, color: '#9b93c8', padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
          <Pencil size={11} /> {t('tpl_edit_btn')}
        </button>
        <button onClick={onDelete} style={{ background: '#13101e', border: '1px solid #2d2848', borderRadius: 7, color: '#6b7280', padding: '6px 9px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function TemplatesPage() {
  const { t } = useLanguage()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)

  // Create form state
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<TemplateForm>(EMPTY_FORM)
  const [creating, setCreating] = useState(false)
  const [fetchingFigma, setFetchingFigma] = useState(false)
  const [figmaPreview, setFigmaPreview] = useState<FigmaPreview | null>(null)

  const [extractingDesign, setExtractingDesign] = useState(false)
  const [aiFillingContext, setAiFillingContext] = useState(false)

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<TemplateForm>(EMPTY_FORM)
  const [editFetchingFigma, setEditFetchingFigma] = useState(false)
  const [editFigmaPreview, setEditFigmaPreview] = useState<FigmaPreview | null>(null)
  const [editExtractingDesign, setEditExtractingDesign] = useState(false)
  const [editAiFillingContext, setEditAiFillingContext] = useState(false)

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
        alert(data.error ?? t('err_figma_fetch'))
      }
    } catch {
      setPreview(null)
    } finally {
      setFetching(false)
    }
  }

  // ── Extract design context (Figma) ──────────────────────────────────────────

  const extractDesignContext = async (
    currentForm: TemplateForm,
    tempId: string,
    setExtracting: (v: boolean) => void,
    setFormFn: (fn: (f: TemplateForm) => TemplateForm) => void,
  ) => {
    const url = currentForm.figma_url
    if (!url.trim()) return
    setExtracting(true)
    try {
      const res = await fetch(`/api/project-templates/${tempId}/figma-design-context`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ figma_url: url }),
      })
      const data = await res.json() as { ok?: boolean; context?: string; error?: string }
      if (data.ok && data.context) {
        setFormFn(f => ({ ...f, figma_design_context: data.context! }))
      } else {
        alert(data.error ?? t('err_extract_context'))
      }
    } catch {
      alert(t('err_connection'))
    } finally {
      setExtracting(false)
    }
  }

  // ── AI fill design context ───────────────────────────────────────────────────

  const aiFillContext = async (
    currentForm: TemplateForm,
    tempId: string,
    setFilling: (v: boolean) => void,
    setFormFn: (fn: (f: TemplateForm) => TemplateForm) => void,
  ) => {
    setFilling(true)
    try {
      const res = await fetch(`/api/project-templates/${tempId}/ai-fill-context`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          figma_url: currentForm.figma_url,
          name: currentForm.name,
          description: currentForm.description,
          tech_stack: currentForm.tech_stack,
          figma_context: currentForm.figma_design_context,
        }),
      })
      const data = await res.json() as { ok?: boolean; context?: string; error?: string }
      if (data.ok && data.context) {
        setFormFn(f => ({ ...f, figma_design_context: data.context! }))
      } else {
        alert(data.error ?? t('err_extract_context'))
      }
    } catch {
      alert(t('err_connection'))
    } finally {
      setFilling(false)
    }
  }

  // ── Create ───────────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!form.name.trim()) return
    setCreating(true)
    try {
      const payload = {
        ...formToPayload(form),
        figma_thumbnail_url: form.has_figma ? (figmaPreview?.thumbnail_url ?? '') : '',
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
        alert(err.error ?? t('err_generic'))
      }
    } finally {
      setCreating(false)
    }
  }

  // ── Edit ─────────────────────────────────────────────────────────────────────

  const handleEditStart = (tpl: Template) => {
    setEditingId(tpl.id)
    setEditForm(templateToForm(tpl))
    setEditFigmaPreview(tpl.figma_thumbnail_url ? { thumbnail_url: tpl.figma_thumbnail_url } : null)
  }

  const handleEditSave = async () => {
    if (!editingId || !editForm.name.trim()) return
    const payload = {
      ...formToPayload(editForm),
      figma_thumbnail_url: editForm.has_figma ? (editFigmaPreview?.thumbnail_url ?? '') : '',
    }
    try {
      const res = await fetch(`/api/project-templates/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const resData = await res.json() as Record<string, unknown>
      if (res.ok) {
        setEditingId(null)
        setEditFigmaPreview(null)
        await fetchTemplates()
      } else {
        alert((resData as { error?: string }).error ?? t('err_generic'))
      }
    } catch {
      alert(t('err_save_failed'))
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────────

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`ลบเทมเพลต "${name}" ใช่หรือไม่?`)) return
    try {
      const res = await fetch(`/api/project-templates/${id}`, { method: 'DELETE' })
      if (res.ok) await fetchTemplates()
      else alert(t('err_delete_failed'))
    } catch {
      alert(t('err_generic'))
    }
  }

  const closeModal = () => {
    setShowCreate(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFigmaPreview(null)
    setEditForm(EMPTY_FORM)
    setEditFigmaPreview(null)
  }

  const isCreateModal = showCreate
  const isEditModal = !!editingId
  const modalOpen = isCreateModal || isEditModal

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '32px 32px 48px', minHeight: '100vh', background: '#13101e', color: 'white' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-orbitron, monospace)', fontSize: 22, fontWeight: 700, color: '#ede9f8', letterSpacing: '0.04em', marginBottom: 4 }}>
            {t('templates_title')}
          </h1>
          <p style={{ color: '#5a5680', fontSize: 13 }}>{t('templates_subtitle')}</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setFigmaPreview(null); setForm(EMPTY_FORM) }}
          style={{ background: '#E8365D', border: 'none', borderRadius: 10, color: 'white', padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, letterSpacing: '0.03em' }}
        >
          <Plus size={15} /> {t('templates_new_btn')}
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, padding: '64px 0', color: '#635c8a' }}>
          <Loader2 size={18} className="animate-spin" />
          <span style={{ fontFamily: 'var(--font-orbitron, monospace)', fontSize: 11, letterSpacing: '0.08em' }}>{t('templates_loading')}</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && templates.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, background: 'rgba(99,92,138,0.1)', border: '1px solid #2d2848', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LayoutTemplate size={30} style={{ color: '#3d3660' }} />
          </div>
          <div style={{ fontFamily: 'var(--font-orbitron, monospace)', fontSize: 13, color: '#5a5680', letterSpacing: '0.04em' }}>{t('templates_empty_title')}</div>
          <div style={{ color: '#374151', fontSize: 13, maxWidth: 320 }}>{t('templates_empty_desc')}</div>
          <button onClick={() => setShowCreate(true)} style={{ marginTop: 4, background: '#E8365D', border: 'none', borderRadius: 10, color: 'white', padding: '10px 22px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
            <Plus size={14} /> {t('templates_create_first')}
          </button>
        </div>
      )}

      {/* Templates Grid — 4 columns */}
      {!loading && templates.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {templates.map(tpl => (
            <TemplateCard
              key={tpl.id}
              template={tpl}
              onEditStart={() => handleEditStart(tpl)}
              onDelete={() => handleDelete(tpl.id, tpl.name)}
            />
          ))}
        </div>
      )}

      {/* ── Modal (create + edit) ───────────────────────────────────────────── */}
      {modalOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'rgba(0,0,0,0.75)' }}
          onClick={e => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div style={{ background: '#1c1830', border: '1px solid #2d2848', borderRadius: 18, width: '100%', maxWidth: 680, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid #2d2848', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <LayoutTemplate size={16} style={{ color: '#a78bfa' }} />
                <span style={{ fontFamily: 'var(--font-orbitron, monospace)', fontSize: 12, fontWeight: 700, color: '#ede9f8', letterSpacing: '0.05em' }}>
                  {isCreateModal ? t('templates_modal_create') : t('templates_modal_edit')}
                </span>
              </div>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', padding: 4, display: 'flex' }}>
                <X size={17} />
              </button>
            </div>

            {/* Modal body — scrollable */}
            <div style={{ overflowY: 'auto', padding: '20px 22px', flex: 1 }}>
              {isCreateModal ? (
                <TemplateFormFields
                  form={form}
                  onChange={setForm}
                  figmaPreview={figmaPreview}
                  fetchingFigma={fetchingFigma}
                  onFetchFigma={() => fetchFigmaPreview(form.figma_url, 'new', setFetchingFigma, setFigmaPreview)}
                  onExtractDesign={() => extractDesignContext(form, 'new', setExtractingDesign, fn => setForm(fn))}
                  extractingDesign={extractingDesign}
                  onAiFill={() => aiFillContext(form, 'new', setAiFillingContext, fn => setForm(fn))}
                  aiFillingContext={aiFillingContext}
                />
              ) : (
                <TemplateFormFields
                  form={editForm}
                  onChange={setEditForm}
                  figmaPreview={editFigmaPreview}
                  fetchingFigma={editFetchingFigma}
                  onFetchFigma={() => fetchFigmaPreview(editForm.figma_url, editingId!, setEditFetchingFigma, setEditFigmaPreview)}
                  onExtractDesign={() => extractDesignContext(editForm, editingId!, setEditExtractingDesign, fn => setEditForm(fn))}
                  extractingDesign={editExtractingDesign}
                  onAiFill={() => aiFillContext(editForm, editingId!, setEditAiFillingContext, fn => setEditForm(fn))}
                  aiFillingContext={editAiFillingContext}
                />
              )}
            </div>

            {/* Modal footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 22px', borderTop: '1px solid #2d2848', flexShrink: 0 }}>
              <button
                onClick={closeModal}
                style={{ background: '#13101e', border: '1px solid #2d2848', borderRadius: 8, color: '#9b93c8', padding: '9px 18px', fontSize: 13, cursor: 'pointer' }}
              >
                {t('cancel')}
              </button>
              {isCreateModal ? (
                <button
                  onClick={handleCreate}
                  disabled={!form.name.trim() || creating}
                  style={{ background: form.name.trim() && !creating ? '#E8365D' : '#2d2848', border: 'none', borderRadius: 8, color: form.name.trim() && !creating ? 'white' : '#635c8a', padding: '9px 22px', fontSize: 13, fontWeight: 700, cursor: form.name.trim() && !creating ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 7 }}
                >
                  {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  {creating ? t('templates_creating') : t('templates_create_btn')}
                </button>
              ) : (
                <button
                  onClick={handleEditSave}
                  disabled={!editForm.name.trim()}
                  style={{ background: editForm.name.trim() ? '#E8365D' : '#2d2848', border: 'none', borderRadius: 8, color: editForm.name.trim() ? 'white' : '#635c8a', padding: '9px 22px', fontSize: 13, fontWeight: 700, cursor: editForm.name.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 7 }}
                >
                  <Check size={14} /> {t('templates_save_btn')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
