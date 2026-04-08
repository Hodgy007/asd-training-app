'use client'

import { TrendingUp } from 'lucide-react'
import { ImpactReachModel } from '@/components/super-admin/impact-reach-model'
import { PlatformCostInsights } from '@/components/super-admin/platform-cost-insights'

export default function ImpactPage() {
  return (
    <div className="max-w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-teal-600 dark:text-teal-400" />
          Impact &amp; Reach
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Live platform usage and national reach projections for autistic young people.
        </p>
      </div>

      <ImpactReachModel />

      <PlatformCostInsights />
    </div>
  )
}
