'use client'

import { useRef, useEffect, useCallback } from 'react'
import type { Agent } from '@/lib/types'
import { svgCache } from '@/components/PixelSprite'
import { useLanguage } from '@/lib/i18n'

/* ── canvas logical size ── */
const CW = 920
const CH = 560

const TEAM_COLOR: Record<string, string> = {
  CORE: '#ff4d8a', TECH: '#4d9fff', CREATIVE: '#c47af7',
  BUSINESS: '#4de07a', FINANCE: '#4dcff7',
}

/* ── room definitions ── */
type Rm = { x: number; y: number; w: number; h: number; floor: string; label: string; accent: string }
const R: Record<string, Rm> = {
  meetLg:  { x: 8,   y: 8,   w: 254, h: 200, floor: '#14102e', label: 'TURQUOISE',  accent: '#a855f7' },
  meetS1:  { x: 8,   y: 216, w: 120, h: 130, floor: '#0c1428', label: 'ONYX',       accent: '#2d7fff' },
  meetS2:  { x: 136, y: 216, w: 120, h: 130, floor: '#0c1628', label: 'SPINEL',     accent: '#06b6d4' },
  meetS3:  { x: 8,   y: 354, w: 120, h: 146, floor: '#0c1a12', label: 'NEW-CONCEPT',accent: '#22c55e' },
  meetS4:  { x: 136, y: 354, w: 120, h: 146, floor: '#1a1408', label: 'CHRISTMAS',  accent: '#f59e0b' },
  work:    { x: 270, y: 8,   w: 642, h: 260, floor: '#0c0c22', label: 'WORK AREA',      accent: '#635C8A' },
  dining:  { x: 270, y: 276, w: 200, h: 224, floor: '#0c1a10', label: 'DINING',         accent: '#22c55e' },
  pb1:     { x: 476, y: 278, w: 54,  h: 102, floor: '#070e1a', label: 'DARE',           accent: '#0ea5e9' },
  pb2:     { x: 538, y: 278, w: 56,  h: 102, floor: '#070e1a', label: 'DREAM',           accent: '#0ea5e9' },
  pb3:     { x: 476, y: 386, w: 54,  h: 110, floor: '#070e1a', label: 'CARE',           accent: '#0ea5e9' },
  pb4:     { x: 538, y: 386, w: 56,  h: 110, floor: '#070e1a', label: 'DELIVER',           accent: '#0ea5e9' },
  coffee:  { x: 606, y: 276, w: 306, h: 224, floor: '#1a1008', label: 'COFFEE CORNER',  accent: '#f59e0b' },
  quiet:   { x: 764, y: 432, w: 140, h: 60,  floor: '#100e26', label: 'QUIET ZONE',     accent: '#8b5cf6' },
}

const ROOM_LABELS_TH: Record<string, string> = {
  meetLg: 'TURQUOISE',   meetS1: 'ONYX',    meetS2: 'SPINEL',
  meetS3: 'NEW-CONCEPT', meetS4: 'CHRISTMAS',
  work: 'พื้นที่ทำงาน', dining: 'ห้องอาหาร', coffee: 'มุมกาแฟ',
  pb1: 'PB-1', pb2: 'PB-2', pb3: 'PB-3', pb4: 'PB-4',
  quiet: 'Quiet Zone',
}

/* ── desk anchor positions (agent feet y) ── */
const DESKS: [number, number][] = [
  [315,80],[395,80],[475,80],[555,80],[635,80],[715,80],[795,80],[875,80],
  [315,165],[395,165],[475,165],[555,165],[635,165],[715,165],[795,165],[875,165],
  [315,240],[395,240],[475,240],[555,240],[635,240],
]

/* ── gather spots per zone ── */
const SPOTS = {
  meetLg:  [[80,110],[115,110],[150,110],[185,110],[220,110],[80,150],[115,150],[150,150],[185,150],[220,150],[55,130],[228,130]] as [number,number][],
  meetS1:  [[38,262],[68,262],[98,262],[38,295],[68,295],[98,295]] as [number,number][],
  meetS2:  [[163,262],[196,262],[229,262],[163,295],[196,295],[229,295]] as [number,number][],
  meetS3:  [[38,402],[68,402],[98,402],[38,438],[68,438],[98,438]] as [number,number][],
  meetS4:  [[163,402],[196,402],[229,402],[163,438],[196,438],[229,438]] as [number,number][],
  dining:  [
    [292,300],[348,300],[292,360],[348,360],
    [392,300],[448,300],[392,360],[448,360],
    [292,390],[348,390],[292,450],[348,450],
    [392,390],[448,390],[392,450],[448,450],
  ] as [number,number][],
  coffee:  [
    [628,322],[668,322],[648,304],[648,340],
    [690,322],[730,322],[710,304],[710,340],
  ] as [number,number][],
  phonebooth: [
    [492,310],[510,310],[492,352],[510,352],
    [556,310],[576,310],[556,352],[576,352],
    [492,418],[510,418],[492,460],[510,460],
    [556,418],[576,418],[556,460],[576,460],
  ] as [number,number][],
  quiet: [
    [810,455],[840,455],[870,455],[810,473],[840,473],[870,473],
  ] as [number,number][],
}

/* ══════════════════════ helpers ══════════════════════ */
function r(n: number) { return Math.round(n) + 0.5 }
function rf(n: number) { return Math.round(n) }

/* ── tile floor with ambient glow ── */
function drawRoomFloor(ctx: CanvasRenderingContext2D, rm: Rm) {
  ctx.save()
  ctx.beginPath(); ctx.rect(rm.x, rm.y, rm.w, rm.h); ctx.clip()

  // base fill
  ctx.fillStyle = rm.floor
  ctx.fillRect(rm.x, rm.y, rm.w, rm.h)

  // tile pattern (22px grid, alternating shade)
  const TS = 22
  const ox = Math.floor(rm.x / TS) * TS
  const oy = Math.floor(rm.y / TS) * TS
  for (let gx = ox; gx < rm.x + rm.w; gx += TS) {
    for (let gy = oy; gy < rm.y + rm.h; gy += TS) {
      if (((Math.floor(gx / TS) + Math.floor(gy / TS)) & 1) === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.022)'
        ctx.fillRect(gx, gy, TS, TS)
      }
    }
  }
  // grout lines
  ctx.strokeStyle = 'rgba(0,0,0,0.22)'
  ctx.lineWidth = 0.5
  for (let gx = ox; gx <= rm.x + rm.w; gx += TS) {
    ctx.beginPath(); ctx.moveTo(r(gx), r(rm.y)); ctx.lineTo(r(gx), r(rm.y + rm.h)); ctx.stroke()
  }
  for (let gy = oy; gy <= rm.y + rm.h; gy += TS) {
    ctx.beginPath(); ctx.moveTo(r(rm.x), r(gy)); ctx.lineTo(r(rm.x + rm.w), r(gy)); ctx.stroke()
  }
  ctx.restore()

  // accent ambient glow at room center
  const grd = ctx.createRadialGradient(rm.x + rm.w * .5, rm.y + rm.h * .5, 0, rm.x + rm.w * .5, rm.y + rm.h * .5, Math.max(rm.w, rm.h) * .55)
  grd.addColorStop(0, rm.accent + '0d')
  grd.addColorStop(1, 'transparent')
  ctx.fillStyle = grd; ctx.fillRect(rm.x, rm.y, rm.w, rm.h)
}

