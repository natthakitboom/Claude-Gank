import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

// GET /api/project-templates — return all templates ordered by created_at DESC
export async function GET() {
  try {
    const db = getDb()
    const templates = db.prepare(`
      SELECT * FROM project_templates ORDER BY created_at DESC
    `).all()
    return NextResponse.json(templates)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// POST /api/project-templates — create new template
export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      name?: string
      description?: string
      tech_stack?: string
      figma_url?: string
      figma_node_id?: string
      figma_thumbnail_url?: string
      figma_design_context?: string
      mcp_url?: string
      system_prompt_extra?: string
      tags_json?: string
      ms_tenant_id?: string
      ms_client_id?: string
      ms_client_secret?: string
    }

    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    const db = getDb()
    const id = uuidv4()
    db.prepare(`
      INSERT INTO project_templates
        (id, name, description, tech_stack, figma_url, figma_node_id, figma_thumbnail_url, figma_design_context, mcp_url, system_prompt_extra, tags_json, ms_tenant_id, ms_client_id, ms_client_secret)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      body.name.trim(),
      body.description ?? '',
      body.tech_stack ?? '',
      body.figma_url ?? '',
      body.figma_node_id ?? '',
      body.figma_thumbnail_url ?? '',
      body.figma_design_context ?? '',
      body.mcp_url ?? '',
      body.system_prompt_extra ?? '',
      body.tags_json ?? '[]',
      body.ms_tenant_id ?? '',
      body.ms_client_id ?? '',
      body.ms_client_secret ?? '',
    )

    const created = db.prepare('SELECT * FROM project_templates WHERE id = ?').get(id)
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
