'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  FolderOpen,
  FileText,
  Download,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  FileDown,
  Building2,
  Eye,
  Users,
} from 'lucide-react'
import { clsx } from 'clsx'
import { downloadCsv, escapeCsv } from '../_lib/csv'
import { BackToReports } from '../_components/back-link'

interface OrgBreakdown {
  orgName: string
  downloads: number
}

interface DocumentStat {
  id: string
  title: string
  fileName: string
  views: number
  downloads: number
}

interface CollectionStat {
  id: string
  title: string
  active: boolean
  targetOrgIds: string[]
  targetRoles: string[]
  documentCount: number
  createdAt: string
  createdBy: string | null
  totalDownloads: number
  orgBreakdown: OrgBreakdown[]
  documents: DocumentStat[]
}

interface Totals {
  totalCollections: number
  activeCollections: number
  totalDocuments: number
  totalDownloads: number
  toolkitViews: number
  toolkitDownloads: number
  anonymousToolkitViews: number
  anonymousToolkitDownloads: number
}

interface Organisation {
  id: string
  name: string
}

interface TopToolkitDocument {
  id: string
  title: string
  fileName: string
  collectionId: string
  collectionTitle: string
  views: number
  downloads: number
  anonymousViews: number
  anonymousDownloads: number
  totalEvents: number
}

