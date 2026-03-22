// Shared helper — parse demo accounts from Phase 4 integration output
// Handles:
//   1. ---DEMO-ACCOUNTS--- JSON block (structured, highest priority)
//   2. "## Demo Accounts (Password: `xxx`)" header + table rows (| Role | Email | Name |)
//   3. Table with password column (| Role | Email | Password |)
//   4. Inline list: - **Role**: `email` / `password`

export interface DemoAccount { role: string; email: string; password: string }

function stripMd(s: string): string {
  return s.replace(/[`*_]/g, '').trim()
}

// Basic email validation — must have local@domain.tld structure
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)
}

function isLikelyRole(s: string): boolean {
  // Allow 2-30 chars, must start with letter, no digits-only
  if (!s || s.length < 2 || s.length > 30) return false
  if (/^\d+$/.test(s)) return false
  return true
}

export function parseDemoAccounts(text: string): DemoAccount[] {
  // Priority 1: structured block
  const blockMatch = text.match(/---DEMO-ACCOUNTS---\s*([\s\S]*?)\s*---END---/)
  if (blockMatch) {
    try { return JSON.parse(blockMatch[1].trim()) as DemoAccount[] } catch {}
  }

  const accounts: DemoAccount[] = []
  const seen = new Set<string>()
  const seenEmails = new Set<string>()
  const lines = text.split('\n')

  let sectionPassword: string | null = null
  let tablePasswordColIdx = -1
  let tableEmailColIdx = -1
  let tableRoleColIdx = -1
  let expectSeparator = false // true after header row, false once separator confirmed

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Detect "## Demo Accounts (Password: `demo1234`)" header
    const headerPass = line.match(/demo accounts?.*password[:\s]+`?([^\s`\n,)]+)`?/i)
    if (headerPass) {
      sectionPassword = stripMd(headerPass[1])
      tablePasswordColIdx = -1; tableEmailColIdx = -1; tableRoleColIdx = -1
      expectSeparator = false
      continue
    }

    if (line.includes('|')) {
      const cols = line.split('|').map(c => c.trim().toLowerCase().replace(/[*_`]/g, ''))

      // Separator row (---|---) — confirms previous line was a real header
      const isSeparator = line.replace(/[\s|:-]/g, '') === ''
      if (isSeparator) {
        expectSeparator = false
        continue
      }

      // Table header row — must contain 'email' column to qualify
      if (!expectSeparator && cols.some(c => c === 'email')) {
        const nextLine = lines[i + 1] || ''
        const nextIsSeparator = nextLine.includes('|') && nextLine.replace(/[\s|:-]/g, '') === ''
        // Require separator on next line to confirm this is a real header
        if (nextIsSeparator || cols.some(c => c === 'role')) {
          tableRoleColIdx     = cols.findIndex(c => c === 'role')
          tableEmailColIdx    = cols.findIndex(c => c === 'email')
          tablePasswordColIdx = cols.findIndex(c => c === 'password' || c === 'pass')
          expectSeparator = true
          continue
        }
      }

      // Data row — only process if we have a confirmed table structure
      if (tableEmailColIdx >= 0 && !expectSeparator) {
        const cells = line.split('|').map(c => stripMd(c))
        if (tableEmailColIdx >= cells.length) continue
        const email = cells[tableEmailColIdx]
        if (!email || !isValidEmail(email)) continue
        if (seenEmails.has(email)) continue
        const role = tableRoleColIdx >= 0 && cells[tableRoleColIdx] ? cells[tableRoleColIdx] : '—'
        if (!isLikelyRole(role) && role !== '—') continue
        const pass = tablePasswordColIdx >= 0 && cells[tablePasswordColIdx]
          ? cells[tablePasswordColIdx]
          : (sectionPassword || '—')
        const key = `${role}:${email}`
        if (!seen.has(key)) { seen.add(key); seenEmails.add(email); accounts.push({ role, email, password: pass }) }
        continue
      }
    } else {
      // Non-table line resets expectSeparator
      expectSeparator = false
    }

    // Inline: - **Role**: `email@x.com` / `password`
    // Role must be recognizable (not generic description text)
    const m1 = line.match(/[-*]\s*\*{0,2}([^*:\n]{2,30})\*{0,2}\s*:\s*`?([^\s/|`]+@[^\s/|`]+\.[^\s/|`]+)`?\s*[/|]\s*`?([^\s/|`\n]+)`?/)
    if (m1) {
      const role = stripMd(m1[1])
      const email = stripMd(m1[2])
      const password = stripMd(m1[3])
      if (!isValidEmail(email)) continue
      if (!isLikelyRole(role)) continue
      if (seenEmails.has(email)) continue
      const key = `${role}:${email}`
      if (!seen.has(key)) { seen.add(key); seenEmails.add(email); accounts.push({ role, email, password }) }
    }
  }

  return accounts
}

export function parseDemoAccountsJson(text: string): string | null {
  const accounts = parseDemoAccounts(text)
  return accounts.length > 0 ? JSON.stringify(accounts) : null
}