/* ── ceiling fluorescent light fixture ── */
function ceilingLight(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius = 68, tint = '#ffffff') {
  // floor glow pool
  const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
  grd.addColorStop(0, tint + '24')
  grd.addColorStop(0.4, tint + '10')
  grd.addColorStop(1, 'transparent')
  ctx.fillStyle = grd
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2)
  // fixture rectangle
  ctx.fillStyle = tint + 'dd'
  ctx.fillRect(rf(cx) - 14, rf(cy) - 2, 28, 4)
  ctx.fillStyle = tint + '44'
  ctx.fillRect(rf(cx) - 16, rf(cy) - 3, 32, 6)
}

/* ── walls ── */
function walls(ctx: CanvasRenderingContext2D) {
  // shadow layer (thick dark outline)
  ctx.strokeStyle = '#07050f'
  ctx.lineWidth = 9
  ctx.strokeRect(r(8), r(8), CW - 16, CH - 16)
  for (const fn of wallSegsFn) fn(ctx, '#07050f', 9)

  // main wall fill
  ctx.strokeStyle = '#38325e'
  ctx.lineWidth = 5
  ctx.strokeRect(r(8), r(8), CW - 16, CH - 16)
  for (const fn of wallSegsFn) fn(ctx, '#38325e', 5)

  // inner highlight (warm edge)
  ctx.strokeStyle = '#524a7a'
  ctx.lineWidth = 1
  ctx.strokeRect(r(8), r(8), CW - 16, CH - 16)
  for (const fn of wallSegsFn) fn(ctx, '#524a7a', 1)

  // door frames
  ctx.strokeStyle = '#5a4880'
  ctx.lineWidth = 1.5
  for (const [x1, y1, x2, y2] of DOORS) doorFrame(ctx, x1, y1, x2, y2)
}

function seg(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  ctx.beginPath(); ctx.moveTo(r(x1), r(y1)); ctx.lineTo(r(x2), r(y2)); ctx.stroke()
}

function doorFrame(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  ctx.beginPath(); ctx.moveTo(r(x1), r(y1)); ctx.lineTo(r(x2), r(y2)); ctx.stroke()
}

type SegFn = (ctx: CanvasRenderingContext2D, color: string, lw: number) => void
const WALL_SEGS: ((ctx: CanvasRenderingContext2D) => void)[] = [
  (ctx) => { seg(ctx,264,8,264,105); seg(ctx,264,165,264,CH-8) },
  (ctx) => { seg(ctx,8,210,95,210); seg(ctx,150,210,264,210) },
  (ctx) => { seg(ctx,8,350,60,350); seg(ctx,95,350,136,350); seg(ctx,174,350,264,350) },
  (ctx) => { seg(ctx,130,216,130,262); seg(ctx,130,310,130,346) },
  (ctx) => { seg(ctx,130,354,130,404); seg(ctx,130,452,130,500) },
  (ctx) => { seg(ctx,270,272,414,272); seg(ctx,474,272,534,272); seg(ctx,586,272,CW-8,272) },
  (ctx) => { seg(ctx,600,272,600,374); seg(ctx,600,426,600,CH-8) },
  (ctx) => { seg(ctx,762,430,800,430); seg(ctx,836,430,CW-8,430) },
  // Phone booth walls
  (ctx) => { seg(ctx,472,272,472,302); seg(ctx,472,328,472,382); seg(ctx,472,386,472,408); seg(ctx,472,434,472,CH-8) },
  (ctx) => { seg(ctx,534,272,534,306); seg(ctx,534,332,534,418); seg(ctx,534,444,534,CH-8) },
  (ctx) => { seg(ctx,472,384,500,384); seg(ctx,522,384,534,384); seg(ctx,536,384,556,384); seg(ctx,578,384,598,384) },
]
const wallSegsFn: SegFn[] = WALL_SEGS.map((fn) => (ctx: CanvasRenderingContext2D, color: string, lw: number) => {
  ctx.strokeStyle = color; ctx.lineWidth = lw; fn(ctx)
})

const DOORS: [number, number, number, number][] = [
  [261,105,267,165], [95,207,150,213], [127,262,133,310],
  [127,404,133,452], [60,347,95,353],  [136,347,174,353],
  [414,269,474,275], [534,269,586,275],[597,374,603,426],
  [800,427,836,433],
  [469,302,475,328], [469,408,475,434],
  [500,381,522,387], [556,381,578,387],
  [531,306,537,332], [531,418,537,444],
]

/* ── room label (styled pill, centered at top of room) ── */
function label(ctx: CanvasRenderingContext2D, rm: Rm) {
  if (!rm.label) return
  ctx.save()
  ctx.font = `600 9px 'Noto Sans Thai',sans-serif`
  ctx.textAlign = 'center'
  const tw = ctx.measureText(rm.label).width
  const cx = rf(rm.x + rm.w / 2)
  const ly = rf(rm.y) + 14
  // pill bg with backdrop
  ctx.fillStyle = 'rgba(8,7,18,0.75)'
  ctx.beginPath(); ctx.roundRect(cx - tw / 2 - 9, ly - 11, tw + 18, 15, 4); ctx.fill()
  // accent border
  ctx.strokeStyle = rm.accent + '55'; ctx.lineWidth = 0.8
  ctx.beginPath(); ctx.roundRect(cx - tw / 2 - 9, ly - 11, tw + 18, 15, 4); ctx.stroke()
  // dot
  ctx.fillStyle = rm.accent + 'cc'
  ctx.beginPath(); ctx.arc(cx - tw / 2 - 2, ly - 3.5, 2, 0, Math.PI * 2); ctx.fill()
  // text
  ctx.fillStyle = rm.accent + 'ee'
  ctx.fillText(rm.label, cx + 4, ly)
  ctx.restore()
}

