// Shared agent lookup utility — used by execute and orchestra routes

type AgentLike = { name: string; role: string; [key: string]: unknown }

const ROLE_KEYWORDS: Record<string, string[]> = {
  'front': ['front', 'ui', 'react', 'ux'],
  'back': ['back', 'api', 'database', 'server'],
  'qa': ['qa', 'test', 'quality'],
  'devops': ['devops', 'deploy', 'infra', 'docker'],
  'ba': ['analyst', 'business', 'requirement'],
  'tech lead': ['lead', 'architect', 'senior'],
  'pm': ['project', 'manager', 'scrum'],
  'ux': ['ux', 'design', 'ui', 'user experience'],
  'writer': ['writer', 'document', 'technical'],
  'security': ['security', 'devsecops', 'pentest', 'audit'],
  'sre': ['sre', 'platform', 'reliability'],
  'product owner': ['owner', 'po', 'product manager'],
  'sysadmin': ['sysadmin', 'sysop', 'system admin', 'linux', 'server admin'],
  'automation': ['automation', 'automate', 'workflow', 'pipeline'],
}

/**
 * Fuzzy-match an agent name/role string to an agent record.
 * Priority: exact name → partial name → role → keyword group.
 */
export function matchAgent<T extends AgentLike>(agents: T[], agentName: string): T | null {
  const q = agentName.toLowerCase()

  // 1. Exact name
  let match = agents.find(a => a.name.toLowerCase() === q)
  if (match) return match

  // 2. Partial name (either direction)
  match = agents.find(a => a.name.toLowerCase().includes(q) || q.includes(a.name.toLowerCase()))
  if (match) return match

  // 3. Role partial
  match = agents.find(a => a.role.toLowerCase().includes(q) || q.includes(a.role.toLowerCase()))
  if (match) return match

  // 4. Keyword group
  for (const [, kws] of Object.entries(ROLE_KEYWORDS)) {
    if (kws.some(k => q.includes(k))) {
      match = agents.find(a =>
        kws.some(k => a.name.toLowerCase().includes(k) || a.role.toLowerCase().includes(k))
      )
      if (match) return match
    }
  }

  return null
}
