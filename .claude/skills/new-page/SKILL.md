---
name: new-page
description: Use this skill when adding a new feature page/route to Claude Gang. Trigger when user wants to add a new screen, section, or nav item to the app. Covers all 4 required steps: nav entry, i18n keys, page.tsx, and API route.
---

# New Page Skill — Claude Gang

เพิ่มหน้าใหม่ใน Claude Gang ต้องทำ **4 ขั้นเสมอ** — ห้ามข้ามขั้นตอน

---

## ขั้นตอน 1 — เพิ่ม Nav Entry ใน `src/app/layout.tsx`

```tsx
// เพิ่มใน NAV_KEYS array
// import Icon ที่ต้องการจาก lucide-react ด้วย
{ href: '/<name>', key: 'nav_<name>', Icon: <LucideIcon> },
```

**Icons ที่ใช้แล้ว:** `Users, BarChart2, Radio, MessageCircle, Flag, FolderOpen, GitBranch, CalendarClock, Cpu`
เลือก icon ใหม่จาก lucide-react ที่ยังไม่ซ้ำ

---

## ขั้นตอน 2 — เพิ่ม i18n Keys ใน `src/lib/i18n.tsx`

เพิ่มใน **ทั้ง EN และ TH** — ต้องครบทั้งคู่เสมอ:

```ts
// EN section
nav_<name>: '<English Label>',
<name>_title: '<PAGE TITLE>',
<name>_subtitle: '// <SUBTITLE>',

// TH section
nav_<name>: '<ชื่อภาษาไทย>',
<name>_title: '<หัวข้อภาษาไทย>',
<name>_subtitle: '<คำอธิบายภาษาไทย>',
```

`TranslationKey` จะถูก infer โดย TypeScript อัตโนมัติ — ไม่ต้องแก้ type

---

## ขั้นตอน 3 — สร้าง `src/app/<name>/page.tsx`

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useLanguage } from '@/lib/i18n'

export default function <Name>Page() {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/<name>')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="p-6 min-h-screen" style={{ background: 'var(--bg-primary)', color: '#e2deff' }}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-widest" style={{ color: '#c4bfe8' }}>
          {t('<name>_title')}
        </h1>
        <p className="text-xs mt-1 font-mono" style={{ color: '#5a5680' }}>
          {t('<name>_subtitle')}
        </p>
      </div>

      {loading ? (
        <div className="text-center py-20 font-mono text-sm" style={{ color: '#5a5680' }}>
          {t('loading')}
        </div>
      ) : (
        <div>
          {/* content */}
        </div>
      )}
    </div>
  )
}
```

**Design tokens ของโปรเจกต์:**
- Background: `#13101e` (primary), `#1c1830` (card), `#0d0b14` (deep)
- Border: `#2d2848`
- Text: `#c4bfe8` (primary), `#9591b4` (secondary), `#5a5680` (muted)
- Accent: `#9b93c8` (purple), `#635C8A` (dark purple)
- Status: `#22c55e` (success), `#ef4444` (error), `#fbbf24` (warning), `#2d7fff` (info)

---

## ขั้นตอน 4 — สร้าง `src/app/api/<name>/route.ts`

```ts
import { getDb } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const db = getDb()
    const rows = db.prepare('SELECT * FROM <table> ORDER BY created_at DESC').all()
    return NextResponse.json(rows)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const db = getDb()
    const body = await req.json()
    // insert logic
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
```

---

## Rules
- ใช้ `getDb()` จาก `@/lib/db` เสมอ — ไม่สร้าง db connection ใหม่
- ใช้ `useLanguage()` ในทุก page — ห้าม hardcode text
- รูปแบบสีต้องสอดคล้องกับ design token ด้านบน — ห้ามใช้ Tailwind color classes เช่น `bg-gray-900` เพราะ project ใช้ inline style
- page ใหม่ไม่ต้องมี Sidebar เอง — `LayoutShell` ใน layout.tsx จัดการให้แล้ว
