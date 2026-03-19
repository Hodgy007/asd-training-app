import Link from 'next/link'
import { differenceInYears, differenceInMonths, formatDistanceToNow } from 'date-fns'
import { ClipboardList, ChevronRight } from 'lucide-react'

interface ChildCardProps {
  child: {
    id: string
    name: string
    dateOfBirth: Date
    observations?: { domain: string; date: Date }[]
    _count?: { observations: number }
  }
}

function getAgeString(dob: Date): string {
  const years = differenceInYears(new Date(), dob)
  const months = differenceInMonths(new Date(), dob) % 12
  if (years === 0) return `${months} months old`
  if (months === 0) return `${years} years old`
  return `${years}y ${months}m old`
}

const DOMAIN_COLOURS: Record<string, string> = {
  SOCIAL_COMMUNICATION: 'bg-primary-400',
  BEHAVIOUR_AND_PLAY: 'bg-sage-400',
  SENSORY_RESPONSES: 'bg-warm-400',
}

const DOMAIN_LABELS: Record<string, string> = {
  SOCIAL_COMMUNICATION: 'Social',
  BEHAVIOUR_AND_PLAY: 'Behaviour',
  SENSORY_RESPONSES: 'Sensory',
}

export function ChildCard({ child }: ChildCardProps) {
  const age = getAgeString(new Date(child.dateOfBirth))
  const obsCount = child._count?.observations ?? child.observations?.length ?? 0
  const lastObs = child.observations?.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )[0]

  const domainCounts: Record<string, number> = {}
  child.observations?.forEach((obs) => {
    domainCounts[obs.domain] = (domainCounts[obs.domain] || 0) + 1
  })

  return (
    <Link href={`/children/${child.id}`} className="card-hover group block">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-lg font-bold text-primary-700">
              {child.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 group-hover:text-primary-600 transition-colors">
              {child.name}
            </h3>
            <p className="text-sm text-slate-400">{age}</p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-primary-400 transition-colors mt-1" />
      </div>

      <div className="flex items-center gap-2 mb-4">
        <ClipboardList className="h-4 w-4 text-slate-300" />
        <span className="text-sm text-slate-500">
          {obsCount} {obsCount === 1 ? 'observation' : 'observations'}
        </span>
        {lastObs && (
          <span className="text-slate-300">·</span>
        )}
        {lastObs && (
          <span className="text-sm text-slate-400">
            Last {formatDistanceToNow(new Date(lastObs.date), { addSuffix: true })}
          </span>
        )}
      </div>

      {/* Domain breakdown */}
      {Object.keys(domainCounts).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(domainCounts).map(([domain, count]) => (
            <div key={domain} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${DOMAIN_COLOURS[domain] || 'bg-slate-300'}`} />
              <span className="text-xs text-slate-500">
                {DOMAIN_LABELS[domain] || domain} ({count})
              </span>
            </div>
          ))}
        </div>
      )}

      {obsCount === 0 && (
        <div className="bg-calm-50 rounded-xl p-3 mt-2">
          <p className="text-sm text-slate-400">No observations yet. Start tracking today.</p>
        </div>
      )}
    </Link>
  )
}
