import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

const ALLOWED_PATCH_FIELDS = [
  'name',
  'description',
  'tech_stack',
  'figma_url',
  'figma_node_id',
  'figma_thumbnail_url',
  'figma_design_context',
  'mcp_url',
  'system_prompt_extra',
  'tags_json',
  'ms_tenant_id',
  'ms_client_id',
  'ms_client_secret',
] as const

type AllowedField = typeof ALLOWED_PATCH_FIELDS[number]

// PATCH /api/project-templates/[id] — update allowed fields
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json() as Partial<Record<AllowedField, string>>

    const db = getDb()
    const existing = db.prepare('SELECT id FROM project_templates WHERE id = ?').get(id)
    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    const updates: string[] = []
    const values: string[] = []

    for (const field of ALLOWED_PATCH_FIELDS) {
      if (field in body && body[field] !== undefined) {
        updates.push(`${field} = ?`)
        values.push(body[field] as string)
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    updates.push('updated_at = CURRENT_TIMESTAMP')
    values.push(id)

    db.prepare(`UPDATE project_templates SET ${updates.join(', ')} WHERE id = ?`).run(...values)

    const updated = db.prepare('SELECT * FROM project_templates WHERE id = ?').get(id)
    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// DELETE /api/project-templates/[id] — delete template
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = getDb()
    const existing = db.prepare('SELECT id FROM project_templates WHERE id = ?').get(id)
    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }
    db.prepare('DELETE FROM project_templates WHERE id = ?').run(id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
