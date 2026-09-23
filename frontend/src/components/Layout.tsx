import { Outlet, Link, useLocation, NavLink } from 'react-router-dom'
import { useState } from 'react'
import { 
  LayoutGrid, Search, MapPin, Bell, Shield, Camera, FileText, Settings, 
  Menu, X, ChevronLeft, User, LogOut, Sun, Moon, Globe
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { useAuthStore } from '../store/useAuthStore'
import clsx from 'clsx'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutGrid },
  { name: 'Plate Search', href: '/search', icon: Search },
  { name: 'Live Map', href: '/map', icon: MapPin },
  { name: 'Alerts', href: '/alerts', icon: Bell, badge: true },
  { name: 'Blacklist', href: '/blacklist', icon: Shield },
  { name: 'Cameras', href: '/cameras', icon: Camera },
  { name: 'Reports', href: '/reports', icon: FileText },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function Layout() {
  const location = useLocation()
  const { sidebarOpen, toggleSidebar, darkMode, toggleDarkMode, unreadAlerts, clearUnreadAlerts } = useAppStore()
  const { user, logout } = useAuthStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleNavClick = () => {
    if (window.innerWidth < 1024) {
      setMobileMenuOpen(false)
    }
    clearUnreadAlerts()
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg flex">
      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-dark-card border-r border-gray-200 dark:border-dark-border transition-transform duration-300 flex flex-col',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-dark-border">
          <Link to="/" className="flex items-center gap-2" onClick={handleNavClick}>
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <LayoutGrid className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-gray-900 dark:text-white">ANPR Analytics</span>
          </Link>
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.href || 
              (item.href !== '/' && location.pathname.startsWith(item.href))
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={handleNavClick}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="truncate">{item.name}</span>
                {item.badge && unreadAlerts > 0 && (
                  <span className="ml-auto px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
                    {unreadAlerts > 9 ? '9+' : unreadAlerts}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-dark-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-primary-700 dark:text-primary-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {user?.name || 'Admin User'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate capitalize">
                {user?.role || 'admin'}
              </p>
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 bg-white dark:bg-dark-card border-b border-gray-200 dark:border-dark-border flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={toggleSidebar}
            >
              <Menu className="w-5 h-5" />
            </button>
            
            {/* Global search */}
            <div className="hidden md:block relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search plate number..."
                className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border-0 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label={darkMode ? 'Light mode' : 'Dark mode'}
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* System health indicator */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/30 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs font-medium text-green-700 dark:text-green-400">All Systems Operational</span>
            </div>

            {/* Notifications */}
            <button className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              {unreadAlerts > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadAlerts > 9 ? '9+' : unreadAlerts}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}