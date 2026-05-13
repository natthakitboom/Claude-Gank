import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

interface SystemConfig {
  figma_access_token: string
}

interface FigmaFileResponse {
  name?: string
  thumbnailUrl?: string
  err?: string
}

interface FigmaNodeResponse {
  nodes: Record<string, { document: { name: string } }>
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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json() as { figma_url?: string }

    let figmaUrl: string
    if (body.figma_url) {
      figmaUrl = body.figma_url
    } else {
      const db = getDb()
      const tpl = db.prepare('SELECT figma_url FROM project_templates WHERE id = ?').get(id) as { figma_url: string } | undefined
      if (!tpl?.figma_url) {
        return NextResponse.json({ error: 'No Figma URL provided' }, { status: 400 })
      }
      figmaUrl = tpl.figma_url
    }

    const db = getDb()
    const config = db.prepare('SELECT figma_access_token FROM system_config WHERE id = ?').get('default') as SystemConfig | undefined
    if (!config?.figma_access_token) {
      return NextResponse.json(
        { error: 'ยังไม่ได้ตั้งค่า Figma token — ไปที่ System → FIGMA MCP ก่อน' },
        { status: 400 }
      )
    }

    const token = config.figma_access_token
    const parsed = parseFigmaUrl(figmaUrl)
    if (!parsed) {
      return NextResponse.json({ error: 'Figma URL ไม่ถูกต้อง — ต้องเป็น figma.com/design/... หรือ figma.com/file/...' }, { status: 400 })
    }

    const { fileKey, nodeId } = parsed
    const headers = { 'X-Figma-Token': token }

    // GET /v1/files/:key?depth=1 — returns name + thumbnailUrl in one call
    const fileRes = await fetch(`https://api.figma.com/v1/files/${fileKey}?depth=1`, {
      headers,
      signal: AbortSignal.timeout(10000),
    })
    if (!fileRes.ok) {
      const errText = await fileRes.text().catch(() => '')
      const msg = fileRes.status === 403
        ? 'Figma token ไม่มีสิทธิ์เข้าถึงไฟล์นี้ — ตรวจสอบ token หรือให้เปิดสิทธิ์ไฟล์'
        : fileRes.status === 404
          ? 'ไม่พบ Figma file — ตรวจสอบ URL อีกครั้ง'
          : `Figma API ${fileRes.status}: ${errText.slice(0, 200)}`
      return NextResponse.json({ error: msg }, { status: 502 })
    }

    const fileData = await fileRes.json() as FigmaFileResponse
    const fileName = fileData.name ?? ''
    const thumbnailUrl = fileData.thumbnailUrl ?? ''

    // Optionally fetch specific node name
    let nodeName = ''
    if (nodeId) {
      try {
        const nodeRes = await fetch(
          `https://api.figma.com/v1/files/${fileKey}/nodes?ids=${encodeURIComponent(nodeId)}`,
          { headers, signal: AbortSignal.timeout(5000) }
        )
        if (nodeRes.ok) {
          const nodeData = await nodeRes.json() as FigmaNodeResponse
          nodeName = nodeData.nodes?.[nodeId]?.document?.name ?? ''
        }
      } catch { /* optional */ }
    }

    return NextResponse.json({
      ok: true,
      thumbnail_url: thumbnailUrl,
      file_name: fileName || undefined,
      node_name: nodeName || undefined,
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