/* ── desk (top-down) ── */
function desk(ctx: CanvasRenderingContext2D, cx: number, cy: number, color: string, active: boolean) {
  const x = rf(cx), y = rf(cy)

  // drop shadow
  ctx.fillStyle = 'rgba(0,0,0,0.45)'
  ctx.fillRect(x - 26, y - 38, 50, 26)

  // desk body
  ctx.fillStyle = '#28244a'
  ctx.fillRect(x - 26, y - 40, 48, 22)
  // top edge highlight
  ctx.fillStyle = '#3c3868'
  ctx.fillRect(x - 26, y - 40, 48, 2)
  // right edge highlight
  ctx.fillStyle = '#322e56'
  ctx.fillRect(x + 20, y - 40, 2, 22)

  // side drawer
  ctx.fillStyle = '#1e1a38'
  ctx.fillRect(x - 26, y - 18, 16, 12)
  ctx.fillStyle = '#252040'
  ctx.fillRect(x - 24, y - 16, 12, 8)
  // drawer handle
  ctx.fillStyle = active ? color + '88' : '#3e3a60'
  ctx.fillRect(x - 21, y - 13, 7, 1.5)

  // keyboard (tiny pixels on desk surface)
  ctx.fillStyle = active ? '#1a1840' : '#1a1630'
  ctx.fillRect(x - 8, y - 36, 20, 8)
  ctx.fillStyle = active ? '#2a2860' : '#222040'
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 5; col++) {
      ctx.fillRect(x - 6 + col * 4, y - 34 + row * 4, 3, 3)
    }
  }

  // inactive monitor placeholder
  if (!active) {
    ctx.fillStyle = '#0a0918'
    ctx.fillRect(x - 15, y - 28, 30, 15)
    ctx.strokeStyle = '#2d2848'; ctx.lineWidth = 1
    ctx.strokeRect(x - 15, y - 28, 30, 15)
    ctx.fillStyle = '#14122a'
    ctx.fillRect(x - 13, y - 26, 26, 11)
    ctx.fillStyle = '#3d3660'
    for (let i = 0; i < 3; i++) ctx.fillRect(x - 11, y - 24 + i * 3, 8 + i * 3, 1)
    ctx.fillStyle = '#2d2848'; ctx.fillRect(x - 2, y - 13, 4, 4)
  }

  // chair
  ctx.fillStyle = active ? color + '1e' : '#14102e'
  ctx.strokeStyle = active ? color + '66' : '#2a2448'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.roundRect(x - 11, y - 5, 20, 18, 4); ctx.fill(); ctx.stroke()
  // seat pad
  ctx.fillStyle = active ? color + '0a' : '#1a1530'
  ctx.beginPath(); ctx.roundRect(x - 8, y - 3, 14, 13, 3); ctx.fill()
}

/* ── desk front face ── */
function drawDeskFront(ctx: CanvasRenderingContext2D, cx: number, cy: number, color: string) {
  const x = rf(cx), y = rf(cy)
  ctx.fillStyle = '#22203e'
  ctx.fillRect(x - 27, y - 24, 50, 18)
  ctx.fillStyle = '#363264'
  ctx.fillRect(x - 27, y - 24, 50, 2)
  ctx.strokeStyle = '#3a3462'; ctx.lineWidth = 1
  ctx.strokeRect(x - 27, y - 24, 50, 18)
  // color accent stripe
  ctx.strokeStyle = color + '66'; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.moveTo(x - 26, y - 8); ctx.lineTo(x + 22, y - 8); ctx.stroke()
}

/* ── desk monitor with glow ── */
function drawDeskMonitor(ctx: CanvasRenderingContext2D, cx: number, cy: number, color: string, active: boolean) {
  const x = rf(cx), y = rf(cy)

  if (active) {
    // screen glow spilling onto desk surface
    const gl = ctx.createRadialGradient(x, y - 22, 0, x, y - 22, 30)
    gl.addColorStop(0, color + '20')
    gl.addColorStop(1, 'transparent')
    ctx.fillStyle = gl
    ctx.fillRect(x - 30, y - 40, 60, 32)
  }

  // bezel
  ctx.fillStyle = '#070610'
  ctx.fillRect(x - 16, y - 29, 32, 17)
  ctx.strokeStyle = active ? color + '99' : '#2d2848'; ctx.lineWidth = 1
  ctx.strokeRect(x - 16, y - 29, 32, 17)

  if (active) {
    // screen gradient (team color)
    const scr = ctx.createLinearGradient(x - 14, y - 27, x - 14, y - 14)
    scr.addColorStop(0, color + '55')
    scr.addColorStop(1, color + '28')
    ctx.fillStyle = scr
    ctx.fillRect(x - 14, y - 27, 28, 13)

    // "code" lines on screen
    const lines: [number, number][] = [[0, 20], [6, 14], [3, 18], [1, 22]]
    ctx.fillStyle = color + 'cc'
    lines.forEach(([indent, len], i) => ctx.fillRect(x - 12 + indent, y - 25 + i * 3, len, 1.5))

    // monitor border glow
    ctx.shadowColor = color; ctx.shadowBlur = 10
    ctx.strokeRect(x - 16, y - 29, 32, 17)
    ctx.shadowBlur = 0
  } else {
    ctx.fillStyle = '#10102a'
    ctx.fillRect(x - 14, y - 27, 28, 13)
    ctx.fillStyle = '#3d3660'
    for (let i = 0; i < 3; i++) ctx.fillRect(x - 11, y - 24 + i * 3, 8 + i * 3, 1)
  }
  // stand
  ctx.fillStyle = '#2a2650'; ctx.fillRect(x - 3, y - 12, 6, 4)
}

/* ── conference table ── */
function confTable(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number, color: string) {
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.4)'
  ctx.beginPath(); ctx.roundRect(cx - w / 2 + 2, cy - h / 2 + 2, w, h, 6); ctx.fill()
  // body
  ctx.fillStyle = '#201c3e'; ctx.strokeStyle = color + '88'; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.roundRect(cx - w / 2, cy - h / 2, w, h, 6); ctx.fill(); ctx.stroke()
  // reflection strip
  ctx.fillStyle = color + '1c'
  ctx.beginPath(); ctx.roundRect(cx - w / 2 + 4, cy - h / 10, w - 8, h / 5, 2); ctx.fill()
  // top highlight
  ctx.fillStyle = color + '28'
  ctx.beginPath(); ctx.roundRect(cx - w / 2 + 3, cy - h / 2 + 2, w - 6, 3, 1); ctx.fill()
}

/* ── chair ── */
function chair(ctx: CanvasRenderingContext2D, x: number, y: number, occ = false, color = '#635C8A') {
  // body
  ctx.fillStyle = occ ? color + '2a' : '#161228'
  ctx.strokeStyle = occ ? color + 'aa' : '#2d2848'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.roundRect(x - 7, y - 7, 14, 14, 3); ctx.fill(); ctx.stroke()
  // seat pad
  if (occ) {
    ctx.fillStyle = color + '18'
    ctx.beginPath(); ctx.roundRect(x - 4, y - 4, 8, 9, 2); ctx.fill()
  }
}

