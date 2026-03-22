import { getDb } from '@/lib/db'

interface NotifyConfig {
  id: string; platform: string; webhook_url: string; token: string; enabled: number
  notify_on_done: number; notify_on_failed: number; notify_on_skill_update: number
  agent_filter_json: string // JSON array of agent IDs, empty = all agents
}

// ── Send notification to a specific platform ──
async function sendNotification(config: NotifyConfig, message: string, title?: string, agentName?: string) {
  if (config.platform === 'line') {
    return sendLINE(config, message, title, agentName)
  } else if (config.platform === 'teams') {
    return sendTeams(config, message, title, agentName)
  }
  throw new Error(`Unknown platform: ${config.platform}`)
}

// ── LINE Messaging API (push message) ──
// LINE Notify was discontinued on March 31, 2025
// Now uses LINE Messaging API with Channel Access Token + target user/group ID
// token = Channel Access Token, webhook_url = target userId or groupId
async function sendLINE(config: NotifyConfig, message: string, title?: string, agentName?: string) {
  const token = config.token
  const targetId = config.webhook_url // reuse webhook_url field for userId/groupId
  if (!token) throw new Error('LINE Channel Access Token not configured')
  if (!targetId) throw new Error('LINE target ID (userId/groupId) not configured')

  const now = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })
  const divider = '━━━━━━━━━━━━━━━'
  const header = `🤖 Claude Gank\n${divider}\n${agentName ? `👤 Agent: ${agentName}\n` : ''}${title ? `📋 ${title}\n` : ''}${divider}`
  const footer = `${divider}\n🕐 ${now}`
  const maxMsgLen = 4800 - header.length - footer.length // LINE limit 5000 per message
  const text = `${header}\n${message.slice(0, maxMsgLen)}\n${footer}`

  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: targetId,
      messages: [{
        type: 'text',
        text: text.slice(0, 5000), // LINE limit 5000 chars
      }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`LINE Messaging API error: ${res.status} ${err}`)
  }
  return { ok: true }
}

// Helper: split long text into multiple Adaptive Card TextBlocks (Teams limit ~28KB per card)
function splitTextBlocks(text: string, maxPerBlock = 4000): Record<string, unknown>[] {
  const trimmed = text.slice(0, 10000) // overall safety limit
  const blocks: Record<string, unknown>[] = []
  for (let i = 0; i < trimmed.length; i += maxPerBlock) {
    blocks.push({
      type: 'TextBlock',
      text: trimmed.slice(i, i + maxPerBlock),
      wrap: true,
      size: 'Small',
    })
  }
  return blocks.length > 0 ? blocks : [{ type: 'TextBlock', text: '(no content)', wrap: true, size: 'Small' }]
}

// ── Microsoft Teams Webhook ──
// Supports both:
// 1. Power Automate Workflows webhook (recommended, new) — URL contains "logic.azure.com"
// 2. Legacy O365 Connector webhook (deprecated April 30, 2026) — URL contains "outlook.office.com"
async function sendTeams(config: NotifyConfig, message: string, title?: string, agentName?: string) {
  const url = config.webhook_url
  if (!url) throw new Error('Teams webhook URL not configured')

  const now = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: '2-digit' })

  // Detect event type from emoji prefix
  const isSuccess = message.startsWith('✅')
  const isFailed = message.startsWith('❌')
  const isSkillUpdate = message.startsWith('🧠')
  const accentColor = isFailed ? 'Attention' : isSkillUpdate ? 'Accent' : 'Good'

  // Rich Adaptive Card
  const card = {
    type: 'message',
    attachments: [{
      contentType: 'application/vnd.microsoft.card.adaptive',
      content: {
        '$schema': 'http://adaptivecards.io/schemas/adaptive-card.json',
        type: 'AdaptiveCard',
        version: '1.4',
        body: [
          // Header with colored bar
          {
            type: 'ColumnSet',
            columns: [
              {
                type: 'Column',
                width: 'auto',
                items: [{
                  type: 'TextBlock',
                  text: isSuccess ? '✅' : isFailed ? '❌' : isSkillUpdate ? '🧠' : '🤖',
                  size: 'Large',
                }],
              },
              {
                type: 'Column',
                width: 'stretch',
                items: [
                  {
                    type: 'TextBlock',
                    text: `Claude Gank`,
                    weight: 'Bolder',
                    size: 'Medium',
                    spacing: 'None',
                  },
                  {
                    type: 'TextBlock',
                    text: agentName ? `Agent: ${agentName}` : 'System Notification',
                    size: 'Small',
                    isSubtle: true,
                    spacing: 'None',
                  },
                ],
              },
              {
                type: 'Column',
                width: 'auto',
                items: [{
                  type: 'TextBlock',
                  text: now,
                  size: 'Small',
                  isSubtle: true,
                  horizontalAlignment: 'Right',
                }],
              },
            ],
          },
          // Divider
          {
            type: 'TextBlock',
            text: ' ',
            spacing: 'None',
            separator: true,
          },
          // Title
          ...(title ? [{
            type: 'TextBlock',
            text: title,
            weight: 'Bolder',
            size: 'Medium',
            color: accentColor,
            wrap: true,
          }] : []),
          // Message content — split into chunks for long messages
          ...splitTextBlocks(message.replace(/^[✅❌🧠]\s*/, ''), 4000),
          // Footer
          {
            type: 'ColumnSet',
            separator: true,
            spacing: 'Medium',
            columns: [
              {
                type: 'Column',
                width: 'stretch',
                items: [{
                  type: 'TextBlock',
                  text: `Status: ${isSuccess ? 'Completed' : isFailed ? 'Failed' : isSkillUpdate ? 'Skill Updated' : 'Info'}`,
                  size: 'Small',
                  isSubtle: true,
                }],
              },
              {
                type: 'Column',
                width: 'auto',
                items: [{
                  type: 'TextBlock',
                  text: 'Claude Gank Dashboard',
                  size: 'Small',
                  isSubtle: true,
                  horizontalAlignment: 'Right',
                }],
              },
            ],
          },
        ],
      },
    }],
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(card),
  })

  if (!res.ok) throw new Error(`Teams API error: ${res.status}`)
  return { ok: true }
}

// ── Helper: auto-notify on mission events (called from execute route) ──
// agentId is used to filter which configs should fire
export async function autoNotify(event: 'done' | 'failed' | 'skill_update', title: string, message: string, agentName?: string, agentId?: string) {
  try {
    const db = getDb()
    const fieldMap = { done: 'notify_on_done', failed: 'notify_on_failed', skill_update: 'notify_on_skill_update' }
    const field = fieldMap[event]

    const allConfigs = db.prepare(
      `SELECT * FROM notification_config WHERE enabled = 1 AND ${field} = 1`
    ).all() as NotifyConfig[]

    // Filter configs by agent — if agent_filter_json is empty/[], send to all; otherwise only if agent matches
    const configs = allConfigs.filter(config => {
      const filter: string[] = JSON.parse(config.agent_filter_json || '[]')
      if (filter.length === 0) return true // no filter = all agents
      return agentId ? filter.includes(agentId) : true
    })

    if (configs.length === 0) return

    const emoji = event === 'done' ? '✅' : event === 'failed' ? '❌' : '🧠'
    const fullMessage = `${emoji} ${message}`

    await Promise.allSettled(
      configs.map(config => sendNotification(config, fullMessage, title, agentName))
    )
  } catch {
    // Silent fail — notification should never block mission execution
  }
}

// Re-export sendNotification for use in route handler
export { sendNotification, type NotifyConfig }
