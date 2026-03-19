# AgentOS — Multi-Agent Dashboard

ระบบควบคุม AI Agents หลายตัวจาก dashboard เดียว
สร้างด้วย Next.js 14 + SQLite + Anthropic API

---

## 🚀 วิธีติดตั้งและรัน

### 1. ติดตั้ง Dependencies

```bash
cd multi-agent-dashboard
npm install
```

### 2. ตั้งค่า API Key

```bash
cp .env.example .env.local
```

แล้วแก้ไขไฟล์ `.env.local`:
```
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxx
DATABASE_PATH=./data/agents.db
```

> รับ API Key ได้ที่: https://console.anthropic.com

### 3. รัน Development Server

```bash
npm run dev
```

เปิดเบราว์เซอร์ไปที่ **http://localhost:3000**

---

## 📂 โครงสร้างโปรเจกต์

```
multi-agent-dashboard/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Command Center (หน้าหลัก)
│   │   ├── agents/page.tsx       # จัดการ Agents
│   │   ├── missions/page.tsx     # สั่งงาน + ดู Output แบบ real-time
│   │   ├── memory/page.tsx       # ดู Memory ของ Agents
│   │   ├── skills/page.tsx       # จัดการ Skills
│   │   └── api/
│   │       ├── agents/           # CRUD agents
│   │       ├── missions/         # CRUD + execute missions (SSE)
│   │       ├── memory/           # CRUD memory
│   │       ├── skills/           # CRUD skills
│   │       ├── messages/         # Message bus
│   │       └── stats/            # Dashboard statistics
│   └── lib/
│       ├── db.ts                 # SQLite setup + seeding
│       └── types.ts              # TypeScript types
├── data/
│   └── agents.db                 # SQLite database (auto-created)
└── .env.local                    # API keys
```

---

## 🤖 ทีม AI (15 Agents)

| ทีม | Agents | Model |
|-----|--------|-------|
| **CORE** | เลขา | Sonnet |
| **TECH** | นักเขียนโค้ด, ผู้ดูแลระบบ, นักสร้างออโตเมชัน, นักออกแบบ Prompt | Sonnet/Haiku |
| **CREATIVE** | นักออกแบบคอร์ส, นักสร้างคอนเทนต์, กราฟฟิค, ครีเอทีฟ | Sonnet/Haiku |
| **BUSINESS** | นักการตลาด, นักวางกลยุทธ์, นักข่าว | Sonnet/Haiku |
| **FINANCE** | นักบัญชี, นักเทรดทอง, นักวิเคราะห์หุ้น | Sonnet |

---

## 🗄️ ฐานข้อมูล

SQLite จะถูกสร้างอัตโนมัติที่ `./data/agents.db`
ถ้าต้องการ reset ฐานข้อมูล:

```bash
npm run db:init
```

**ตาราง:**
- `agents` — ข้อมูล AI Agents ทั้งหมด
- `missions` — ภารกิจ/งานที่สั่ง
- `memory` — ความทรงจำสะสมของแต่ละ Agent
- `skills` — ชุด Prompt Templates ที่ reuse ได้
- `messages` — Message Bus ระหว่าง Agents

---

## ✨ ฟีเจอร์หลัก

### Command Center
- เห็นภาพรวมทีมทั้งหมด
- สถานะ Agents แบบ real-time (polling ทุก 5 วินาที)
- สถิติ missions, tokens, memories

### Missions (สำคัญที่สุด)
- สร้างภารกิจให้ Agent ทำ
- **SSE Streaming** — เห็น output แบบ real-time ทีละคำ
- บันทึกผลลัพธ์และ memory อัตโนมัติ

### Agents
- ดูรายละเอียดและประวัติภารกิจของแต่ละ Agent
- แก้ไข System Prompt, Model, Effort Level

### Memory
- Memory ถูกสร้างอัตโนมัติหลัง Agent ทำภารกิจ
- Inject กลับเข้า prompt ในรอบถัดไปอัตโนมัติ
- เพิ่ม/ลบ Memory ได้เอง

### Skills
- Template ที่ reuse ได้
- กำหนด variable ด้วย `{{variable}}`
- สร้างเพิ่มได้ไม่จำกัด

---

## 🛠️ Tech Stack

- **Frontend:** Next.js 14, React, Tailwind CSS
- **Backend:** Next.js API Routes
- **Database:** SQLite (better-sqlite3)
- **AI:** Anthropic Claude API
- **Streaming:** Server-Sent Events (SSE)

---

## ⚠️ หมายเหตุ

- ระบบใช้ Anthropic API จริง — ตรวจสอบการใช้งานที่ console.anthropic.com
- FINANCE agents เป็นเพียงผู้ช่วยวิเคราะห์ข้อมูล ไม่ใช่คำแนะนำการลงทุน
