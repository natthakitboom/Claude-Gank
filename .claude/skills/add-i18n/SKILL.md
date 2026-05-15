---
name: add-i18n
description: Use this skill when adding new translation keys to the MI Gang i18n system. Trigger when user wants to add new text labels, page titles, button text, or any UI copy that needs Thai/English support.
---

# Add i18n Key Skill — MI Gang

เพิ่ม translation keys ใน `src/lib/i18n.tsx` — ต้องเพิ่มทั้ง EN และ TH พร้อมกันเสมอ

---

## โครงสร้างไฟล์

```
src/lib/i18n.tsx
└── translations
    ├── EN: { ... }   ← เพิ่มที่นี่
    └── TH: { ... }   ← และที่นี่ด้วย
```

`TranslationKey` ถูก infer อัตโนมัติจาก `keyof typeof translations.EN` — ไม่ต้องแก้ type ใดเลย

---

## วิธีเพิ่ม Key

**1. หมวดหมู่ที่ใช้อยู่แล้ว** (เพิ่มต่อท้ายหมวดที่เหมาะสม):
- `// Sidebar` — nav labels, collapse
- `// Agents page` — agent management UI
- `// Missions page` — mission list, filters
- `// Projects page` — project management
- `// Chat page` — chat UI
- `// Schedule page` — scheduling UI
- `// System page` — system config
- `// SDLC page` — SDLC workflow
- `// Usage page` — usage/cost tracking
- `// Status` — status labels (pending/running/done/failed)
- `// Team labels` — team names

**2. เพิ่มใน EN ก่อน:**
```ts
// EN: { ...
  // <Feature/Section name>
  <feature>_title: 'TITLE IN CAPS',
  <feature>_subtitle: '// SUBTITLE',
  <feature>_action: 'ACTION LABEL',
// ...
```

**3. เพิ่มใน TH ต่อ (ตำแหน่งเดียวกัน):**
```ts
// TH: { ...
  // <Feature/Section name>
  <feature>_title: 'หัวข้อภาษาไทย',
  <feature>_subtitle: 'คำอธิบายภาษาไทย',
  <feature>_action: 'ปุ่มภาษาไทย',
// ...
```

---

## Naming Convention

| ประเภท | Pattern | ตัวอย่าง |
|---|---|---|
| Nav item | `nav_<name>` | `nav_agents`, `nav_chat` |
| Page title | `<page>_title` | `agents_title`, `missions_title` |
| Page subtitle | `<page>_subtitle` | `agents_subtitle` |
| Action button | `<verb>_<noun>` | `deploy_mission`, `create_deploy` |
| Status label | `status_<state>` | `status_running`, `status_done` |
| Loading state | `loading_<context>` | `loading_agents`, `loading_hq` |
| Empty state | `no_<items>` | `no_missions`, `no_projects` |

---

## การใช้งานใน Component

```tsx
import { useLanguage } from '@/lib/i18n'

export default function MyComponent() {
  const { t } = useLanguage()

  return <h1>{t('my_key')}</h1>
}
```

TypeScript จะ error ถ้า key ไม่มีใน translations — ใช้เป็น type guard โดยอัตโนมัติ

---

## Rules
- เพิ่ม EN และ TH **พร้อมกันเสมอ** — ห้ามเพิ่มแค่ภาษาเดียว
- EN ใช้ ALL CAPS สำหรับ titles, normal case สำหรับ descriptions
- TH เขียนธรรมชาติ — ห้ามแปลตรงๆ แบบ machine translation
- key ต้องไม่ซ้ำกับที่มีอยู่ — grep ก่อนเพิ่มเสมอ
- ห้าม hardcode text ใน component — ใช้ `t()` ทุกกรณี
