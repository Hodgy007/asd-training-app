'use client'

import { useState } from 'react'
import { SuperAdminSidebar } from '@/components/layout/super-admin-sidebar'
import { Topbar } from '@/components/layout/topbar'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { data: session, status } = useSession()

  if (status === 'unauthenticated') redirect('/login')
  if (status === 'authenticated' && session?.user?.role !== 'SUPER_ADMIN') redirect('/dashboard')

  return (
    <div className="flex h-screen bg-calm-50 dark:bg-slate-900 overflow-hidden">
      <div className="hidden md:flex w-64 flex-shrink-0 flex-col">
        <SuperAdminSidebar />
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72">
            <SuperAdminSidebar onClose={() => setSidebarOpen(false)} mobile />
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