/* ── whiteboard: IT-themed ── */
function whiteboard(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  // outer frame
  ctx.fillStyle = '#080714'; ctx.strokeStyle = color + '99'; ctx.lineWidth = 1.5
  ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h)
  // inner panel
  ctx.fillStyle = '#0c0b1e'
  ctx.fillRect(x + 1, y + 1, w - 2, h - 2)

  const isLarge = w > 35

  if (isLarge) {
    // ── System Architecture Diagram ──
    // title bar
    ctx.fillStyle = color + '1a'
    ctx.fillRect(x + 1, y + 1, w - 2, 7)
    ctx.font = '4px monospace'; ctx.fillStyle = color + 'bb'; ctx.textAlign = 'left'
    ctx.fillText('SYSTEM ARCH', x + 3, y + 6.5)

    // service boxes: 3 cols × 2 rows, each 12×7
    const BW = 12, BH = 7
    const cols = [x + 2, x + 17, x + 32]
    const row1 = y + 12, row2 = y + 26

    const services: [string, string, number, number][] = [
      ['CLI',  '#4d9fff', cols[0], row1],
      ['API',  color,     cols[1], row1],
      ['DB',   '#22c55e', cols[2], row1],
      ['CDN',  '#f59e0b', cols[0], row2],
      ['MQ',   '#a855f7', cols[1], row2],
      ['S3',   '#06b6d4', cols[2], row2],
    ]
    for (const [lbl, bc, bx, by] of services) {
      ctx.fillStyle = bc + '22'; ctx.strokeStyle = bc + '88'; ctx.lineWidth = 0.7
      ctx.fillRect(bx, by, BW, BH); ctx.strokeRect(bx, by, BW, BH)
      ctx.fillStyle = bc + 'dd'; ctx.textAlign = 'center'; ctx.font = '4.5px monospace'
      ctx.fillText(lbl, bx + BW / 2, by + BH - 1.5)
    }

    // horizontal arrows row 1
    ctx.fillStyle = '#4b5563'; ctx.strokeStyle = '#4b5563'; ctx.lineWidth = 0.8
    for (let i = 0; i < 2; i++) {
      const ax = cols[i] + BW, ay = row1 + BH / 2, bx = cols[i + 1]
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx - 2, ay); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(bx, ay); ctx.lineTo(bx - 3, ay - 2); ctx.lineTo(bx - 3, ay + 2); ctx.closePath(); ctx.fill()
    }
    // vertical dotted row1 → row2
    ctx.setLineDash([1.5, 1.5]); ctx.strokeStyle = '#2d2848'; ctx.lineWidth = 0.6
    for (let i = 0; i < 3; i++) {
      const vx = cols[i] + BW / 2
      ctx.beginPath(); ctx.moveTo(vx, row1 + BH); ctx.lineTo(vx, row2); ctx.stroke()
    }
    ctx.setLineDash([])

    // code lines at bottom
    const cPalette = [color, '#4de07a', '#4d9fff']
    const cWidths  = [0.7, 0.45, 0.6]
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = cPalette[i] + '55'
      ctx.fillRect(x + 2, y + h - 11 + i * 3.5, (w - 4) * cWidths[i], 1.5)
    }

  } else {
    // ── Terminal / Code View ──
    // menu bar
    ctx.fillStyle = '#161428'
    ctx.fillRect(x + 1, y + 1, w - 2, 5)
    // traffic-light dots
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = ['#ff5f5666', '#ffbd2e66', '#27c93f88'][i]
      ctx.beginPath(); ctx.arc(x + 3 + i * 3.5, y + 3.5, 1.2, 0, Math.PI * 2); ctx.fill()
    }
    // prompt marker
    ctx.fillStyle = '#27c93f88'; ctx.fillRect(x + 2, y + 8, 2.5, 1.5)

    // syntax-coloured code lines
    const palette = [color + 'bb', '#4de07a88', '#4d9fff77', '#c47af766', '#f59e0b66']
    const widths  = [0.78, 0.50, 0.68, 0.35, 0.60, 0.74, 0.44, 0.62]
    const maxLines = Math.floor((h - 12) / 3.5)
    for (let i = 0; i < maxLines; i++) {
      ctx.fillStyle = palette[i % palette.length]
      ctx.fillRect(x + 2, y + 11 + i * 3.5, (w - 4) * widths[i % widths.length], 1.5)
    }
    // static cursor
    ctx.fillStyle = color + 'aa'
    ctx.fillRect(x + 2, y + 11 + maxLines * 3.5, 2.5, 1.5)
  }
}

