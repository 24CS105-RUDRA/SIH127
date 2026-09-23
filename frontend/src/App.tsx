import { Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { PlateSearch } from './pages/PlateSearch'
import { LiveMap } from './pages/LiveMap'
import { AlertsCenter } from './pages/AlertsCenter'
import { BlacklistManager } from './pages/BlacklistManager'
import { CameraManager } from './pages/CameraManager'
import { Reports } from './pages/Reports'
import { Settings } from './pages/Settings'
import { Login } from './pages/Login'
import { useAuthStore } from './store/useAuthStore'
import { ProtectedRoute } from './components/ProtectedRoute'

function AppRoutes() {
  const { isAuthenticated } = useAuthStore()
  
  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="search" element={<PlateSearch />} />
        <Route path="map" element={<LiveMap />} />
        <Route path="alerts" element={<AlertsCenter />} />
        <Route path="blacklist" element={<BlacklistManager />} />
        <Route path="cameras" element={<CameraManager />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppRoutes />
    </QueryClientProvider>
  )
}

export default App