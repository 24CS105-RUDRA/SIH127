import type { ReactNode } from 'react'
import { Navigate, Outlet } from 'react-router-dom'

import { useAuthStore } from '../store/useAuthStore'

export function ProtectedRoute({ children }: { children?: ReactNode }) {
  const { isAuthenticated, isHydrated } = useAuthStore()

  // Wait for hydration to complete before checking auth
  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Used both as a layout wrapper (with children) and as a route guard.
  return <>{children ?? <Outlet />}</>
}
