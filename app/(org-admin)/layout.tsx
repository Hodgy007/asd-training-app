'use client'

import { useState } from 'react'
import { clsx } from 'clsx'
import { OrgAdminSidebar } from '@/components/layout/org-admin-sidebar'
import { Topbar } from '@/components/layout/topbar'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { useSidebarCollapse } from '@/lib/use-sidebar-collapse'

export default function OrgAdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, toggleCollapsed] = useSidebarCollapse()
  const { data: session, status } = useSession()

  if (status === 'unauthenticated') redirect('/login')
  if (status === 'authenticated' && session?.user?.role !== 'ORG_ADMIN') redirect('/dashboard')

  return (
    <div className="flex h-screen bg-calm-50 dark:bg-slate-900 overflow-hidden">
      <div
        className={clsx(
          'hidden md:flex flex-shrink-0 flex-col transition-[width] duration-200 ease-in-out',
          collapsed ? 'w-16' : 'w-56',
        )}
      >
        <OrgAdminSidebar collapsed={collapsed} onToggleCollapse={toggleCollapsed} />
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72">
            <OrgAdminSidebar onClose={() => setSidebarOpen(false)} mobile />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
