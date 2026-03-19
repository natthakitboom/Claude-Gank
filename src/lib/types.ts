export interface Agent {
  id: string
  name: string
  role: string
  team: string
  model: string
  personality: string
  system_prompt: string
  effort: 'low' | 'normal' | 'high'
  sprite: string
  status: 'idle' | 'working' | 'done' | 'error'
  color: string
  skills_json: string
  created_at: string
  updated_at: string
}

export interface Mission {
  id: string
  title: string
  description: string
  agent_id: string
  status: 'pending' | 'running' | 'done' | 'failed'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  output: string | null
  error: string | null
  tokens_used: number
  created_at: string
  completed_at: string | null
  agent?: Agent
}

export interface Memory {
  id: string
  agent_id: string
  mission_id: string | null
  content: string
  summary: string | null
  importance: number
  tags_json: string
  created_at: string
}

export interface Skill {
  id: string
  name: string
  description: string
  prompt_template: string
  category: string
  icon: string
  usage_count: number
  created_at: string
}

export interface Message {
  id: string
  from_agent: string
  to_agent: string | null
  mission_id: string | null
  type: 'message' | 'task' | 'result' | 'broadcast'
  content: string
  metadata_json: string
  read: number
  created_at: string
}

export type TeamType = 'CORE' | 'TECH' | 'CREATIVE' | 'BUSINESS' | 'FINANCE'

export const TEAM_COLORS: Record<TeamType, string> = {
  CORE: '#8b5cf6',
  TECH: '#3b82f6',
  CREATIVE: '#f59e0b',
  BUSINESS: '#10b981',
  FINANCE: '#06b6d4',
}

export const TEAM_ICONS: Record<TeamType, string> = {
  CORE: '🏛️',
  TECH: '⚡',
  CREATIVE: '🎨',
  BUSINESS: '💼',
  FINANCE: '💰',
}

export const MODEL_LABELS: Record<string, string> = {
  'claude-haiku-4-5-20251001': 'Haiku (Fast)',
  'claude-sonnet-4-6': 'Sonnet (Smart)',
  'claude-opus-4-6': 'Opus (Powerful)',
}
