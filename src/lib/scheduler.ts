export interface ScheduledJob {
  id: string
  title: string
  description: string
  agent_id: string
  agent_name?: string
  agent_team?: string
  priority: string
  frequency: string       // 'daily' | 'weekdays' | 'weekly' | 'hourly'
  run_time: string | null // 'HH:MM'
  day_of_week: number | null // 0=Sun, 1=Mon, ... 6=Sat
  interval_hours: number | null
  enabled: number
  last_run_at: string | null
  next_run_at: string
  created_at: string
}

const DAY_NAMES = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']

export function calculateNextRun(job: Pick<ScheduledJob, 'frequency' | 'run_time' | 'day_of_week' | 'interval_hours'>): string {
  const now = new Date()

  if (job.frequency === 'hourly' && job.interval_hours) {
    return new Date(now.getTime() + job.interval_hours * 3600000).toISOString()
  }

  if ((job.frequency === 'daily' || job.frequency === 'weekdays') && job.run_time) {
    const [h, m] = job.run_time.split(':').map(Number)
    const next = new Date(now)
    next.setHours(h, m, 0, 0)
    if (next <= now) next.setDate(next.getDate() + 1)

    if (job.frequency === 'weekdays') {
      while (next.getDay() === 0 || next.getDay() === 6) {
        next.setDate(next.getDate() + 1)
      }
    }
    return next.toISOString()
  }

  if (job.frequency === 'weekly' && job.run_time && job.day_of_week !== null) {
    const [h, m] = job.run_time.split(':').map(Number)
    const next = new Date(now)
    next.setHours(h, m, 0, 0)
    let daysUntil = (job.day_of_week - now.getDay() + 7) % 7
    if (daysUntil === 0 && next <= now) daysUntil = 7
    next.setDate(next.getDate() + daysUntil)
    return next.toISOString()
  }

  // fallback
  return new Date(now.getTime() + 3600000).toISOString()
}

export function describeSchedule(job: ScheduledJob): string {
  if (job.frequency === 'hourly') return `ทุก ${job.interval_hours} ชั่วโมง`
  if (job.frequency === 'daily') return `ทุกวัน ${job.run_time} น.`
  if (job.frequency === 'weekdays') return `วันทำการ ${job.run_time} น.`
  if (job.frequency === 'weekly') return `ทุกวัน${DAY_NAMES[job.day_of_week ?? 1]} ${job.run_time} น.`
  return job.frequency
}
