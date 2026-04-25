'use client'

import { useState, useEffect, useCallback } from 'react'
import { FolderOpen, FileText, Download, ChevronDown, ChevronRight, RefreshCw, FileDown } from 'lucide-react'
import { clsx } from 'clsx'
import { downloadCsv, escapeCsv } from '../_lib/csv'
import { BackToReports } from '../_components/back-link'

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

function LibCollectionRow({ col, isExpanded, onToggle }: { col: LibCollectionStat; isExpanded: boolean; onToggle: () => void }) {
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
        <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{col.title}</td>
        <td className="px-4 py-3 text-center">
          <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 font-semibold">
            <FileText className="h-3.5 w-3.5" /> {col.documentCount}
          </span>
        </td>
        <td className="px-4 py-3 text-center">
          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
            <Download className="h-3.5 w-3.5" /> {col.totalDownloads}
          </span>
        </td>
      </tr>
      {isExpanded && (
        <tr className="border-b border-calm-100 dark:border-slate-700">
          <td colSpan={4} className="px-6 py-4 bg-calm-50/50 dark:bg-slate-800/30 space-y-3">
            {col.orgBreakdown && col.orgBreakdown.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">By Organisation</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {col.orgBreakdown.map((ob, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white dark:bg-slate-700 rounded-lg px-3 py-2 border border-calm-200 dark:border-slate-600">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate mr-3">{ob.orgName}</span>
                      <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                        <Download className="h-3 w-3" /> {ob.downloads}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {col.documents.length > 0 ? (
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">Documents</p>
                <div className="space-y-1">
                  {col.documents.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-3 bg-white dark:bg-slate-700 rounded-lg px-3 py-2 border border-calm-200 dark:border-slate-600">
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
            ) : (
              <p className="text-xs text-slate-400 dark:text-slate-500 italic">No documents in this collection.</p>
            )}
          </td>
        </tr>
      )}
    </>
  )
}

export default function LibraryReportPage() {
  const [libTotals, setLibTotals] = useState<LibTotals | null>(null)
  const [libCollections, setLibCollections] = useState<LibCollectionStat[]>([])
  const [libLoading, setLibLoading] = useState(true)
  const [expandedLib, setExpandedLib] = useState<string | null>(null)

  const fetchLibraryReport = useCallback(async () => {
    setLibLoading(true)
    try {
      const res = await fetch('/api/super-admin/library/reports')
      if (res.ok) {
        const d = await res.json()
        setLibTotals(d.totals)
        setLibCollections(d.collections)
      }
    } finally {
      setLibLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLibraryReport()
  }, [fetchLibraryReport])

  return (
    <div className="max-w-full space-y-6 animate-page-enter">
      <BackToReports />
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <FolderOpen className="h-6 w-6 text-primary-600 dark:text-primary-400" />
          Document Library Reports
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Downloads across all document collections.
        </p>
      </div>

      {libLoading ? (
        <div className="text-center py-10 text-slate-400">
          <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
          Loading library reports...
        </div>
      ) : (
        <>
          {libTotals && (
            <div className="grid grid-cols-3 gap-4">
              <div className="card text-center">
                <FolderOpen className="h-5 w-5 text-primary-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{libTotals.totalCollections}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Collections</p>
              </div>
              <div className="card text-center">
                <FileText className="h-5 w-5 text-slate-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{libTotals.totalDocuments}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Documents</p>
              </div>
              <div className="card text-center">
                <Download className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{libTotals.totalDownloads}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Downloads</p>
              </div>
            </div>
          )}

          <div className="card overflow-hidden p-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-calm-200 dark:border-slate-700">
              <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">Collections &amp; Downloads</h3>
              <button
                onClick={() => {
                  const rows = ['Collection,Documents,Total Downloads,Org Breakdown']
                  for (const col of libCollections) {
                    const orgBd = col.orgBreakdown.map((o) => `${o.orgName}: ${o.downloads}`).join('; ')
                    rows.push([escapeCsv(col.title), String(col.documentCount), String(col.totalDownloads), escapeCsv(orgBd)].join(','))
                  }
                  downloadCsv('library-report.csv', rows.join('\n'))
                }}
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
                  </tr>
                </thead>
                <tbody className={libCollections.length > 0 ? 'animate-stagger' : ''}>
                  {libCollections.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                        <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        No document collections yet.
                      </td>
                    </tr>
                  ) : (
                    libCollections.map((col) => {
                      const isExpanded = expandedLib === col.id
                      return (
                        <LibCollectionRow key={col.id} col={col} isExpanded={isExpanded} onToggle={() => setExpandedLib(isExpanded ? null : col.id)} />
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
