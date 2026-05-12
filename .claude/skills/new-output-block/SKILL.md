---
name: new-output-block
description: Use this skill when adding a new parsed output block type to the mission execute route. Trigger when user wants agents to be able to output a new structured block (like ---TASKS---, ---SEND_TO---) that triggers a specific action in the system.
---

# New Output Block Skill — Claude Gang

เพิ่ม output block handler ใหม่ใน `src/app/api/missions/[id]/execute/route.ts`

---

## Output Block คืออะไร

Agent output ที่มีรูปแบบ:
```
---BLOCK_NAME---
{ JSON payload }
---END---
```

ระบบ parse แล้วทำ action ตาม block type ก่อนที่ mission จะ complete

---

## Blocks ที่มีอยู่แล้ว

| Block | Handler | หน้าที่ |
|---|---|---|
| `---TASKS---` | `spawnSecretarySubMissions()` | Secretary แตก tasks → spawn sub-missions |
| `---SEND_TO---` | `handleSendToBlock()` | N2N: ส่งงานหรือ message ไป agent อื่น |
| `---RESULT---` | `handleResultBlock()` | อัปเดต deliverables, quality checks |
| `---PHASE_GATE---` | `handlePhaseGateBlock()` | บันทึก gate status สำหรับ SDLC phases |
| `---JIRA---` | `handleJiraBlock()` | สั่งงาน Jira: create issue, transition, comment |

---

## วิธีเพิ่ม Block ใหม่

### ขั้นตอน 1 — สร้าง handler function

```ts
// เพิ่มก่อน export async function POST(...)
function handle<BlockName>Block(db: any, missionId: string, mission: any, output: string) {
  const match = output.match(/---<BLOCK_NAME>---\s*([\s\S]*?)---END---/)
  if (!match) return

  try {
    const payload = JSON.parse(match[1].trim())
    // ดำเนินการตาม payload
    // ตัวอย่าง: db.prepare('UPDATE ...').run(...)
    console.log(`[<block_name>] ✅ Handled: ${JSON.stringify(payload).slice(0, 100)}`)
  } catch (e) {
    console.error('[<block_name>] Failed to parse block:', e)
  }
}
```

### ขั้นตอน 2 — เรียก handler ใน POST handler

หา section ที่ parse blocks อยู่แล้ว แล้วเพิ่มต่อ:

```ts
// ใน section หลัง mission complete (ค้นหา "handleResultBlock" ในไฟล์)
handleResultBlock(db, params.id, mission, fullOutput)
handlePhaseGateBlock(db, params.id, mission, fullOutput)
handle<BlockName>Block(db, params.id, mission, fullOutput)  // ← เพิ่มตรงนี้
```

### ขั้นตอน 3 — เพิ่ม block ใน System Prompt ของ Agent

ใน agent's `system_prompt` ที่ต้องการให้ใช้ block นี้:

```
เมื่อต้องการ <action>, ให้ output block นี้ในตอนท้าย:

---<BLOCK_NAME>---
{
  "field1": "value",
  "field2": "value"
}
---END---
```

---

## ตัวอย่าง: Block ใหม่สำหรับ Notify

```ts
function handleNotifyBlock(db: any, missionId: string, mission: any, output: string) {
  const match = output.match(/---NOTIFY---\s*([\s\S]*?)---END---/)
  if (!match) return

  try {
    const { channel, message, level = 'info' } = JSON.parse(match[1].trim())
    if (!channel || !message) return

    const msgId = `msg-${require('uuid').v4().slice(0, 8)}`
    db.prepare(`
      INSERT INTO messages (id, from_agent, mission_id, type, content, metadata_json)
      VALUES (?, ?, ?, 'broadcast', ?, ?)
    `).run(msgId, mission.agent_id, missionId, message, JSON.stringify({ channel, level, notify: true }))

    console.log(`[notify] 📢 ${mission.agent_name} → ${channel}: ${message.slice(0, 80)}`)
  } catch (e) {
    console.error('[notify] Failed to parse NOTIFY block:', e)
  }
}
```

---

## Rules
- Block name ต้องเป็น ALL_CAPS_WITH_UNDERSCORES
- Handler ต้องจัดการ parse error ด้วย try/catch เสมอ
- Log ด้วย prefix `[block_name]` ทุก action เพื่อ debug ง่าย
- ถ้า block ทำงาน async ต้องระวัง race condition กับ advanceProjectPhase()
- Handler ควร idempotent — ถ้า run ซ้ำต้องไม่ทำให้ข้อมูลเสีย
- เพิ่ม block ใน agent system_prompt พร้อมกับ handler เสมอ — ถ้า agent ไม่รู้ block จะไม่มีใครใช้
