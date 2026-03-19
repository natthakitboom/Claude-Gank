import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

export async function GET() {
  try {
    const db = getDb()
    const skills = db.prepare('SELECT * FROM skills ORDER BY category, name').all()
    return NextResponse.json(skills)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const db = getDb()
    const id = `skill-${uuidv4().slice(0, 8)}`

    db.prepare(`
      INSERT INTO skills (id, name, description, prompt_template, category, icon)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, body.name, body.description, body.prompt_template, body.category || 'general', body.icon || '⚡')

    const skill = db.prepare('SELECT * FROM skills WHERE id = ?').get(id)
    return NextResponse.json(skill, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
