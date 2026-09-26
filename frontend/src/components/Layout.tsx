import { Outlet, Link, useLocation, NavLink } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { 
  LayoutGrid, Search, MapPin, Bell, Shield, Camera, FileText, Settings, 
  Menu, X, ChevronLeft, ChevronRight, User, LogOut, Sun, Moon, Globe,
  Truck, Activity, AlertTriangle, BarChart2, HelpCircle
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { useAuthStore } from '../store/useAuthStore'
import clsx from 'clsx'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutGrid, description: 'City-wide traffic overview' },
  { name: 'Plate Search', href: '/search', icon: Search, description: 'Track vehicle trajectories' },
  { name: 'Live Map', href: '/map', icon: MapPin, description: 'Real-time camera map' },
  { name: 'Alerts', href: '/alerts', icon: Bell, description: 'Blacklist & anomaly alerts' },
  { name: 'Blacklist', href: '/blacklist', icon: Shield, description: 'Manage watchlisted plates' },
  { name: 'Cameras', href: '/cameras', icon: Camera, description: 'Camera network status' },
  { name: 'Reports', href: '/reports', icon: FileText, description: 'Export analytics reports' },
  { name: 'Settings', href: '/settings', icon: Settings, description: 'System configuration' },
]

export function Layout() {
  const location = useLocation()
  const { sidebarOpen, toggleSidebar, setSidebarOpen, sidebarCollapsed, toggleSidebarCollapse, darkMode, toggleDarkMode, unreadAlerts, clearUnreadAlerts } = useAppStore()
  const { user, logout } = useAuthStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const [sidebarWidth, setSidebarWidth] = useState(true)

  const handleNavClick = (href: string) => {
    if (window.innerWidth < 1024) {
      setMobileMenuOpen(false)
    }
    clearUnreadAlerts()
  }

  const isActive = (href: string) => {
    if (href === '/') return location.pathname === '/'
    return location.pathname.startsWith(href)
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex">
      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed lg:static inset-y-0 left-0 z-50 flex flex-col transition-all duration-300 ease-in-out bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800',
          sidebarCollapsed
            ? 'w-18'
            : 'w-[260px]',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
        onMouseEnter={() => setSidebarWidth(true)}
        onMouseLeave={() => setSidebarWidth(false)}
      >
        {/* Logo Section */}
        <div className={clsx(
          'flex items-center justify-between h-16 px-4 border-b border-neutral-200 dark:border-neutral-800 transition-all duration-300',
          sidebarCollapsed && 'justify-center px-0'
        )}>
          {!sidebarCollapsed && (
            <Link 
              to="/" 
              className="flex items-center gap-3"
              onClick={() => handleNavClick('/')}
              aria-label="ANPR Analytics Home"
            >
              <div className="w-9 h-9 bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/25">
                <LayoutGrid className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-lg text-neutral-900 dark:text-white truncate">ANPR Analytics</span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 truncate">City Traffic Intelligence</span>
              </div>
            </Link>
          )}
          {sidebarCollapsed && (
            <Link to="/" className="p-2" onClick={() => handleNavClick('/')} aria-label="ANPR Analytics Home">
              <div className="w-9 h-9 bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl flex items-center justify-center mx-auto shadow-lg shadow-primary-500/25">
                <LayoutGrid className="w-5 h-5 text-white" />
              </div>
            </Link>
          )}
          
          {/* Collapse/Expand Toggle */}
          <button
            className={clsx(
              'p-2 rounded-lg transition-colors',
              'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300',
              'hover:bg-neutral-100 dark:hover:bg-neutral-800',
              sidebarCollapsed ? 'lg:hidden' : ''
            )}
            onClick={toggleSidebarCollapse}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!sidebarCollapsed}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
          </button>
          
          {/* Mobile Close Button */}
          <button
            className="lg:hidden p-2 rounded-lg text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto" aria-label="Main navigation">
          {!sidebarCollapsed && (
            <div className="px-3 py-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              MAIN MENU
            </div>
          )}
          {navigation.map((item, index) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => handleNavClick(item.href)}
                className={clsx(
                  'relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950',
                  active
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 shadow-sm shadow-primary-500/10'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white',
                  sidebarCollapsed && 'justify-center px-0'
                )}
                title={sidebarCollapsed ? item.name : undefined}
                aria-current={active ? 'page' : undefined}
                aria-label={item.description}
              >
                <span className={clsx(
                  'w-5 h-5 flex-shrink-0 flex items-center justify-center transition-transform duration-200',
                  active && 'text-primary-600 dark:text-primary-400'
                )}>
                  <Icon className={clsx('w-5 h-5', active && 'text-primary-600 dark:text-primary-400')} />
                </span>
                
                {!sidebarCollapsed && (
                  <>
                    <span className="flex-1 truncate">{item.name}</span>
                    {item.name === 'Alerts' && unreadAlerts > 0 && (
                      <span className={clsx(
                        'flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold',
                        active ? 'bg-primary-600 text-white' : 'bg-danger-500 text-white'
                      )}>
                        {unreadAlerts > 99 ? '99+' : unreadAlerts}
                      </span>
                    )}
                  </>
                )}
                
                {/* Tooltip for collapsed state */}
                {sidebarCollapsed && (
                  <div className="absolute left-full ml-3 px-3 py-2 text-sm font-medium text-neutral-900 dark:text-white bg-white dark:bg-neutral-900 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 whitespace-nowrap z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none">
                    {item.name}
                    <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{item.description}</div>
                  </div>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Quick Actions - Collapsed */}
        {sidebarCollapsed && (
          <div className="p-3 space-y-2 border-t border-neutral-200 dark:border-neutral-800">
            <button 
              className={clsx(
                'w-full p-3 rounded-xl transition-all duration-200',
                'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300',
                'hover:bg-neutral-100 dark:hover:bg-neutral-800',
                'flex flex-col items-center gap-1.5'
              )}
              title="Quick Search"
            >
              <Search className="w-5 h-5" />
              <span className="text-xs">Search</span>
            </button>
            <button 
              className={clsx(
                'w-full p-3 rounded-xl transition-all duration-200',
                'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300',
                'hover:bg-neutral-100 dark:hover:bg-neutral-800',
                'flex flex-col items-center gap-1.5'
              )}
              title="Quick Add to Blacklist"
            >
              <Shield className="w-5 h-5" />
              <span className="text-xs">Blacklist</span>
            </button>
          </div>
        )}

        {/* Footer */}
        <div className={clsx(
          'p-3 border-t border-neutral-200 dark:border-neutral-800 transition-all duration-300',
          sidebarCollapsed ? 'px-0' : 'px-3'
        )}>
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-primary-700 dark:text-primary-300" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                  {user?.name || 'Admin User'}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate capitalize">
                  {user?.role || 'admin'}
                </p>
              </div>
              <button
                onClick={logout}
                className="p-1.5 rounded-lg text-neutral-500 hover:text-danger-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                title="Logout"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={logout}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-neutral-500 hover:text-danger-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                title="Logout"
                aria-label="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-0">
        {/* Top Bar */}
        <header className={clsx(
          'sticky top-0 z-30 h-16 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-xl border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between transition-all duration-300',
          'px-4 lg:px-6'
        )}>
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden p-2 rounded-lg text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            {/* Collapse Toggle for Desktop */}
            <button
              className="hidden lg:flex p-2 rounded-lg text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              onClick={toggleSidebarCollapse}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
            
            {/* Global Search */}
            <div className="hidden lg:block relative w-72 lg:w-80 xl:w-96">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-neutral-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search plate, camera, alert..."
                  className="w-full pl-11 pr-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 border-0 rounded-xl text-sm text-neutral-900 dark:text-white placeholder-neutral-500 focus:ring-2 focus:ring-primary-500 focus:bg-white dark:focus:bg-neutral-900 transition-all duration-200"
                  aria-label="Global search"
                />
                <kbd className="hidden sm:inline-flex absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 text-xs font-mono text-neutral-400 bg-neutral-200 dark:bg-neutral-700 rounded">
                  ⌘K
                </kbd>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* System Status */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-success-50 dark:bg-success-900/30 rounded-full">
              <span className="w-2 h-2 bg-success-500 rounded-full animate-pulse" aria-hidden="true" />
              <span className="text-xs font-medium text-success-700 dark:text-success-400">All Systems Operational</span>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2.5 rounded-xl text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>

            {/* Notifications */}
            <div className="relative">
              <button className="relative p-2.5 rounded-xl text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors" aria-label="Notifications">
                <Bell className="w-5 h-5" />
                {unreadAlerts > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-5 bg-danger-500 text-white text-xs font-semibold rounded-full flex items-center justify-center px-1.5 animate-pulse">
                    {unreadAlerts > 99 ? '99+' : unreadAlerts}
                  </span>
                )}
              </button>
            </div>

            {/* User Menu */}
            <div className="relative">
              <button className="flex items-center gap-3 p-1.5 pr-3 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors" aria-label="User menu" aria-expanded="false" aria-haspopup="true">
                <div className="w-9 h-9 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-primary-700 dark:text-primary-300" />
                </div>
                <div className="hidden md:block text-left min-w-0">
                  <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                    {user?.name || 'Admin User'}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate capitalize">
                    {user?.role || 'admin'}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400 hidden md:block" />
              </button>
              
              {/* User Dropdown */}
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-lg py-1 z-50 animate-scale-in">
                <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-700">
                  <p className="text-sm font-medium text-neutral-900 dark:text-white">{user?.name || 'Admin User'}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">{user?.email || 'admin@anpr.local'}</p>
                </div>
                <a href="#" className="dropdown-item">
                  <User className="w-4 h-4" />
                  Profile
                </a>
                <a href="#" className="dropdown-item">
                  <Settings className="w-4 h-4" />
                  Settings
                </a>
                <div className="dropdown-divider" />
                <button onClick={logout} className="dropdown-item w-full text-left text-danger-600 dark:text-danger-400">
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <div className="animate-fade-in animate-slide-up">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}