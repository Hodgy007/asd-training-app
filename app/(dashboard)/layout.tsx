'use client'

import { useState, Suspense } from 'react'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'
import { Sidebar } from '@/components/layout/sidebar'
import { SuperAdminSidebar } from '@/components/layout/super-admin-sidebar'
import { OrgAdminSidebar } from '@/components/layout/org-admin-sidebar'
import { Topbar } from '@/components/layout/topbar'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { useSidebarCollapse } from '@/lib/use-sidebar-collapse'
import { isCharityLevel } from '@/lib/rbac'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, toggleCollapsed] = useSidebarCollapse()
  const pathname = usePathname()
  const { data: session, status } = useSession()

  if (status === 'unauthenticated') {
    redirect('/login')
  }

  // Redirect admin roles to their portals — except when previewing training or
  // library content as a learner sees it, or viewing the shared /home page.
  const isSharedHome = pathname === '/home' || pathname.startsWith('/home/')
  const isPreview =
    pathname.startsWith('/training') ||
    pathname.startsWith('/careers') ||
    pathname.startsWith('/library') ||
    isSharedHome
  if (status === 'authenticated') {
    // CHARITY_EMPLOYEE is grouped with SUPER_ADMIN throughout middleware and
    // rbac; it needs the same backstop here or it is the one admin role with
    // no client-side guard if the middleware's leafOnlyPaths list ever drifts.
    if (isCharityLevel(session) && !isPreview) redirect('/super-admin')
    if (session?.user?.role === 'ORG_ADMIN' && !isSharedHome) redirect('/admin')
  }

  // The shared /home page lives in this route group so all roles can render
  // the same content, but admins should keep their own sidebar — otherwise the
  // nav suddenly switches to the learner one (with Workshops, training links,
  // etc.) the moment they click Home Page.
  // CHARITY_EMPLOYEE belongs with SUPER_ADMIN here — both use the charity
  // sidebar everywhere else, and leaving it out dropped charity employees onto
  // the learner nav with training links they can't follow.
  const role = session?.user?.role
  const SidebarComponent =
    isSharedHome && isCharityLevel(session)
      ? SuperAdminSidebar
      : isSharedHome && role === 'ORG_ADMIN'
        ? OrgAdminSidebar
        : Sidebar

  // All three sidebar variants now support collapse, so the wrapper width
  // tracks the shared collapse state regardless of which one is rendered.
  const desktopSidebarWidth = collapsed ? 'w-16' : 'w-56'

  return (
    <div className="flex h-screen bg-calm-50 dark:bg-slate-900">
      <div
        className={clsx(
          'hidden md:flex flex-shrink-0 flex-col transition-[width] duration-200 ease-in-out',
          desktopSidebarWidth,
        )}
      >
        <Suspense>
          <SidebarComponent collapsed={collapsed} onToggleCollapse={toggleCollapsed} />
        </Suspense>
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-72">
            <Suspense><SidebarComponent onClose={() => setSidebarOpen(false)} mobile /></Suspense>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