function CollectionRow({ col, isExpanded, onToggle }: { col: CollectionStat; isExpanded: boolean; onToggle: () => void }) {
  return (
    <>
      <tr
        className={clsx(
          'border-b border-calm-100 dark:border-slate-700 hover:bg-calm-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer',
          isExpanded && 'bg-calm-50 dark:bg-slate-800/50'
        )}
        onClick={onToggle}
      >
        <td className="px-4 py-3 text-slate-400">
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </td>
        <td className="px-4 py-3">
          <p className="font-medium text-slate-800 dark:text-slate-200">{col.title}</p>
          {col.createdBy && <p className="text-xs text-slate-400 dark:text-slate-500">by {col.createdBy}</p>}
        </td>
        <td className="px-4 py-3 text-center">
          <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 font-semibold">
            <FileText className="h-3.5 w-3.5" />
            {col.documentCount}
          </span>
        </td>
        <td className="px-4 py-3 text-center">
          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
            <Download className="h-3.5 w-3.5" />
            {col.totalDownloads}
          </span>
        </td>
        <td className="px-4 py-3 hidden md:table-cell">
          <span className={clsx(
            'text-xs font-medium px-2 py-0.5 rounded-full',
            col.active
              ? 'bg-sage-100 text-sage-700 dark:bg-sage-900/30 dark:text-sage-400'
              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          )}>
            {col.active ? 'Active' : 'Inactive'}
          </span>
        </td>
        <td className="px-4 py-3 text-xs text-slate-400 dark:text-slate-500 hidden lg:table-cell">
          {new Date(col.createdAt).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </td>
      </tr>

      {isExpanded && (
        <tr className="border-b border-calm-100 dark:border-slate-700">
          <td colSpan={6} className="px-6 py-4 bg-calm-50/50 dark:bg-slate-800/30 space-y-4">
            {col.orgBreakdown.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">
                  Breakdown by Organisation
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {col.orgBreakdown.map((ob, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-white dark:bg-slate-700 rounded-lg px-3 py-2 border border-calm-200 dark:border-slate-600"
                    >
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate mr-3">
                        {ob.orgName}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                        <Download className="h-3 w-3" /> {ob.downloads}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {col.documents.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">
                  Document Stats
                </p>
                <div className="space-y-1">
                  {col.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-3 bg-white dark:bg-slate-700 rounded-lg px-3 py-2 border border-calm-200 dark:border-slate-600"
                    >
                      <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{doc.title}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{doc.fileName}</p>
                      </div>
                      <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                        <Download className="h-3 w-3" /> {doc.downloads}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {col.orgBreakdown.length === 0 && col.documents.length === 0 && (
              <p className="text-xs text-slate-400 dark:text-slate-500 italic">No activity recorded yet.</p>
            )}
          </td>
        </tr>
      )}
    </>
  )
}

export default function LibraryReportPage() {
  const [totals, setTotals] = useState<Totals | null>(null)
  const [collections, setCollections] = useState<CollectionStat[]>([])
  const [orgs, setOrgs] = useState<Organisation[]>([])
  const [topToolkitDocuments, setTopToolkitDocuments] = useState<TopToolkitDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedCollection, setExpandedCollection] = useState<string | null>(null)
  const [filterOrg, setFilterOrg] = useState<string>('')
  const [range, setRange] = useState<'7' | '30' | 'all'>('30')

  const fetchReports = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/super-admin/library/reports?range=${range}`)
      if (res.ok) {
        const data = await res.json()
        setTotals(data.totals)
        setCollections(data.collections)
        setOrgs(data.organisations)
        setTopToolkitDocuments(data.topToolkitDocuments ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [range])

  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  const filteredCollections = filterOrg
    ? collections.filter((c) => c.targetOrgIds.length === 0 || c.targetOrgIds.includes(filterOrg))
    : collections

  const exportCsv = () => {
    const rows = ['Collection,Documents,Total Downloads,Org Breakdown']
    for (const col of filteredCollections) {
      const orgBd = col.orgBreakdown.map((o) => `${o.orgName}: ${o.downloads}`).join('; ')
      rows.push([escapeCsv(col.title), String(col.documentCount), String(col.totalDownloads), escapeCsv(orgBd)].join(','))
    }
    downloadCsv('library-report.csv', rows.join('\n'))
  }

  return (
    <div className="max-w-full space-y-6 animate-page-enter">
      <BackToReports />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FolderOpen className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            Document Library Reports
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Track document downloads across collections and organisations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="input text-sm"
            value={range}
            onChange={(e) => setRange(e.target.value as '7' | '30' | 'all')}
          >
            <option value="7">7 days</option>
            <option value="30">30 days</option>
            <option value="all">All time</option>
          </select>
          <button
            onClick={fetchReports}
            className="p-2 rounded-xl border border-calm-200 dark:border-slate-600 hover:bg-calm-50 dark:hover:bg-slate-700 transition-colors text-slate-500"
            title="Refresh"
          >
            <RefreshCw className={clsx('h-4 w-4', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-3" />
          Loading reports…
        </div>
      ) : (
        <>
          {totals && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-stagger">
              <div className="card text-center">
                <FolderOpen className="h-6 w-6 text-primary-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totals.totalCollections}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Collections</p>
              </div>
              <div className="card text-center">
                <FolderOpen className="h-6 w-6 text-sage-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totals.activeCollections}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Active</p>
              </div>
              <div className="card text-center">
                <FileText className="h-6 w-6 text-slate-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totals.totalDocuments}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Documents</p>
              </div>
              <div className="card text-center">
                <Download className="h-6 w-6 text-emerald-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totals.totalDownloads}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Downloads</p>
              </div>
            </div>
          )}

          {totals && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-stagger">
              <div className="card text-center">
                <Eye className="h-6 w-6 text-blue-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totals.toolkitViews}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Toolkit views</p>
              </div>
              <div className="card text-center">
                <Download className="h-6 w-6 text-primary-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totals.toolkitDownloads}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Toolkit downloads</p>
              </div>
              <div className="card text-center">
                <Users className="h-6 w-6 text-blue-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totals.anonymousToolkitViews}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Anonymous views</p>
              </div>
              <div className="card text-center">
                <Users className="h-6 w-6 text-emerald-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totals.anonymousToolkitDownloads}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Anonymous downloads</p>
              </div>
            </div>
          )}

          <div className="card overflow-hidden p-0">
            <div className="px-4 py-3 border-b border-calm-200 dark:border-slate-700">
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">Top Toolkit Documents</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Public Toolkit views and downloads for the selected range.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-calm-200 dark:border-slate-700 bg-calm-50 dark:bg-slate-800">
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Document title</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Toolkit</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Views</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Downloads</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Anonymous downloads</th>
                  </tr>
                </thead>
                <tbody>
                  {topToolkitDocuments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                        No Toolkit activity recorded for this range.
                      </td>
                    </tr>
                  ) : (
                    topToolkitDocuments.map((doc) => (
                      <tr key={doc.id} className="border-b border-calm-100 dark:border-slate-700">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800 dark:text-slate-200">{doc.title}</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500">{doc.fileName}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{doc.collectionTitle}</td>
                        <td className="px-4 py-3 text-center font-semibold text-blue-600 dark:text-blue-300">{doc.views + doc.anonymousViews}</td>
                        <td className="px-4 py-3 text-center font-semibold text-emerald-600 dark:text-emerald-300">{doc.downloads + doc.anonymousDownloads}</td>
                        <td className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-200">{doc.anonymousDownloads}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Building2 className="h-4 w-4 text-slate-400" />
            <select
              className="input text-sm"
              value={filterOrg}
              onChange={(e) => setFilterOrg(e.target.value)}
            >
              <option value="">All organisations</option>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
            <span className="text-sm text-slate-400 dark:text-slate-500">
              {filteredCollections.length} collection{filteredCollections.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="card overflow-hidden p-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-calm-200 dark:border-slate-700">
              <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">Collections &amp; Downloads</h3>
              <button
                onClick={exportCsv}
                className="flex items-center gap-1.5 text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
              >
                <FileDown className="h-3.5 w-3.5" />
                Export CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-calm-200 dark:border-slate-700 bg-calm-50 dark:bg-slate-800">
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 w-8"></th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Collection</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Docs</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Downloads</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 hidden md:table-cell">Status</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 hidden lg:table-cell">Created</th>
                  </tr>
                </thead>
                <tbody className={filteredCollections.length > 0 ? 'animate-stagger' : ''}>
                  {filteredCollections.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-slate-400 dark:text-slate-500">
                        <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        No collections found.
                      </td>
                    </tr>
                  ) : (
                    filteredCollections.map((col) => {
                      const isExpanded = expandedCollection === col.id
                      return (
                        <CollectionRow
                          key={col.id}
                          col={col}
                          isExpanded={isExpanded}
                          onToggle={() => setExpandedCollection(isExpanded ? null : col.id)}
                        />
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
