import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TEAM_DESC: Record<string, string> = {
  CORE: 'Core team — coordination, strategy, operations',
  TECH: 'Tech team — engineering, development, infrastructure',
  CREATIVE: 'Creative team — design, content, branding',
  BUSINESS: 'Business team — marketing, strategy, analysis',
  FINANCE: 'Finance team — accounting, trading, financial analysis',
}

export async function POST(req: Request) {
  try {
    const { name, role, team } = await req.json()
    if (!name || !role) return NextResponse.json({ error: 'name and role required' }, { status: 400 })

    const client = new Anthropic()

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: 'You are a JSON generator. Output ONLY valid JSON with no markdown fences, no explanation, no extra text.',
      messages: [{
        role: 'user',
        content: `Generate a profile for this AI agent:
- Name (Thai): ${name}
- Role: ${role}
- Team: ${team} (${TEAM_DESC[team] || team})

Return ONLY valid JSON:
{
  "name_en": "concise English name 2-3 words",
  "personality": "2-4 personality traits in Thai comma separated",
  "system_prompt": "Full system prompt in Thai starting with คุณคือ... 3-5 sentences covering expertise and working style",
  "sprite": "single most relevant emoji",
  "color": "#hexcolor matching the role"
}`,
      }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return NextResponse.json({ error: `No JSON in response: ${raw.slice(0, 200)}` }, { status: 500 })

    const generated = JSON.parse(jsonMatch[0])
    return NextResponse.json({
      name_en: generated.name_en || '',
      personality: generated.personality || '',
      system_prompt: generated.system_prompt || '',
      sprite: generated.sprite || '🤖',
      color: generated.color || '#3b82f6',
    })
  } catch (e: any) {
    console.error('[generate] error:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
