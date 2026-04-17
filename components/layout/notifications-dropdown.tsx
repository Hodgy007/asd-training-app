'use client'

import Link from 'next/link'
import { ClipboardList, Calendar, BookOpen, FileText, ChevronRight, CheckCircle2, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'
import type { NotificationsPayload, NotificationItem, NotificationKind } from '@/lib/notifications'

interface NotificationsDropdownProps {
  data: NotificationsPayload | null
  loading: boolean
  onItemClick: () => void
  onMarkAllSeen: () => void
}

const KIND_META: Record<NotificationKind, { icon: typeof ClipboardList; tint: string }> = {
  survey: { icon: ClipboardList, tint: 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300' },
  workshop: { icon: Calendar, tint: 'bg-sage-100 text-sage-700 dark:bg-sage-900/40 dark:text-sage-300' },
  module: { icon: BookOpen, tint: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  library: { icon: FileText, tint: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
}

function ItemRow({ item, onClick }: { item: NotificationItem; onClick: () => void }) {
  const { icon: Icon, tint } = KIND_META[item.kind]
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
    >
      <div className={clsx('w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0', tint)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{item.title}</p>
        {item.supporting && (
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{item.supporting}</p>
        )}
      </div>
      <ChevronRight className="h-4 w-4 text-slate-400 mt-2 group-hover:text-slate-600 flex-shrink-0" />
    </Link>
  )
}

export function NotificationsDropdown({ data, loading, onItemClick, onMarkAllSeen }: NotificationsDropdownProps) {
  const forYou = data?.sections.forYou ?? []
  const whatsNew = data?.sections.whatsNew ?? []
  const isEmpty = !loading && forYou.length === 0 && whatsNew.length === 0

  return (
    <div className="flex flex-col max-h-[560px]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Notifications</h3>
        <button
          onClick={onMarkAllSeen}
          className="text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
        >
          Mark all as seen
        </button>
      </div>

      <div className="overflow-y-auto flex-1">
        {loading && (
          <div className="flex items-center justify-center py-10 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}

        {isEmpty && (
          <div className="flex flex-col items-center justify-center py-10 text-slate-500 dark:text-slate-400">
            <CheckCircle2 className="h-8 w-8 text-sage-500 mb-2" />
            <p className="text-sm">You&apos;re all caught up.</p>
          </div>
        )}

        {!loading && forYou.length > 0 && (
          <div>
            <div className="px-4 pt-3 pb-1 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 font-semibold">
              For you
            </div>
            {forYou.map((item) => (
              <ItemRow key={`${item.kind}-${item.id}`} item={item} onClick={onItemClick} />
            ))}
          </div>
        )}

        {!loading && whatsNew.length > 0 && (
          <div>
            {forYou.length > 0 && <div className="border-t border-slate-200 dark:border-slate-800 my-1" />}
            <div className="px-4 pt-3 pb-1 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 font-semibold">
              What&apos;s new
            </div>
            {whatsNew.map((item) => (
              <ItemRow key={`${item.kind}-${item.id}`} item={item} onClick={onItemClick} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
