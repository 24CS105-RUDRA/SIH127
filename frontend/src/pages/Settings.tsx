import { useState } from 'react'
import { 
  User, Bell, Shield, Database, Server, Palette, 
  Key, Globe, Moon, Sun, Save, Check, X,
  Users, Lock, CreditCard, Zap, ArrowLeft,
  Wifi, HardDrive, Cpu, Monitor, Plus, Edit, Trash2
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { useAuthStore } from '../store/useAuthStore'
import clsx from 'clsx'

const tabs = [
  { id: 'general', label: 'General', icon: Server },
  { id: 'thresholds', label: 'Thresholds', icon: Zap },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'users', label: 'Users & Roles', icon: Users },
  { id: 'appearance', label: 'Appearance', icon: Palette },
]

export function Settings() {
  const { darkMode, toggleDarkMode } = useAppStore()
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState('general')
  const [saved, setSaved] = useState(false)

  // Mock settings state
  const [settings, setSettings] = useState({
    // General
    systemName: 'ANPR Traffic Analytics',
    timezone: 'Asia/Kolkata',
    dataRetentionDays: 90,
    autoRefreshInterval: 30,
    
    // Thresholds
    occlusionConfidenceThreshold: 0.7,
    congestionZScoreThreshold: 2.0,
    anomalySpeedThreshold: 120,
    blacklistFuzzyThreshold: 1,
    alertAutoAcknowledgeMinutes: 60,
    
    // Notifications
    emailAlerts: true,
    smsAlerts: false,
    webhookUrl: '',
    criticalOnlyAfterHours: true,
    
    // Users
    users: [
      { id: 1, name: 'Admin User', email: 'admin@anpr.local', role: 'admin', active: true },
      { id: 2, name: 'Traffic Analyst', email: 'analyst@anpr.local', role: 'analyst', active: true },
      { id: 3, name: 'Enforcement Officer', email: 'officer@anpr.local', role: 'officer', active: true },
      { id: 4, name: 'Auditor', email: 'auditor@anpr.local', role: 'auditor', active: true },
    ],
    
    // Appearance
    theme: darkMode ? 'dark' : 'light',
    compactMode: false,
    mapStyle: 'streets',
  })

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleThemeChange = (theme: 'light' | 'dark') => {
    setSettings(prev => ({ ...prev, theme }))
    if (theme !== (darkMode ? 'dark' : 'light')) {
      toggleDarkMode()
    }
  }

  const renderGeneral = () => (
    <div className="space-y-6">
      <div>
        <h4 className="font-medium text-neutral-900 dark:text-white mb-4">System Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">System Name</label>
            <input type="text" value={settings.systemName} onChange={(e) => setSettings(prev => ({...prev, systemName: e.target.value}))} className="input" />
          </div>
          <div>
            <label className="label">Timezone</label>
            <select value={settings.timezone} onChange={(e) => setSettings(prev => ({...prev, timezone: e.target.value}))} className="select">
              <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
              <option value="UTC">UTC</option>
              <option value="America/New_York">America/New_York</option>
            </select>
          </div>
          <div>
            <label className="label">Data Retention (days)</label>
            <input type="number" value={settings.dataRetentionDays} onChange={(e) => setSettings(prev => ({...prev, dataRetentionDays: parseInt(e.target.value)}))} className="input" min="1" max="365" />
          </div>
          <div>
            <label className="label">Auto-refresh Interval (seconds)</label>
            <input type="number" value={settings.autoRefreshInterval} onChange={(e) => setSettings(prev => ({...prev, autoRefreshInterval: parseInt(e.target.value)}))} className="input" min="10" max="300" />
          </div>
        </div>
      </div>
      
      <div className="pt-6 border-t border-neutral-200 dark:border-neutral-700">
        <h4 className="font-medium text-neutral-900 dark:text-white mb-4">System Status</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">PostgreSQL + TimescaleDB</p>
                <p className="text-sm text-neutral-500">Primary database</p>
              </div>
              <span className="badge badge-success">Connected</span>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Redis</p>
                <p className="text-sm text-neutral-500">Cache & Streams</p>
              </div>
              <span className="badge badge-success">Connected</span>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">ML Service</p>
                <p className="text-sm text-neutral-500">YOLOv8 + PaddleOCR</p>
              </div>
              <span className="badge badge-warning">Mock Mode</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderThresholds = () => (
    <div className="space-y-6">
      <div>
        <h4 className="font-medium text-neutral-900 dark:text-white mb-4">ANPR / OCR Thresholds</h4>
        <div className="space-y-4">
          <div className="card">
            <div className="card-body">
              <label className="block text-sm font-medium text-neutral-700 dark:text-gray-300 mb-1">
                OCR Confidence Threshold: {(settings.occlusionConfidenceThreshold * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={settings.occlusionConfidenceThreshold}
                onChange={(e) => setSettings(prev => ({...prev, occlusionConfidenceThreshold: parseFloat(e.target.value)}))}
                className="w-full accent-primary-600 h-1.5"
              />
              <p className="text-sm text-neutral-500 mt-2">Minimum confidence for automatic plate acceptance</p>
            </div>
          </div>
          <div className="card">
            <div className="card-body">
              <label className="block text-sm font-medium text-neutral-700 dark:text-gray-300 mb-1">
                Blacklist Fuzzy Match Threshold: {settings.blacklistFuzzyThreshold}
              </label>
              <input
                type="range"
                min="0"
                max="3"
                step="1"
                value={settings.blacklistFuzzyThreshold}
                onChange={(e) => setSettings(prev => ({...prev, blacklistFuzzyThreshold: parseInt(e.target.value)}))}
                className="w-full accent-primary-600 h-1.5"
              />
              <p className="text-sm text-neutral-500 mt-2">Levenshtein distance for blacklist matching</p>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-neutral-200 dark:border-neutral-700">
        <h4 className="font-medium text-neutral-900 dark:text-white mb-4">Traffic Analytics Thresholds</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card">
            <div className="card-body">
              <label className="block text-sm font-medium text-neutral-700 dark:text-gray-300 mb-1">
                Congestion Z-Score Threshold: {settings.congestionZScoreThreshold.toFixed(1)}
              </label>
              <input
                type="range"
                min="0.5"
                max="5"
                step="0.1"
                value={settings.congestionZScoreThreshold}
                onChange={(e) => setSettings(prev => ({...prev, congestionZScoreThreshold: parseFloat(e.target.value)}))}
                className="w-full accent-primary-600 h-1.5"
              />
              <p className="text-sm text-neutral-500 mt-2">Standard deviations above baseline for congestion</p>
            </div>
          </div>
          <div className="card">
            <div className="card-body">
              <label className="block text-sm font-medium text-neutral-700 dark:text-gray-300 mb-1">
                Anomaly Speed Threshold: {settings.anomalySpeedThreshold} km/h
              </label>
              <input
                type="range"
                min="50"
                max="200"
                step="5"
                value={settings.anomalySpeedThreshold}
                onChange={(e) => setSettings(prev => ({...prev, anomalySpeedThreshold: parseInt(e.target.value)}))}
                className="w-full accent-primary-600 h-1.5"
              />
              <p className="text-sm text-neutral-500 mt-2">Speed above which route is flagged as anomaly</p>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-neutral-200 dark:border-neutral-700">
        <h4 className="font-medium text-neutral-900 dark:text-white mb-4">Alert Settings</h4>
        <div className="card">
          <div className="card-body">
            <label className="block text-sm font-medium text-neutral-700 dark:text-gray-300 mb-1">
              Auto-acknowledge after: {settings.alertAutoAcknowledgeMinutes} minutes
            </label>
            <input
              type="range"
              min="5"
              max="240"
              step="5"
              value={settings.alertAutoAcknowledgeMinutes}
              onChange={(e) => setSettings(prev => ({...prev, alertAutoAcknowledgeMinutes: parseInt(e.target.value)}))}
              className="w-full accent-primary-600 h-1.5"
            />
          </div>
        </div>
      </div>
    </div>
  )

  const renderNotifications = () => (
    <div className="space-y-6">
      <div>
        <h4 className="font-medium text-neutral-900 dark:text-white mb-4">Alert Channels</h4>
        <div className="space-y-4">
          <label className="flex items-center justify-between p-4 card rounded-lg cursor-pointer">
            <div>
              <p className="font-medium">Email Notifications</p>
              <p className="text-sm text-neutral-500">Send alert emails to configured recipients</p>
            </div>
            <input
              type="checkbox"
              checked={settings.emailAlerts}
              onChange={(e) => setSettings(prev => ({...prev, emailAlerts: e.target.checked}))}
              className="w-5 h-5 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
            />
          </label>
          <label className="flex items-center justify-between p-4 card rounded-lg cursor-pointer">
            <div>
              <p className="font-medium">SMS Notifications</p>
              <p className="text-sm text-neutral-500">Send critical alerts via SMS (Twilio)</p>
            </div>
            <input
              type="checkbox"
              checked={settings.smsAlerts}
              onChange={(e) => setSettings(prev => ({...prev, smsAlerts: e.target.checked}))}
              className="w-5 h-5 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
            />
          </label>
          <label className="flex items-center justify-between p-4 card rounded-lg cursor-pointer">
            <div>
              <p className="font-medium">Critical Only After Hours</p>
              <p className="text-sm text-neutral-500">Only notify for critical alerts outside business hours</p>
            </div>
            <input
              type="checkbox"
              checked={settings.criticalOnlyAfterHours}
              onChange={(e) => setSettings(prev => ({...prev, criticalOnlyAfterHours: e.target.checked}))}
              className="w-5 h-5 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
            />
          </label>
        </div>
      </div>

      <div className="pt-6 border-t border-neutral-200 dark:border-neutral-700">
        <h4 className="font-medium text-neutral-900 dark:text-white mb-4">Webhook Integration</h4>
        <div className="card">
          <div className="card-body">
            <label className="label">Webhook URL</label>
            <input
              type="url"
              value={settings.webhookUrl}
              onChange={(e) => setSettings(prev => ({...prev, webhookUrl: e.target.value}))}
              placeholder="https://your-webhook-endpoint.com/alerts"
              className="input"
            />
            <p className="text-sm text-neutral-500 mt-2">Receive real-time alert notifications via HTTP POST</p>
          </div>
        </div>
      </div>
    </div>
  )

  const renderUsers = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-neutral-900 dark:text-white">User Management</h4>
        <button className="btn-primary btn-sm"><Plus className="w-4 h-4 mr-2" /> Add User</button>
      </div>
      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th className="p-3 text-left text-sm font-medium text-neutral-500">Name</th>
              <th className="p-3 text-left text-sm font-medium text-neutral-500">Email</th>
              <th className="p-3 text-left text-sm font-medium text-neutral-500">Role</th>
              <th className="p-3 text-center text-sm font-medium text-neutral-500">Status</th>
              <th className="p-3 text-right text-sm font-medium text-neutral-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {settings.users.map((u: any) => (
              <tr key={u.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                <td className="p-3 font-medium">{u.name}</td>
                <td className="p-3 text-neutral-600 dark:text-neutral-300">{u.email}</td>
                <td className="p-3">
                  <span className={clsx('badge', 
                    u.role === 'admin' && 'badge-danger',
                    u.role === 'analyst' && 'badge-info',
                    u.role === 'officer' && 'badge-success',
                    u.role === 'auditor' && 'badge-neutral'
                  )}>{u.role}</span>
                </td>
                <td className="p-3 text-center">
                  <span className={clsx('badge', u.active ? 'badge-success' : 'badge-neutral')}>
                    {u.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <button className="p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded"><Edit className="w-4 h-4" /></button>
                  <button className="p-2 text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-900/30 rounded"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  const renderAppearance = () => (
    <div className="space-y-6">
      <div>
        <h4 className="font-medium text-neutral-900 dark:text-white mb-4">Theme</h4>
        <div className="grid grid-cols-2 gap-4">
          {['light', 'dark'].map(theme => (
            <button
              key={theme}
              onClick={() => handleThemeChange(theme as 'light' | 'dark')}
              className={clsx(
                'p-6 rounded-xl border-2 transition-all',
                settings.theme === theme
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                  : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'
              )}
            >
              <div className="flex items-center gap-3">
                <div className={clsx('p-3 rounded-lg', theme === 'light' ? 'bg-white border border-neutral-200' : 'bg-neutral-800 border border-neutral-600')}>
                  {theme === 'light' ? <Sun className="w-6 h-6 text-yellow-500" /> : <Moon className="w-6 h-6 text-blue-400" />}
                </div>
                <div>
                  <p className="font-medium capitalize">{theme}</p>
                  <p className="text-sm text-neutral-500">{theme === 'light' ? 'Light theme' : 'Dark theme'}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="pt-6 border-t border-neutral-200 dark:border-neutral-700">
        <h4 className="font-medium text-neutral-900 dark:text-white mb-4">Display Options</h4>
        <div className="space-y-4">
          <label className="flex items-center justify-between p-4 card rounded-lg">
            <div>
              <p className="font-medium">Compact Mode</p>
              <p className="text-sm text-neutral-500">Reduce spacing for more data density</p>
            </div>
            <input
              type="checkbox"
              checked={settings.compactMode}
              onChange={(e) => setSettings(prev => ({...prev, compactMode: e.target.checked}))}
              className="w-5 h-5 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
            />
          </label>
          <div className="card">
            <div className="card-body">
              <label className="label">Map Style</label>
              <select value={settings.mapStyle} onChange={(e) => setSettings(prev => ({...prev, mapStyle: e.target.value}))} className="select w-64">
                <option value="streets">Streets</option>
                <option value="satellite">Satellite</option>
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderContent = () => {
    switch (activeTab) {
      case 'general': return renderGeneral()
      case 'thresholds': return renderThresholds()
      case 'notifications': return renderNotifications()
      case 'users': return renderUsers()
      case 'appearance': return renderAppearance()
      default: return renderGeneral()
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Settings</h1>
          <p className="text-neutral-500 dark:text-neutral-400">Configure system preferences and thresholds</p>
        </div>
        <div className="flex items-center gap-2">
          {saved && <span className="text-success-600 dark:text-success-400 text-sm font-medium flex items-center gap-1"><Check className="w-4 h-4" /> Saved</span>}
          <button onClick={handleSave} className="btn-primary" disabled={saved}>
            <Save className="w-4 h-4 mr-2" /> {saved ? 'Saved' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="card mb-6">
        <div className="p-2">
          <div className="flex gap-1">
            {tabs.map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={clsx(
                    'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200',
                    activeTab === tab.id
                      ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                      : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        <div className="card">
          {renderContent()}
        </div>
      </div>
    </div>
  )
}