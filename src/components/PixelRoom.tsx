'use client'

// Pixel art room backgrounds — walls + floor only
// Desks are rendered as CSS elements attached to each agent

const P = 4

function rect(x: number, y: number, w: number, h: number, fill: string) {
  return `<rect x="${x * P}" y="${y * P}" width="${w * P}" height="${h * P}" fill="${fill}"/>`
}

const ROOM_CONFIGS: Record<string, { wall: string; wallDk: string; wallLt: string; floorA: string; floorB: string; accent: string }> = {
  CORE:     { wall: '#3a1530', wallDk: '#2a0a20', wallLt: '#4a2540', floorA: '#1a1420', floorB: '#16101a', accent: '#ff2d78' },
  TECH:     { wall: '#152040', wallDk: '#0a1530', wallLt: '#1a2850', floorA: '#101820', floorB: '#0c141c', accent: '#2d7fff' },
  CREATIVE: { wall: '#251540', wallDk: '#1a0a30', wallLt: '#301a50', floorA: '#181420', floorB: '#14101c', accent: '#a855f7' },
  BUSINESS: { wall: '#102a20', wallDk: '#081a15', wallLt: '#143828', floorA: '#101a18', floorB: '#0c1614', accent: '#22c55e' },
  FINANCE:  { wall: '#102530', wallDk: '#081a25', wallLt: '#143038', floorA: '#101820', floorB: '#0c141c', accent: '#06b6d4' },
}

function buildRoom(w: number, h: number, cfg: typeof ROOM_CONFIGS.CORE) {
  let svg = ''

  // Floor tiles (checkerboard)
  for (let y = 5; y < h; y++) {
    for (let x = 0; x < w; x++) {
      svg += rect(x, y, 1, 1, (x + y) % 2 === 0 ? cfg.floorA : cfg.floorB)
    }
  }

  // Back wall — 5 rows with brick pattern
  for (let x = 0; x < w; x++) {
    svg += rect(x, 0, 1, 1, cfg.wallDk)
    svg += rect(x, 1, 1, 1, cfg.wall)
    svg += rect(x, 2, 1, 1, cfg.wallLt)
    svg += rect(x, 3, 1, 1, cfg.wall)
    svg += rect(x, 4, 1, 1, cfg.wallDk)
  }

  // Brick mortar lines
  for (let x = 0; x < w; x += 5) {
    svg += rect(x, 1, 1, 1, cfg.wallDk)
    svg += rect(x, 3, 1, 1, cfg.wallDk)
  }
  for (let x = 2; x < w; x += 5) {
    svg += rect(x, 2, 1, 1, cfg.wallDk)
  }

  // Accent strip at top
  svg += rect(0, 0, w, 0.5, cfg.accent)

  // Baseboard
  for (let x = 0; x < w; x++) {
    svg += rect(x, 5, 1, 0.5, cfg.wallDk)
  }

  // Wall decorations — posters/frames at intervals
  for (let x = 4; x < w - 3; x += 10) {
    // Small frame
    svg += rect(x, 1.5, 3, 2, '#0008')
    svg += rect(x + 0.3, 1.8, 2.4, 1.4, cfg.accent + '44')
  }

  return svg
}

export default function PixelRoom({ team, agentCount }: { team: string; agentCount: number }) {
  const cfg = ROOM_CONFIGS[team] || ROOM_CONFIGS.TECH
  const roomW = Math.max(agentCount * 10 + 4, 20)
  const roomH = 14

  const svg = buildRoom(roomW, roomH, cfg)
  const src = `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${roomW * P} ${roomH * P}" shape-rendering="crispEdges">${svg}</svg>`
  )}`

  return (
    <img
      src={src}
      alt=""
      className="w-full h-full"
      style={{ imageRendering: 'pixelated', objectFit: 'cover' }}
      draggable={false}
    />
  )
}
