'use client'

import { useState, useEffect, useCallback } from 'react'
import { Cloud, Database, Download, HardDrive, RefreshCw } from 'lucide-react'
import { clsx } from 'clsx'

// ── Pricing Constants (Vercel Pro + Neon) ──
const BLOB_STORAGE_PER_GB = 0.023
const BLOB_BANDWIDTH_PER_GB = 0.15
const BLOB_READS_PER_10K = 0.004
const NEON_COMPUTE_PER_HOUR = 0.16
const NEON_STORAGE_PER_GB = 0.024
const FUNCTION_PER_MILLION = 0.60
const AVG_DOC_SIZE_MB = 2

interface LibDocStat {
  id: string
  title: string
  fileName: string
  downloads: number
}

interface LibOrgBreakdown {
  orgName: string
  downloads: number
}

interface LibCollectionStat {
  id: string
  title: string
  active: boolean
  documentCount: number
  totalDownloads: number
  orgBreakdown: LibOrgBreakdown[]
  documents: LibDocStat[]
}

interface LibTotals {
  totalCollections: number
  activeCollections: number
  totalDocuments: number
  totalDownloads: number
}

function estimateMonthlyCost(downloads: number, docCount: number, avgSizeMb: number) {
  const bandwidthGb = (downloads * avgSizeMb) / 1024
  const storageGb = (docCount * avgSizeMb) / 1024

  const blobBandwidth = bandwidthGb * BLOB_BANDWIDTH_PER_GB
  const blobStorage = storageGb * BLOB_STORAGE_PER_GB
  const blobRequests = (downloads / 10000) * BLOB_READS_PER_10K
  const blobTotal = blobBandwidth + blobStorage + blobRequests

  const functionCost = (downloads / 1_000_000) * FUNCTION_PER_MILLION
  const neonComputeHours = (downloads * 0.0005) / 3600
  const neonCompute = neonComputeHours * NEON_COMPUTE_PER_HOUR
  const neonStorageGb = (downloads * 0.0005) / 1024
  const neonStorage = neonStorageGb * NEON_STORAGE_PER_GB
  const neonTotal = neonCompute + neonStorage

  return {
    blobBandwidth,
    blobStorage,
    blobRequests,
    blobTotal,
    functionCost,
    neonTotal,
    total: blobTotal + functionCost + neonTotal,
    bandwidthGb,
  }
}

function formatCost(n: number) {
  return n < 0.01 ? '<$0.01' : `$${n.toFixed(2)}`
}