/* ── dining table ── */
function dineTable(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.beginPath(); ctx.roundRect(cx - 39, cy - 23, 82, 50, 5); ctx.fill()
  // body
  ctx.fillStyle = '#141e12'; ctx.strokeStyle = '#2a3828'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.roundRect(cx - 40, cy - 24, 80, 48, 5); ctx.fill(); ctx.stroke()
  // wood grain
  ctx.strokeStyle = '#1e2c1a'; ctx.lineWidth = 0.5
  for (let i = 0; i < 3; i++) {
    ctx.beginPath(); ctx.moveTo(cx - 38, cy - 16 + i * 10); ctx.lineTo(cx + 38, cy - 16 + i * 10); ctx.stroke()
  }
  // plates
  for (const [px, py] of [[cx - 20, cy - 9], [cx + 20, cy - 9], [cx - 20, cy + 9], [cx + 20, cy + 9]] as [number, number][]) {
    ctx.fillStyle = '#1e2e1e'; ctx.beginPath(); ctx.ellipse(px, py, 9, 7, 0, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#3a5a3a'; ctx.lineWidth = 0.5; ctx.stroke()
    ctx.fillStyle = '#2a3e28'; ctx.beginPath(); ctx.ellipse(px, py, 5, 4, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#3a8a3a44'; ctx.beginPath(); ctx.ellipse(px - 1, py - 1, 2, 1.5, -0.4, 0, Math.PI * 2); ctx.fill()
  }
}

/* ── coffee table ── */
function coffeeTable(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.fillStyle = 'rgba(0,0,0,0.3)'
  ctx.beginPath(); ctx.ellipse(cx + 1, cy + 2, 26, 20, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#1c1408'; ctx.strokeStyle = '#4a3a1e'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.ellipse(cx, cy, 25, 19, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
  // surface sheen
  ctx.fillStyle = 'rgba(255,200,100,0.04)'
  ctx.beginPath(); ctx.ellipse(cx - 4, cy - 4, 14, 9, -0.4, 0, Math.PI * 2); ctx.fill()
  // cup
  ctx.fillStyle = '#2a1808'; ctx.beginPath(); ctx.ellipse(cx, cy, 7, 5.5, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#8a5a2a'; ctx.beginPath(); ctx.ellipse(cx, cy, 3.5, 2.8, 0, 0, Math.PI * 2); ctx.fill()
  // steam
  ctx.strokeStyle = 'rgba(255,220,150,0.18)'; ctx.lineWidth = 0.8
  for (let s = 0; s < 2; s++) {
    ctx.beginPath(); ctx.moveTo(cx - 2 + s * 4, cy - 6)
    ctx.bezierCurveTo(cx - 4 + s * 4, cy - 10, cx + s * 4, cy - 12, cx - 2 + s * 4, cy - 15)
    ctx.stroke()
  }
}

/* ── coffee machine ── */
function coffeeMachine(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // body shadow
  ctx.fillStyle = 'rgba(0,0,0,0.5)'
  ctx.fillRect(x + 2, y + 2, 40, 56)
  // body
  ctx.fillStyle = '#120c06'; ctx.strokeStyle = '#5a3a14'; ctx.lineWidth = 1
  ctx.fillRect(x, y, 40, 56); ctx.strokeRect(x, y, 40, 56)
  // highlight edge
  ctx.fillStyle = '#2a1a0a'; ctx.fillRect(x, y, 2, 56)
  ctx.fillStyle = '#2a1a0a'; ctx.fillRect(x, y, 40, 2)
  // display panel
  ctx.fillStyle = '#f59e0b1e'; ctx.fillRect(x + 4, y + 6, 32, 18)
  ctx.strokeStyle = '#f59e0b66'; ctx.strokeRect(x + 4, y + 6, 32, 18)
  // brand glyph
  ctx.font = 'bold 11px monospace'; ctx.fillStyle = '#f59e0baa'; ctx.textAlign = 'center'
  ctx.fillText('☕', x + 20, y + 20)
  // buttons
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i === 0 ? '#f59e0bbb' : '#1e1208'
    ctx.beginPath(); ctx.arc(x + 10 + i * 10, y + 34, 4.5, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = i === 0 ? '#f59e0b' : '#4a3010'; ctx.lineWidth = 0.8; ctx.stroke()
  }
  // drip spout
  ctx.fillStyle = '#3a2010'; ctx.fillRect(x + 14, y + 44, 12, 5)
  ctx.fillStyle = '#f59e0b44'; ctx.fillRect(x + 14, y + 46, 12, 2)
  // tray
  ctx.fillStyle = '#2a1608'; ctx.fillRect(x + 6, y + 46, 28, 9)
  ctx.strokeStyle = '#5a3a14'; ctx.lineWidth = 0.5; ctx.strokeRect(x + 6, y + 46, 28, 9)
}

/* ── plant ── */
function plant(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // pot shadow
  ctx.fillStyle = 'rgba(0,0,0,0.4)'
  ctx.beginPath(); ctx.ellipse(x + 1, y + 10, 9, 6, 0, 0, Math.PI * 2); ctx.fill()
  // pot
  ctx.fillStyle = '#2e1a10'; ctx.strokeStyle = '#5a3820'; ctx.lineWidth = 0.8
  ctx.beginPath(); ctx.roundRect(x - 8, y + 4, 16, 12, 2); ctx.fill(); ctx.stroke()
  ctx.fillStyle = '#3a2218'; ctx.fillRect(x - 7, y + 4, 14, 3)
  // soil
  ctx.fillStyle = '#1a1008'; ctx.beginPath(); ctx.ellipse(x, y + 5, 7, 4, 0, 0, Math.PI * 2); ctx.fill()
  // stem
  ctx.strokeStyle = '#2a5020'; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.moveTo(x, y + 4); ctx.lineTo(x, y - 6); ctx.stroke()
  // leaves
  for (const [lx, ly, rx, ry, rot] of [
    [x, y - 2, x - 10, y - 12, -0.3],
    [x, y - 4, x + 10, y - 14, 0.3],
    [x, y - 8, x - 8, y - 18, -0.5],
    [x, y - 8, x + 7, y - 18, 0.5],
    [x, y - 12, x, y - 22, 0],
  ] as [number, number, number, number, number][]) {
    ctx.save(); ctx.translate(lx, ly); ctx.rotate(rot)
    ctx.fillStyle = '#1e4a1e'
    ctx.beginPath(); ctx.ellipse(rx - lx, ry - ly, 7, 10, rot, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#2a6028'
    ctx.beginPath(); ctx.ellipse(rx - lx, ry - ly, 4, 7, rot, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
  }
}

/* ── vignette overlay ── */
function drawVignette(ctx: CanvasRenderingContext2D) {
  const grd = ctx.createRadialGradient(CW / 2, CH / 2, CW * 0.3, CW / 2, CH / 2, CW * 0.75)
  grd.addColorStop(0, 'transparent')
  grd.addColorStop(1, 'rgba(0,0,0,0.45)')
  ctx.fillStyle = grd
  ctx.fillRect(0, 0, CW, CH)
}

/* ── window light from top ── */
function drawWindowLight(ctx: CanvasRenderingContext2D) {
  // simulated window light hitting the top of the work area
  const grd = ctx.createLinearGradient(CW * 0.6, 0, CW * 0.6, 80)
  grd.addColorStop(0, 'rgba(120,150,255,0.05)')
  grd.addColorStop(1, 'transparent')
  ctx.fillStyle = grd
  ctx.fillRect(270, 8, 642, 80)
}

/* ══════════════════════ static background ══════════════════════ */
function buildBG(canvas: HTMLCanvasElement, scale = 1, lang: 'EN' | 'TH' = 'TH') {
  const ctx = canvas.getContext('2d')!
  canvas.width = Math.round(CW * scale); canvas.height = Math.round(CH * scale)
  ctx.scale(scale, scale)

  // outer base
  ctx.fillStyle = '#080714'; ctx.fillRect(0, 0, CW, CH)

  // 1. Room floors (tiles + accent glow)
  for (const rm of Object.values(R)) drawRoomFloor(ctx, rm)

  // 2. Ceiling lights
  // Work area grid
  for (const [lx, ly] of [
    [430,55],[550,55],[670,55],[790,55],
    [350,140],[470,140],[590,140],[710,140],[830,140],
    [350,210],[470,210],[590,210],[710,210],
  ] as [number,number][]) ceilingLight(ctx, lx, ly, 62)

  // Meeting rooms
  ceilingLight(ctx, 100, 80, 55, '#c4b5fd')
  ceilingLight(ctx, 190, 80, 55, '#c4b5fd')
  ceilingLight(ctx, 145, 155, 45, '#c4b5fd')
  ceilingLight(ctx, 68, 275, 42, '#93c5fd')
  ceilingLight(ctx, 196, 275, 42, '#67e8f9')
  ceilingLight(ctx, 68, 420, 42, '#86efac')
  ceilingLight(ctx, 196, 420, 42, '#fde68a')
  // Dining (4 tables)
  for (const [lx, ly] of [[320,330],[420,330],[320,420],[420,420]] as [number,number][])
    ceilingLight(ctx, lx, ly, 40, '#bbf7d0')
  // Coffee (2 tables)
  ceilingLight(ctx, 680, 322, 48, '#fef3c7')
  ceilingLight(ctx, 840, 300, 38, '#fde68a')

  // 3. Window light
  drawWindowLight(ctx)

  // 4. Walls
  walls(ctx)

  // 5. Meeting Large furniture
  confTable(ctx, 140, 125, 164, 72, '#a855f7')
  const lgChairs: [number, number][] = [
    [70,120],[103,120],[137,120],[170,120],[203,120],
    [70,155],[103,155],[137,155],[170,155],[203,155],
    [52,137],[228,137],
  ]
  for (const [cx, cy] of lgChairs) chair(ctx, cx, cy)
  whiteboard(ctx, 13, 42, 46, 58, '#a855f7')
  plant(ctx, 246, 18); plant(ctx, 13, 198)

  // 7. Meeting Smalls
  confTable(ctx, 68, 278, 96, 40, '#2d7fff')
  for (const [cx, cy] of [[38,262],[68,262],[98,262],[38,295],[68,295],[98,295]] as [number,number][]) chair(ctx,cx,cy)
  whiteboard(ctx, 12, 224, 24, 36, '#2d7fff')

  confTable(ctx, 196, 278, 96, 40, '#06b6d4')
  for (const [cx, cy] of [[163,262],[196,262],[229,262],[163,295],[196,295],[229,295]] as [number,number][]) chair(ctx,cx,cy)
  whiteboard(ctx, 138, 224, 24, 36, '#06b6d4')

  confTable(ctx, 68, 418, 96, 44, '#22c55e')
  for (const [cx, cy] of [[38,402],[68,402],[98,402],[38,438],[68,438],[98,438]] as [number,number][]) chair(ctx,cx,cy)
  whiteboard(ctx, 12, 360, 24, 36, '#22c55e')

  confTable(ctx, 196, 418, 96, 44, '#f59e0b')
  for (const [cx, cy] of [[163,402],[196,402],[229,402],[163,438],[196,438],[229,438]] as [number,number][]) chair(ctx,cx,cy)
  whiteboard(ctx, 138, 360, 24, 36, '#f59e0b')

  // 8. Work area desks (inactive)
  for (const [dx, dy] of DESKS) desk(ctx, dx, dy, '#635C8A', false)
  plant(ctx, 282, 16); plant(ctx, 900, 16); plant(ctx, 900, 252)

  // 9. Dining (4 tables, 2×2)
  for (const [tx, ty] of [[320,330],[420,330],[320,420],[420,420]] as [number,number][]) {
    dineTable(ctx, tx, ty)
    for (const [cx, cy] of [[tx-50,ty],[tx-28,ty-30],[tx+28,ty-30],[tx+50,ty],[tx-28,ty+30],[tx+28,ty+30]] as [number,number][])
      chair(ctx, cx, cy)
  }
  plant(ctx, 282, 488); plant(ctx, 462, 488)

  // 10. Coffee corner
  coffeeMachine(ctx, 860, 280)
  for (const [tx, ty] of [[648,322],[710,322]] as [number,number][]) {
    coffeeTable(ctx, tx, ty)
    chair(ctx, tx - 20, ty); chair(ctx, tx + 20, ty)
    chair(ctx, tx, ty - 18); chair(ctx, tx, ty + 18)
  }
  plant(ctx, 614, 488); plant(ctx, 900, 488)

  // 10b. Phone booths (4 booths, 2×2 grid)
  const pbAccent = '#0ea5e9'
  for (const [pcx, pcy] of [[503,329],[566,329],[503,441],[566,441]] as [number,number][]) {
    ceilingLight(ctx, pcx, pcy, 28, '#bae6fd')
    confTable(ctx, pcx, pcy, 26, 14, pbAccent)
    chair(ctx, pcx, pcy - 16)
    chair(ctx, pcx, pcy + 16)
    chair(ctx, pcx - 16, pcy)
  }

  // 10d. Quiet Zone — cozy corner with soft purple light
  ceilingLight(ctx, 834, 462, 38, '#c4b5fd')
  coffeeTable(ctx, 830, 462)
  chair(ctx, 808, 462); chair(ctx, 852, 462)
  chair(ctx, 830, 444); chair(ctx, 830, 480)
  plant(ctx, 774, 488)

  // 11. Vignette
  drawVignette(ctx)

  // 12. Room labels LAST — so they always appear on top of all furniture
  for (const [key, rm] of Object.entries(R)) {
    const lbl = lang === 'TH' ? (ROOM_LABELS_TH[key] ?? rm.label) : rm.label
    label(ctx, { ...rm, label: lbl })
  }
}

/* ══════════════════════ agent drawing ══════════════════════ */
const SS = 28

function drawAgent(
  ctx: CanvasRenderingContext2D,
  imgs: Record<string, HTMLImageElement>,
  agentId: string,
  x: number, y: number, color: string, name: string,
  state: AgentLive['state'], phase: number,
  facingRight: boolean, selected: boolean, working: boolean,
  time = 0,
) {
  const atDesk = state === 'working'
  const sit = atDesk || state === 'sitting' || state === 'eating' || state === 'coffee' || state === 'meeting'
  const walk = state === 'walking'
  // top-down vertical bob only — two bounces per step cycle
  const bobY = walk ? Math.abs(Math.sin(phase)) * 2.5 : 0
  const img = imgs[agentId]

  // ground shadow
  if (!atDesk) {
    ctx.fillStyle = 'rgba(0,0,0,0.32)'
    ctx.beginPath(); ctx.ellipse(rf(x), rf(y) + 2, sit ? 14 : 11, sit ? 5 : 4, 0, 0, Math.PI * 2); ctx.fill()
  }

  // selected ring
  if (selected) {
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.setLineDash([4, 3])
    ctx.beginPath(); ctx.ellipse(rf(x), rf(y) - 10, 19, 7, 0, 0, Math.PI * 2); ctx.stroke()
    ctx.setLineDash([])
  }

  // working: pulsing glow ring
  if (working) {
    const pulse = (Math.sin(time * 0.003) + 1) / 2
    ctx.save()
    ctx.globalAlpha = 0.12 + pulse * 0.22
    ctx.strokeStyle = color; ctx.lineWidth = 3
    ctx.shadowColor = color; ctx.shadowBlur = 14 + pulse * 10
    ctx.beginPath(); ctx.ellipse(rf(x), rf(y - SS * 0.5), 21 + pulse * 5, 9 + pulse * 2, 0, 0, Math.PI * 2); ctx.stroke()
    ctx.restore()
    ctx.shadowColor = color; ctx.shadowBlur = 10
  }

  // sprite
  if (img?.complete && img.naturalWidth > 0) {
    ctx.save()
    ctx.translate(rf(x), rf(y - bobY))
    if (!facingRight) ctx.scale(-1, 1)
    ctx.imageSmoothingEnabled = false
    if (atDesk)     ctx.drawImage(img, -SS * 0.44, -SS * 1.32, SS * 0.88, SS * 0.88)
    else if (sit)   ctx.drawImage(img, -SS * 0.44, -SS * 1.05, SS * 0.88, SS * 0.88)
    else            ctx.drawImage(img, -SS / 2, -SS, SS, SS)
    ctx.restore()
  } else {
    ctx.fillStyle = color
    ctx.beginPath(); ctx.arc(rf(x), rf(y - SS * 0.5), 10, 0, Math.PI * 2); ctx.fill()
  }
  ctx.shadowBlur = 0

  // name tag
  const topOffset = atDesk ? SS * 1.32 : (sit ? SS * 1.05 : SS)
  ctx.save()
  ctx.font = `600 8.5px 'Noto Sans Thai',sans-serif`
  ctx.textAlign = 'center'
  const lbl = name.length > 13 ? name.slice(0, 12) + '…' : name
  const tw = ctx.measureText(lbl).width
  const tagY = rf(y - topOffset - 4)

  // tag background
  ctx.fillStyle = selected ? color + '30' : 'rgba(8,7,18,0.9)'
  ctx.beginPath(); ctx.roundRect(rf(x - tw / 2 - 6), tagY - 12, tw + 12, 14, 3); ctx.fill()
  if (selected || working) {
    ctx.strokeStyle = selected ? color + 'aa' : color + '44'; ctx.lineWidth = 0.8
    ctx.beginPath(); ctx.roundRect(rf(x - tw / 2 - 6), tagY - 12, tw + 12, 14, 3); ctx.stroke()
  }

  // tag text
  ctx.fillStyle = selected ? color : working ? '#10b981' : '#8a86b0'
  ctx.fillText(lbl, rf(x), tagY)

  // working indicator
  if (working) {
    ctx.font = '6.5px monospace'; ctx.fillStyle = '#10b981bb'
    ctx.fillText('⬡ WORKING', rf(x), tagY - 14)
  }
  ctx.restore()
}

/* ══════════════════════ pathfinding ══════════════════════ */
function inRoom(rm: Rm, x: number, y: number) {
  return x >= rm.x && x <= rm.x + rm.w && y >= rm.y && y <= rm.y + rm.h
}

type Zone = 'work' | 'meetLg' | 'meetSmall' | 'dining' | 'phonebooth' | 'coffee'
function getZone(x: number, y: number): Zone {
  if (inRoom(R.work, x, y)) return 'work'
  if (inRoom(R.meetLg, x, y)) return 'meetLg'
  if (inRoom(R.meetS1, x, y) || inRoom(R.meetS2, x, y) ||
      inRoom(R.meetS3, x, y) || inRoom(R.meetS4, x, y)) return 'meetSmall'
  if (inRoom(R.dining, x, y)) return 'dining'
  if (inRoom(R.pb1, x, y) || inRoom(R.pb2, x, y) || inRoom(R.pb3, x, y) || inRoom(R.pb4, x, y)) return 'phonebooth'
  if (inRoom(R.coffee, x, y) || inRoom(R.quiet, x, y)) return 'coffee'
  return 'work'
}

/*
 * Door positions used as waypoints — each segment passes through a real gap:
 *   (264,135)  work ↔ meetLg        x=264 wall, gap y=105..165
 *   (122,210)  meetLg ↔ meetSmall   y=210 wall, gap x=95..150
 *   (444,272)  work ↔ dining        y=272 wall, gap x=414..474
 *   (560,272)  work ↔ PB-2 top      y=272 wall, gap x=534..586
 *   (472,315)  dining ↔ PB-1        x=472 wall, gap y=302..328
 *   (534,319)  PB-1 ↔ PB-2          x=534 wall, gap y=306..332
 *   (472,421)  dining ↔ PB-3        x=472 wall, gap y=408..434
 *   (511,384)  PB-1 ↔ PB-3          y=384 wall, gap x=500..522
 *   (567,384)  PB-2 ↔ PB-4          y=384 wall, gap x=556..578
 *   (600,400)  phonebooth ↔ coffee  x=600 wall, gap y=374..426
 */
const PASSAGES: Record<string, [number, number][]> = {
  'work:meetLg':         [[264,135]],
  'meetLg:work':         [[264,135]],
  'meetLg:meetSmall':    [[122,210]],
  'meetSmall:meetLg':    [[122,210]],
  'work:dining':         [[444,272]],
  'dining:work':         [[444,272]],
  'work:meetSmall':      [[264,135],[122,210]],
  'meetSmall:work':      [[122,210],[264,135]],
  // Work ↔ Coffee: through right-side y=272 gap → PB-2 → PB-4 → coffee
  'work:coffee':         [[560,272],[567,384],[600,400]],
  'coffee:work':         [[600,400],[567,384],[560,272]],
  // Dining ↔ Coffee: through x=472 left door → PB-1 → PB-2 → PB-4 → coffee
  'dining:coffee':       [[472,315],[534,319],[567,384],[600,400]],
  'coffee:dining':       [[600,400],[567,384],[534,319],[472,315]],
  'meetLg:dining':       [[264,135],[444,272]],
  'dining:meetLg':       [[444,272],[264,135]],
  'meetLg:coffee':       [[264,135],[560,272],[567,384],[600,400]],
  'coffee:meetLg':       [[600,400],[567,384],[560,272],[264,135]],
  'meetSmall:dining':    [[122,210],[264,135],[444,272]],
  'dining:meetSmall':    [[444,272],[264,135],[122,210]],
  'meetSmall:coffee':    [[122,210],[264,135],[560,272],[567,384],[600,400]],
  'coffee:meetSmall':    [[600,400],[567,384],[560,272],[264,135],[122,210]],
  // Phonebooth ↔ everything: direct door-to-door routes
  'phonebooth:work':     [[560,272]],
  'work:phonebooth':     [[560,272]],
  'phonebooth:dining':   [[472,315]],
  'dining:phonebooth':   [[472,315]],
  'phonebooth:coffee':   [[567,384],[600,400]],
  'coffee:phonebooth':   [[600,400],[567,384]],
  'phonebooth:meetLg':   [[560,272],[264,135]],
  'meetLg:phonebooth':   [[264,135],[560,272]],
  'phonebooth:meetSmall':[[560,272],[264,135],[122,210]],
  'meetSmall:phonebooth':[[122,210],[264,135],[560,272]],
}

function buildPath(fx: number, fy: number, tx: number, ty: number): [number, number][] {
  const from = getZone(fx, fy), to = getZone(tx, ty)
  if (from === to) return [[tx, ty]]
  const vias = (PASSAGES[`${from}:${to}`] ?? []) as [number, number][]
  return [...vias, [tx, ty]]
}

/* ══════════════════════ live agent state ══════════════════════ */
type AgentState = 'working' | 'walking' | 'sitting' | 'eating' | 'coffee' | 'meeting' | 'standing'
interface AgentLive {
  id: string; name: string; name_en?: string; team: string; status: string
  x: number; y: number; tx: number; ty: number
  path: [number, number][]
  state: AgentState; homeX: number; homeY: number
  phase: number; facingRight: boolean; nextAt: number; speed: number
}

function pickSpot(key: keyof typeof SPOTS): [number, number] {
  const a = SPOTS[key]; return a[Math.floor(Math.random() * a.length)]
}

/* ══════════════════════ component ══════════════════════ */
export default function OfficeLive({
  agents, onSelect, selectedId,
}: { agents: Agent[]; onSelect: (a: Agent) => void; selectedId?: string | null }) {
  const { lang } = useLanguage()
  const langRef = useRef(lang)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const liveRef = useRef<AgentLive[]>([])
  const agentsRef = useRef<Agent[]>(agents)
  const selRef = useRef<string | null>(null)
  const bgRef = useRef<HTMLCanvasElement | null>(null)
  const imgRef = useRef<Record<string, HTMLImageElement>>({})
  agentsRef.current = agents
  langRef.current = lang
  if (selectedId !== undefined) selRef.current = selectedId ?? null

  useEffect(() => {
    const cache = imgRef.current
    for (const [id, url] of Object.entries(svgCache)) {
      if (cache[id]) continue
      const img = new Image(); img.src = url; cache[id] = img
    }
  }, [])

  useEffect(() => {
    for (const la of liveRef.current) {
      const a = agents.find((x) => x.id === la.id)
      if (a) { la.status = a.status; la.name = a.name; la.name_en = a.name_en }
    }
  }, [agents])

  useEffect(() => {
    if (!agents.length) return
    liveRef.current = agents.map((a, i) => {
      const [hx, hy] = DESKS[i % DESKS.length]
      return {
        id: a.id, name: a.name, name_en: a.name_en, team: a.team, status: a.status,
        x: hx, y: hy, tx: hx, ty: hy,
        path: [] as [number, number][],
        state: Math.random() > 0.3 ? 'working' : 'standing',
        homeX: hx, homeY: hy,
        phase: Math.random() * 200,
        facingRight: Math.random() > 0.5,
        nextAt: Date.now() + 500 + Math.random() * 4000,
        speed: 2.2 + Math.random() * 0.8,
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agents.length])

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let id: number
    let sc = 1, dpr = 1, lastKey = ''

    const fitCanvas = () => {
      dpr = window.devicePixelRatio || 1
      const parent = canvas.parentElement; if (!parent) return
      const cw = Math.floor(parent.getBoundingClientRect().width)
      const ch = Math.floor(cw * CH / CW)
      sc = cw / CW
      canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px'
      canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr)
    }
    fitCanvas()
    window.addEventListener('resize', fitCanvas)

    let lastT = performance.now()
    const tick = (ts: number) => {
      const dt = Math.min((ts - lastT) / 16.667, 3); lastT = ts
      const now = Date.now()

      ctx.setTransform(sc * dpr, 0, 0, sc * dpr, 0, 0)
      const key = `${sc.toFixed(4)}:${dpr}:${langRef.current}`
      if (key !== lastKey) {
        const bg = document.createElement('canvas')
        buildBG(bg, sc * dpr, langRef.current)
        bgRef.current = bg; lastKey = key
      }

      for (const la of liveRef.current) {
        if (la.path.length > 0) {
          const [wx, wy] = la.path[0]
          const dx = wx - la.x, dy = wy - la.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist > 2) {
            let sx = dx / dist, sy = dy / dist
            // lookahead: curve smoothly into corners
            if (la.path.length > 1 && dist < 60) {
              const [nx2, ny2] = la.path[1]
              const nd = Math.sqrt((nx2 - wx) ** 2 + (ny2 - wy) ** 2)
              if (nd > 0) {
                const blend = (1 - dist / 60) * 0.5
                sx = sx * (1 - blend) + (nx2 - wx) / nd * blend
                sy = sy * (1 - blend) + (ny2 - wy) / nd * blend
                const sl = Math.sqrt(sx * sx + sy * sy); sx /= sl; sy /= sl
              }
            }
            la.x += sx * la.speed * dt
            la.y += sy * la.speed * dt
            la.state = 'walking'
            la.facingRight = sx > 0
          } else {
            la.x = wx; la.y = wy; la.path.shift()
            if (la.path.length === 0) {
              const atDesk = Math.abs(la.x - la.homeX) < 10 && Math.abs(la.y - la.homeY) < 10
              if (atDesk) la.state = 'working'
              else if (inRoom(R.dining, la.x, la.y)) la.state = 'eating'
              else if (inRoom(R.pb1, la.x, la.y) || inRoom(R.pb2, la.x, la.y) ||
                       inRoom(R.pb3, la.x, la.y) || inRoom(R.pb4, la.x, la.y)) la.state = 'meeting'
              else if (inRoom(R.coffee, la.x, la.y) || inRoom(R.quiet, la.x, la.y)) la.state = 'coffee'
              else if (inRoom(R.meetLg, la.x, la.y) || inRoom(R.meetS1, la.x, la.y) ||
                       inRoom(R.meetS2, la.x, la.y) || inRoom(R.meetS3, la.x, la.y) ||
                       inRoom(R.meetS4, la.x, la.y)) la.state = 'meeting'
              else la.state = 'standing'
              la.nextAt = now + 2000 + Math.random() * 6000
            }
          }
        }
        if (now > la.nextAt && la.path.length === 0) {
          const w = la.status === 'working', rn = Math.random()
          let nx = la.homeX, ny = la.homeY
          if (w) {
            if      (rn < 0.38) { nx = la.homeX; ny = la.homeY }
            else if (rn < 0.52) { [nx, ny] = pickSpot('meetLg') }
            else if (rn < 0.62) { [nx, ny] = pickSpot('coffee') }
            else if (rn < 0.70) { [nx, ny] = pickSpot('quiet') }
            else if (rn < 0.80) { [nx, ny] = pickSpot('phonebooth') }
            else if (rn < 0.91) { [nx, ny] = pickSpot('dining') }
            else                 { nx = la.homeX + (Math.random() - .5) * 30; ny = la.homeY + (Math.random() - .5) * 16 }
          } else {
            if      (rn < 0.20) { nx = la.homeX; ny = la.homeY }
            else if (rn < 0.34) { [nx, ny] = pickSpot('meetLg') }
            else if (rn < 0.44) { const k = (['meetS1','meetS2','meetS3','meetS4'] as const)[Math.floor(Math.random() * 4)];[nx, ny] = pickSpot(k) }
            else if (rn < 0.56) { [nx, ny] = pickSpot('dining') }
            else if (rn < 0.66) { [nx, ny] = pickSpot('coffee') }
            else if (rn < 0.74) { [nx, ny] = pickSpot('quiet') }
            else if (rn < 0.84) { [nx, ny] = pickSpot('phonebooth') }
            else                 { nx = la.homeX + (Math.random() - .5) * 50; ny = la.homeY + (Math.random() - .5) * 25 }
          }
          la.tx = nx; la.ty = ny
          la.path = buildPath(la.x, la.y, nx, ny)
          la.nextAt = now + 600
        }
        la.phase += dt * (la.state === 'walking' ? 1.4 : 0.4)
      }

      ctx.clearRect(0, 0, CW, CH)
      if (bgRef.current) ctx.drawImage(bgRef.current, 0, 0, CW, CH)

      // working desks (colored chair + keyboard glow)
      for (const la of liveRef.current) {
        if (la.state === 'working') desk(ctx, la.homeX, la.homeY, TEAM_COLOR[la.team] || '#635C8A', true)
      }
      // agents (depth sorted)
      for (const la of [...liveRef.current].sort((a, b) => a.y - b.y)) {
        drawAgent(ctx, imgRef.current, la.id, la.x, la.y, TEAM_COLOR[la.team] || '#635C8A',
          langRef.current === 'EN' && la.name_en ? la.name_en : la.name,
          la.state, la.phase, la.facingRight, selRef.current === la.id, la.status === 'working', ts)
      }
      // monitor + desk front (after agent, creates depth)
      for (const la of [...liveRef.current].sort((a, b) => a.y - b.y)) {
        if (la.state === 'working') {
          drawDeskMonitor(ctx, la.homeX, la.homeY, TEAM_COLOR[la.team] || '#635C8A', true)
          drawDeskFront(ctx, la.homeX, la.homeY, TEAM_COLOR[la.team] || '#635C8A')
        }
      }

      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame((ts) => { lastT = ts; tick(ts) })
    return () => { cancelAnimationFrame(id); window.removeEventListener('resize', fitCanvas) }
  }, [])

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current; if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const sc = rect.width / CW
    const mx = (e.clientX - rect.left) / sc
    const my = (e.clientY - rect.top) / sc
    let best: AgentLive | null = null, bestD = 28
    for (const la of liveRef.current) {
      const d = Math.sqrt((mx - la.x) ** 2 + (my - la.y) ** 2)
      if (d < bestD) { bestD = d; best = la }
    }
    if (best) {
      selRef.current = best.id
      const a = agentsRef.current.find((x) => x.id === best!.id)
      if (a) onSelect(a)
    }
  }, [onSelect])

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden" style={{ border: '1px solid #2a2448' }}>
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        style={{ width: '100%', height: 'auto', cursor: 'pointer', display: 'block' }}
      />
    </div>
  )
}
