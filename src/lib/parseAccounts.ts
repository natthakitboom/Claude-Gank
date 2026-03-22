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

export function parseDemoAccounts(text: string): DemoAccount[] {
  // Priority 1: structured block
  const blockMatch = text.match(/---DEMO-ACCOUNTS---\s*([\s\S]*?)\s*---END---/)
  if (blockMatch) {
    try { return JSON.parse(blockMatch[1].trim()) as DemoAccount[] } catch {}
  }

  const accounts: DemoAccount[] = []
  const seen = new Set<string>()
  const lines = text.split('\n')

  let sectionPassword: string | null = null
  let tablePasswordColIdx = -1
  let tableEmailColIdx = -1
  let tableRoleColIdx = -1
  const seenEmails = new Set<string>() // dedup by email (email is unique per user)

  for (const line of lines) {
    // Detect "## Demo Accounts (Password: `demo1234`)" header
    const headerPass = line.match(/demo accounts?.*password[:\s]+`?([^\s`\n,)]+)`?/i)
    if (headerPass) {
      sectionPassword = stripMd(headerPass[1])
      tablePasswordColIdx = -1; tableEmailColIdx = -1; tableRoleColIdx = -1
      continue
    }

    if (line.includes('|')) {
      const cols = line.split('|').map(c => c.trim().toLowerCase().replace(/[*_`]/g, ''))

      // Table header row
      if (cols.some(c => c === 'email' || c === 'role')) {
        tableRoleColIdx     = cols.findIndex(c => c === 'role')
        tableEmailColIdx    = cols.findIndex(c => c === 'email')
        tablePasswordColIdx = cols.findIndex(c => c === 'password' || c === 'pass')
        continue
      }
      // Separator row (---|---)
      if (line.replace(/[\s|:-]/g, '') === '') continue

      // Data row
      if (tableEmailColIdx >= 0) {
        const cells = line.split('|').map(c => stripMd(c))
        const email = cells[tableEmailColIdx]
        if (!email || !email.includes('@')) continue
        if (seenEmails.has(email)) continue
        const role = tableRoleColIdx >= 0 ? cells[tableRoleColIdx] : '—'
        const pass = tablePasswordColIdx >= 0 && cells[tablePasswordColIdx]
          ? cells[tablePasswordColIdx]
          : (sectionPassword || '—')
        const key = `${role}:${email}`
        if (!seen.has(key)) { seen.add(key); seenEmails.add(email); accounts.push({ role, email, password: pass }) }
        continue
      }
    }

    // Inline: - **Role**: `email` / `password`
    const m1 = line.match(/[-*]\s*\*{0,2}([^*:\n]{2,40})\*{0,2}\s*:\s*`?([^\s/|`]+@[^\s/|`]+)`?\s*[/|]\s*`?([^\s/|`\n]+)`?/)
    if (m1) {
      const role = stripMd(m1[1]), email = stripMd(m1[2]), password = stripMd(m1[3])
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
