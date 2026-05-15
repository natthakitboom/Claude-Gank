import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

interface SystemConfig {
  figma_access_token: string
}

interface FigmaStyle {
  name: string
  styleType: 'FILL' | 'TEXT' | 'EFFECT' | 'GRID'
  description?: string
}

interface FigmaComponent {
  name: string
  description?: string
}

interface FigmaFileResponse {
  name?: string
  styles?: Record<string, FigmaStyle>
  components?: Record<string, FigmaComponent>
  componentSets?: Record<string, FigmaComponent>
  err?: string
}

function parseFigmaUrl(url: string): { fileKey: string; nodeId: string | null } | null {
  const m = url.match(/figma\.com\/(?:design|file|proto)\/([a-zA-Z0-9_-]+)/)
  if (!m) return null
  const fileKey = m[1]
  const nodeIdMatch = url.match(/[?&]node-id=([^&]+)/)
  const nodeId = nodeIdMatch
    ? decodeURIComponent(nodeIdMatch[1]).replace(/-/g, ':')
    : null
  return { fileKey, nodeId }
}

function groupByPrefix(names: string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {}
  for (const name of names) {
    const parts = name.split('/')
    const group = parts.length > 1 ? parts[0].trim() : 'Other'
    if (!groups[group]) groups[group] = []
    groups[group].push(parts.slice(1).join('/').trim() || name)
  }
  return groups
}

function formatDesignContext(
  fileName: string,
  styles: Record<string, FigmaStyle>,
  components: Record<string, FigmaComponent>,
  componentSets: Record<string, FigmaComponent>
): string {
  const lines: string[] = []

  lines.push(`# Design System — ${fileName}`)
  lines.push('')

  // ── Colors ──────────────────────────────────────────────────────────────────
  const colorStyles = Object.values(styles).filter(s => s.styleType === 'FILL')
  if (colorStyles.length > 0) {
    lines.push('## Colors')
    const grouped = groupByPrefix(colorStyles.map(s => s.name))
    for (const [group, values] of Object.entries(grouped)) {
      lines.push(`- **${group}**: ${values.slice(0, 8).join(', ')}${values.length > 8 ? ` (+${values.length - 8} more)` : ''}`)
    }
    lines.push('')
  }

  // ── Typography ───────────────────────────────────────────────────────────────
  const textStyles = Object.values(styles).filter(s => s.styleType === 'TEXT')
  if (textStyles.length > 0) {
    lines.push('## Typography')
    const grouped = groupByPrefix(textStyles.map(s => s.name))
    for (const [group, values] of Object.entries(grouped)) {
      lines.push(`- **${group}**: ${values.slice(0, 6).join(', ')}${values.length > 6 ? ` (+${values.length - 6} more)` : ''}`)
    }
    lines.push('')
  }

  // ── Effects ──────────────────────────────────────────────────────────────────
  const effectStyles = Object.values(styles).filter(s => s.styleType === 'EFFECT')
  if (effectStyles.length > 0) {
    lines.push('## Effects / Shadows')
    lines.push(effectStyles.map(s => `- ${s.name}`).join('\n'))
    lines.push('')
  }

  // ── Components ───────────────────────────────────────────────────────────────
  const sets = Object.values(componentSets)
  const comps = Object.values(components)
  const allComps = sets.length > 0 ? sets : comps

  if (allComps.length > 0) {
    lines.push('## Components')
    const grouped = groupByPrefix(allComps.map(c => c.name))
    for (const [group, values] of Object.entries(grouped)) {
      const variants = values.slice(0, 5).join(', ')
      const extra = values.length > 5 ? ` (+${values.length - 5} variants)` : ''
      lines.push(`- **${group}**: ${variants}${extra}`)
    }
    lines.push('')
  }

  if (lines.length <= 2) {
    return `# Design System — ${fileName}\n\n(No published styles or components found. Add design notes manually.)`
  }

  return lines.join('\n').trim()
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await params
    const body = await request.json() as { figma_url?: string }
    const figmaUrl = body.figma_url?.trim()

    if (!figmaUrl) {
      return NextResponse.json({ error: 'figma_url is required' }, { status: 400 })
    }

    const db = getDb()
    const config = db.prepare('SELECT figma_access_token FROM system_config WHERE id = ?').get('default') as SystemConfig | undefined
    if (!config?.figma_access_token) {
      return NextResponse.json(
        { error: 'ยังไม่ได้ตั้งค่า Figma token — ไปที่ System → FIGMA MCP ก่อน' },
        { status: 400 }
      )
    }

    const parsed = parseFigmaUrl(figmaUrl)
    if (!parsed) {
      return NextResponse.json({ error: 'Figma URL ไม่ถูกต้อง' }, { status: 400 })
    }

    const { fileKey } = parsed
    const headers = { 'X-Figma-Token': config.figma_access_token }

    const fileRes = await fetch(
      `https://api.figma.com/v1/files/${fileKey}?depth=1`,
      { headers, signal: AbortSignal.timeout(15000) }
    )

    if (!fileRes.ok) {
      const msg = fileRes.status === 403
        ? 'Figma token ไม่มีสิทธิ์เข้าถึงไฟล์นี้'
        : fileRes.status === 404
          ? 'ไม่พบ Figma file'
          : `Figma API ${fileRes.status}`
      return NextResponse.json({ error: msg }, { status: 502 })
    }

    const fileData = await fileRes.json() as FigmaFileResponse
    const context = formatDesignContext(
      fileData.name ?? 'Untitled',
      fileData.styles ?? {},
      fileData.components ?? {},
      fileData.componentSets ?? {}
    )

    return NextResponse.json({ ok: true, context })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
