'use client'

import { useCallback, useEffect, useState, Suspense } from 'react'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'
import { Sidebar } from '@/components/layout/sidebar'
import { SuperAdminSidebar } from '@/components/layout/super-admin-sidebar'
import { OrgAdminSidebar } from '@/components/layout/org-admin-sidebar'
import { Topbar } from '@/components/layout/topbar'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const { data: session, status } = useSession()

  // Restore collapse preference on mount. Stored as a string so the lookup
  // returns null for first-time users (default = expanded).
  useEffect(() => {
    try {
      if (window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true') {
        setCollapsed(true)
      }
    } catch {
      // ignore
    }
  }, [])

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next))
      } catch {
        // ignore
      }
      return next
    })
  }, [])

  if (status === 'unauthenticated') {
    redirect('/login')
  }

  // Redirect admin roles to their portals — except when previewing training/careers
  // content, self-testing CV Builder / Careers Advisor, or viewing the shared /home page.
  const isSharedHome = pathname === '/home' || pathname.startsWith('/home/')
  const isPreview =
    pathname.startsWith('/training') ||
    pathname.startsWith('/careers') ||
    pathname.startsWith('/cv-builder') ||
    pathname.startsWith('/careers-advisor') ||
    pathname.startsWith('/library') ||
    isSharedHome
  if (status === 'authenticated') {
    if (session?.user?.role === 'SUPER_ADMIN' && !isPreview) redirect('/super-admin')
    if (session?.user?.role === 'ORG_ADMIN' && !isSharedHome) redirect('/admin')
  }

  // The shared /home page lives in this route group so all roles can render
  // the same content, but admins should keep their own sidebar — otherwise the
  // nav suddenly switches to the leaf-role one (with Workshops, training links,
  // etc.) the moment they click Home Page. Same idea for charity admins
  // self-testing CV Builder / Careers Advisor.
  const role = session?.user?.role
  const keepAdminSidebar =
    isSharedHome ||
    pathname.startsWith('/cv-builder') ||
    pathname.startsWith('/careers-advisor')
  const SidebarComponent =
    keepAdminSidebar && role === 'SUPER_ADMIN'
      ? SuperAdminSidebar
      : isSharedHome && role === 'ORG_ADMIN'
        ? OrgAdminSidebar
        : Sidebar

  // Only the leaf-role Sidebar supports collapse / a tighter resting width.
  // Admin sidebars keep their existing layout to avoid scope-creep changes.
  const isLeafSidebar = SidebarComponent === Sidebar
  const desktopSidebarWidth = !isLeafSidebar
    ? 'w-64'
    : collapsed
      ? 'w-16'
      : 'w-56'

  return (
    <div className="flex h-screen bg-calm-50 dark:bg-slate-900">
      <div
        className={clsx(
          'hidden md:flex flex-shrink-0 flex-col transition-[width] duration-200 ease-in-out',
          desktopSidebarWidth,
        )}
      >
        <Suspense>
          {isLeafSidebar ? (
            <Sidebar collapsed={collapsed} onToggleCollapse={toggleCollapsed} />
          ) : (
            <SidebarComponent />
          )}
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
