import { startOfWeek, addWeeks, format, isWithinInterval } from 'date-fns'

export type ObservationDomain = 'SOCIAL_COMMUNICATION' | 'BEHAVIOUR_AND_PLAY' | 'SENSORY_RESPONSES'
export type ObservationFrequency = 'RARE' | 'SOMETIMES' | 'OFTEN'

interface Observation {
  id: string
  date: Date
  domain: ObservationDomain
  frequency: ObservationFrequency
  behaviourType: string
  context: string
  notes?: string | null
}

const FREQUENCY_WEIGHT: Record<ObservationFrequency, number> = {
  RARE: 1,
  SOMETIMES: 2,
  OFTEN: 3,
}

export function calculateDomainFrequencies(observations: Observation[]): Record<ObservationDomain, number> {
  const counts: Record<ObservationDomain, number> = {
    SOCIAL_COMMUNICATION: 0,
    BEHAVIOUR_AND_PLAY: 0,
    SENSORY_RESPONSES: 0,
  }

  for (const obs of observations) {
    counts[obs.domain] += FREQUENCY_WEIGHT[obs.frequency]
  }

  return counts
}

export function getDomainLabel(domain: ObservationDomain): string {
  const labels: Record<ObservationDomain, string> = {
    SOCIAL_COMMUNICATION: 'Social Communication',
    BEHAVIOUR_AND_PLAY: 'Behaviour & Play',
    SENSORY_RESPONSES: 'Sensory Responses',
  }
  return labels[domain]
}

export interface WeeklyData {
  week: string
  weekStart: Date
  social: number
  behaviour: number
  sensory: number
  total: number
}

export function groupObservationsByWeek(
  observations: Observation[],
  weeksBack: number = 4
): WeeklyData[] {
  const now = new Date()
  const weeks: WeeklyData[] = []

  for (let i = weeksBack - 1; i >= 0; i--) {
    const weekStart = startOfWeek(addWeeks(now, -i), { weekStartsOn: 1 })
    const weekEnd = addWeeks(weekStart, 1)

    const weekObs = observations.filter((o) =>
      isWithinInterval(new Date(o.date), { start: weekStart, end: weekEnd })
    )

    const domainCounts = { social: 0, behaviour: 0, sensory: 0 }

    for (const obs of weekObs) {
      const weight = FREQUENCY_WEIGHT[obs.frequency]
      if (obs.domain === 'SOCIAL_COMMUNICATION') domainCounts.social += weight
      else if (obs.domain === 'BEHAVIOUR_AND_PLAY') domainCounts.behaviour += weight
      else if (obs.domain === 'SENSORY_RESPONSES') domainCounts.sensory += weight
    }

    weeks.push({
      week: `Week ${weeksBack - i}`,
      weekStart,
      social: domainCounts.social,
      behaviour: domainCounts.behaviour,
      sensory: domainCounts.sensory,
      total: domainCounts.social + domainCounts.behaviour + domainCounts.sensory,
    })
  }

  return weeks
}

export function calculateTrendData(weeklyData: WeeklyData[]): {
  socialTrend: 'increasing' | 'decreasing' | 'stable'
  behaviourTrend: 'increasing' | 'decreasing' | 'stable'
  sensoryTrend: 'increasing' | 'decreasing' | 'stable'
} {
  if (weeklyData.length < 2) {
    return { socialTrend: 'stable', behaviourTrend: 'stable', sensoryTrend: 'stable' }
  }

  const first = weeklyData[0]
  const last = weeklyData[weeklyData.length - 1]

  const getTrend = (firstVal: number, lastVal: number) => {
    const diff = lastVal - firstVal
    if (diff > 1) return 'increasing' as const
    if (diff < -1) return 'decreasing' as const
    return 'stable' as const
  }

  return {
    socialTrend: getTrend(first.social, last.social),
    behaviourTrend: getTrend(first.behaviour, last.behaviour),
    sensoryTrend: getTrend(first.sensory, last.sensory),
  }
}

export function hasReachedPatternThreshold(
  observations: Observation[],
  domain: ObservationDomain,
  minCount: number = 3
): boolean {
  const domainObs = observations.filter((o) => o.domain === domain)
  const oftenCount = domainObs.filter((o) => o.frequency === 'OFTEN').length
  const sometimesCount = domainObs.filter((o) => o.frequency === 'SOMETIMES').length

  // Threshold: 3+ 'often' or 5+ combined 'often'/'sometimes'
  return oftenCount >= minCount || oftenCount + sometimesCount >= minCount + 2
}

export function getObservationsByDomain(
  observations: Observation[]
): Record<ObservationDomain, Observation[]> {
  return {
    SOCIAL_COMMUNICATION: observations.filter((o) => o.domain === 'SOCIAL_COMMUNICATION'),
    BEHAVIOUR_AND_PLAY: observations.filter((o) => o.domain === 'BEHAVIOUR_AND_PLAY'),
    SENSORY_RESPONSES: observations.filter((o) => o.domain === 'SENSORY_RESPONSES'),
  }
}

export function formatObservationDate(date: Date): string {
  return format(new Date(date), 'dd MMM yyyy')
}

export function getRecentObservations(observations: Observation[], days: number = 28): Observation[] {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return observations.filter((o) => new Date(o.date) >= cutoff)
}