export function PlatformCostInsights() {
  const [libTotals, setLibTotals] = useState<LibTotals | null>(null)
  const [libCollections, setLibCollections] = useState<LibCollectionStat[]>([])
  const [loading, setLoading] = useState(true)
  const [avgSizeMb, setAvgSizeMb] = useState(AVG_DOC_SIZE_MB)
  const [projectedMultiplier, setProjectedMultiplier] = useState(1)

  const fetchLibraryReport = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/super-admin/library/reports')
      if (res.ok) {
        const d = await res.json()
        setLibTotals(d.totals)
        setLibCollections(d.collections)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLibraryReport()
  }, [fetchLibraryReport])

  const currentDownloads = libTotals?.totalDownloads ?? 0
  const docCount = libTotals?.totalDocuments ?? 0
  const projectedDownloads = Math.round(currentDownloads * projectedMultiplier)

  const current = estimateMonthlyCost(currentDownloads, docCount, avgSizeMb)
  const projected = estimateMonthlyCost(projectedDownloads, docCount, avgSizeMb)

  const multiplierOptions = [
    { label: 'Current', value: 1 },
    { label: '2x', value: 2 },
    { label: '5x', value: 5 },
    { label: '10x', value: 10 },
    { label: '50x', value: 50 },
    { label: '100x', value: 100 },
  ]

  const topCollection = [...libCollections].sort((a, b) => b.totalDownloads - a.totalDownloads)[0]

  if (loading) {
    return (
      <div className="text-center py-10 text-slate-400">
        <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
        Loading cost insights...
      </div>
    )
  }

  return (
    <>
      <div className="pt-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Cloud className="h-5 w-5 text-sky-600 dark:text-sky-400" />
          Platform Usage &amp; Cost Insights
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
          Estimated hosting costs based on document library activity. Costs are approximate and based on Vercel Pro + Neon pricing.
        </p>
      </div>

      {/* Controls */}
      <div className="card p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide block mb-1.5">
              Avg document size (MB)
            </label>
            <input
              type="number"
              min={0.1}
              max={100}
              step={0.5}
              value={avgSizeMb}
              onChange={(e) => setAvgSizeMb(Math.max(0.1, Number(e.target.value)))}
              className="w-full px-3 py-2 rounded-lg border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide block mb-1.5">
              Scale projection
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {multiplierOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setProjectedMultiplier(opt.value)}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
                    projectedMultiplier === opt.value
                      ? 'bg-sky-100 text-sky-700 border-sky-300 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-700'
                      : 'bg-white text-slate-600 border-calm-200 hover:bg-calm-50 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-600'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Current stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card text-center">
          <HardDrive className="h-5 w-5 text-sky-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{docCount}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Documents stored</p>
        </div>
        <div className="card text-center">
          <Download className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{currentDownloads.toLocaleString()}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Total downloads</p>
        </div>
        <div className="card text-center">
          <Cloud className="h-5 w-5 text-primary-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{current.bandwidthGb.toFixed(1)} GB</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Est. bandwidth used</p>
        </div>
        <div className="card text-center">
          <Database className="h-5 w-5 text-amber-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{formatCost(current.total)}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Est. monthly cost</p>
        </div>
      </div>

      {/* Cost breakdown table */}
      <div className="card overflow-hidden p-0">
        <div className="px-4 py-3 border-b border-calm-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
            Cost Breakdown
            {projectedMultiplier > 1 && (
              <span className="ml-2 text-sky-600 dark:text-sky-400 font-normal">
                — projected at {projectedMultiplier}x ({projectedDownloads.toLocaleString()} downloads)
              </span>
            )}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-calm-200 dark:border-slate-700 bg-calm-50 dark:bg-slate-800/50">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Service</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Component</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Current</th>
                {projectedMultiplier > 1 && (
                  <th className="text-right px-4 py-3 font-semibold text-sky-600 dark:text-sky-400">Projected</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-calm-100 dark:divide-slate-700">
              <tr>
                <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300 font-medium" rowSpan={3}>
                  <span className="flex items-center gap-1.5"><Cloud className="h-3.5 w-3.5 text-sky-500" /> Vercel Blob</span>
                </td>
                <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">Bandwidth (egress)</td>
                <td className="px-4 py-2.5 text-right text-slate-700 dark:text-slate-300 font-mono text-xs">{formatCost(current.blobBandwidth)}</td>
                {projectedMultiplier > 1 && (
                  <td className="px-4 py-2.5 text-right text-sky-600 dark:text-sky-400 font-mono text-xs">{formatCost(projected.blobBandwidth)}</td>
                )}
              </tr>
              <tr>
                <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">Storage</td>
                <td className="px-4 py-2.5 text-right text-slate-700 dark:text-slate-300 font-mono text-xs">{formatCost(current.blobStorage)}</td>
                {projectedMultiplier > 1 && (
                  <td className="px-4 py-2.5 text-right text-sky-600 dark:text-sky-400 font-mono text-xs">{formatCost(projected.blobStorage)}</td>
                )}
              </tr>
              <tr>
                <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">Read requests</td>
                <td className="px-4 py-2.5 text-right text-slate-700 dark:text-slate-300 font-mono text-xs">{formatCost(current.blobRequests)}</td>
                {projectedMultiplier > 1 && (
                  <td className="px-4 py-2.5 text-right text-sky-600 dark:text-sky-400 font-mono text-xs">{formatCost(projected.blobRequests)}</td>
                )}
              </tr>
              <tr>
                <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300 font-medium">
                  <span className="flex items-center gap-1.5"><Database className="h-3.5 w-3.5 text-amber-500" /> Neon DB</span>
                </td>
                <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">Compute + storage</td>
                <td className="px-4 py-2.5 text-right text-slate-700 dark:text-slate-300 font-mono text-xs">{formatCost(current.neonTotal)}</td>
                {projectedMultiplier > 1 && (
                  <td className="px-4 py-2.5 text-right text-sky-600 dark:text-sky-400 font-mono text-xs">{formatCost(projected.neonTotal)}</td>
                )}
              </tr>
              <tr>
                <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300 font-medium">
                  <span className="flex items-center gap-1.5"><HardDrive className="h-3.5 w-3.5 text-primary-500" /> Vercel Functions</span>
                </td>
                <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">Invocations</td>
                <td className="px-4 py-2.5 text-right text-slate-700 dark:text-slate-300 font-mono text-xs">{formatCost(current.functionCost)}</td>
                {projectedMultiplier > 1 && (
                  <td className="px-4 py-2.5 text-right text-sky-600 dark:text-sky-400 font-mono text-xs">{formatCost(projected.functionCost)}</td>
                )}
              </tr>
              <tr className="bg-calm-50 dark:bg-slate-800/50 font-semibold">
                <td className="px-4 py-3 text-slate-900 dark:text-slate-100" colSpan={2}>Estimated total / month</td>
                <td className="px-4 py-3 text-right text-slate-900 dark:text-slate-100 font-mono">{formatCost(current.total)}</td>
                {projectedMultiplier > 1 && (
                  <td className="px-4 py-3 text-right text-sky-700 dark:text-sky-300 font-mono">{formatCost(projected.total)}</td>
                )}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Top collection callout */}
      {topCollection && topCollection.totalDownloads > 0 && (
        <div className="bg-sky-50 dark:bg-sky-900/20 border-l-4 border-sky-400 rounded-r-lg p-4">
          <p className="text-sm text-sky-800 dark:text-sky-300">
            <strong>Highest usage collection:</strong> &ldquo;{topCollection.title}&rdquo; with{' '}
            {topCollection.totalDownloads.toLocaleString()} downloads across {topCollection.documentCount} documents.
            {projectedMultiplier > 1 && (
              <span className="ml-1">
                At {projectedMultiplier}x scale, blob egress alone would cost ~{formatCost(projected.blobBandwidth)}/month.
              </span>
            )}
          </p>
        </div>
      )}

      {/* Info note */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 rounded-r-lg p-4">
        <p className="text-sm text-amber-800 dark:text-amber-300">
          <strong>Note:</strong> These are estimates based on Vercel Pro + Neon pricing. Actual costs depend on your plan, free tier allowances, and caching.
          Blob egress is the dominant cost driver at scale. Consider CDN cache headers and smaller file formats to reduce bandwidth.
        </p>
      </div>
    </>
  )
}
