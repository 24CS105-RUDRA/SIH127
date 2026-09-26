import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Bell, Check, X, AlertTriangle, Shield, Eye, 
  MoreHorizontal, Filter, ChevronDown, ChevronUp,
  BellOff, Send, Flag, Info, AlertCircle, CheckCircle,
  Trash2, Edit
} from 'lucide-react'
import { alertApi, trajectoryApi } from '../services/apiService'
import { formatDistanceToNow, format } from 'date-fns'
import clsx from 'clsx'
import { useNavigate } from 'react-router-dom'

const severityStyles = {
  low: 'badge-neutral',
  medium: 'badge-warning',
  high: 'badge-danger',
  critical: 'badge-danger',
}

const statusStyles = {
  new: 'badge-danger',
  acknowledged: 'badge-warning',
  resolved: 'badge-success',
}

const typeIcons = {
  blacklist_hit: <Shield className="w-4 h-4 text-danger-500" />,
  anomaly: <AlertTriangle className="w-4 h-4 text-warning-500" />,
  system: <Info className="w-4 h-4 text-primary-500" />,
}

const typeLabels = {
  blacklist_hit: 'Blacklist Hit',
  anomaly: 'Route Anomaly',
  system: 'System Alert',
}

export function AlertsCenter() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'all' | 'blacklist' | 'anomaly' | 'system'>('all')
  const [filters, setFilters] = useState({
    status: '',
    severity: '',
    plateText: '',
    cameraId: '',
    startTime: '',
    endTime: '',
  })
  const [showFilters, setShowFilters] = useState(false)
  const [selectedAlerts, setSelectedAlerts] = useState<number[]>([])
  const [expandedAlert, setExpandedAlert] = useState<number | null>(null)

  const { data: alertsData, isLoading, refetch } = useQuery({
    queryKey: ['alerts', activeTab, filters],
    queryFn: () => alertApi.list({
      alert_type: activeTab === 'all' ? undefined : activeTab,
      status: filters.status || undefined,
      severity: filters.severity || undefined,
      plate_text: filters.plateText || undefined,
      camera_id: filters.cameraId || undefined,
      start_time: filters.startTime || undefined,
      end_time: filters.endTime || undefined,
      page: 1,
      page_size: 100,
    }),
    refetchInterval: 10000,
  })

  const acknowledgeMutation = useMutation({
    mutationFn: ({ id, userId }: { id: number; userId: string }) => alertApi.acknowledge(id, userId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['alerts'] }); },
  })

  const resolveMutation = useMutation({
    mutationFn: ({ id, userId, note }: { id: number; userId: string; note?: string }) => 
      alertApi.resolve(id, userId, note),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['alerts'] }); },
  })

  const handleSelectAll = () => {
    if (selectedAlerts.length === alertsData?.data?.alerts?.length) {
      setSelectedAlerts([])
    } else {
      setSelectedAlerts(alertsData?.data?.alerts?.map((a: any) => a.id) || [])
    }
  }

  const handleSelect = (id: number) => {
    setSelectedAlerts(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const handleAcknowledge = (id: number) => {
    acknowledgeMutation.mutate({ id, userId: 'current-user' })
  }

  const handleResolve = (id: number, note?: string) => {
    resolveMutation.mutate({ id, userId: 'current-user', note })
  }

  const handleViewTrajectory = (plate: string) => {
    navigate(`/search`, { state: { plate } })
  }

  const tabs = [
    { id: 'all', label: 'All', count: alertsData?.data?.total },
    { id: 'blacklist', label: 'Blacklist Hits', icon: <Shield className="w-4 h-4" /> },
    { id: 'anomaly', label: 'Route Anomalies', icon: <AlertTriangle className="w-4 h-4" /> },
    { id: 'system', label: 'System Alerts', icon: <Info className="w-4 h-4" /> },
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent" />
      </div>
    )
  }

  const alerts = alertsData?.data?.alerts || []

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Alerts Center</h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            {alertsData?.data?.total || 0} total alerts • {alerts.filter(a => a.status === 'new').length} unread
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={clsx('btn-secondary', showFilters && 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300')}
          >
            <Filter className="w-4 h-4 mr-2" /> Filters
          </button>
          <button className="btn-secondary">
            <BellOff className="w-4 h-4 mr-2" /> Mute Sounds
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="card mb-4">
        <div className="p-4">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={clsx(
                  'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all duration-200',
                  activeTab === tab.id
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                )}
              >
                {tab.icon}
                {tab.label}
                {tab.count !== undefined && (
                  <span className="badge badge-danger">{tab.count}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="card mb-4">
          <div className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-neutral-600 dark:text-neutral-400">Status:</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({...filters, status: e.target.value})}
                  className="input w-40"
                >
                  <option value="">All</option>
                  <option value="new">New</option>
                  <option value="acknowledged">Acknowledged</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-neutral-600 dark:text-neutral-400">Severity:</label>
                <select
                  value={filters.severity}
                  onChange={(e) => setFilters({...filters, severity: e.target.value})}
                  className="input w-40"
                >
                  <option value="">All</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-neutral-600 dark:text-neutral-400">Plate:</label>
                <input
                  type="text"
                  value={filters.plateText}
                  onChange={(e) => setFilters({...filters, plateText: e.target.value})}
                  placeholder="GJ01AB1234"
                  className="input w-48"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-neutral-600 dark:text-neutral-400">Camera:</label>
                <input
                  type="text"
                  value={filters.cameraId}
                  onChange={(e) => setFilters({...filters, cameraId: e.target.value})}
                  placeholder="CAM001"
                  className="input w-40"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-neutral-600 dark:text-neutral-400">From:</label>
                <input
                  type="datetime-local"
                  value={filters.startTime}
                  onChange={(e) => setFilters({...filters, startTime: e.target.value})}
                  className="input w-48"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-neutral-600 dark:text-neutral-400">To:</label>
                <input
                  type="datetime-local"
                  value={filters.endTime}
                  onChange={(e) => setFilters({...filters, endTime: e.target.value})}
                  className="input w-48"
                />
              </div>
              <button
                onClick={() => setFilters({ status: '', severity: '', plateText: '', cameraId: '', startTime: '', endTime: '' })}
                className="btn-secondary text-sm"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedAlerts.length > 0 && (
        <div className="bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800 rounded-xl p-4 mb-4 animate-slide-up">
          <div className="flex items-center justify-between">
            <span className="text-primary-800 dark:text-primary-200 font-medium">
              {selectedAlerts.length} alert(s) selected
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => selectedAlerts.forEach(id => handleAcknowledge(id))}
                disabled={acknowledgeMutation.isPending}
                className="btn-secondary btn-sm"
              >
                Acknowledge All
              </button>
              <button
                onClick={() => { /* bulk resolve */ }}
                className="btn-primary btn-sm"
              >
                Resolve All
              </button>
              <button
                onClick={() => setSelectedAlerts([])}
                className="btn-ghost btn-sm text-neutral-500"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alerts Table */}
      <div className="flex-1 card overflow-hidden">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 text-neutral-500 dark:text-neutral-400">
            <Bell className="w-16 h-16 mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No alerts found</h3>
            <p>Try adjusting your filters or time range</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th className="p-3 w-12">
                    <input
                      type="checkbox"
                      checked={selectedAlerts.length === alerts.length && alerts.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                    />
                  </th>
                  <th className="p-3 text-left text-sm font-medium text-neutral-500 dark:text-neutral-400">Time</th>
                  <th className="p-3 text-left text-sm font-medium text-neutral-500 dark:text-neutral-400">Plate</th>
                  <th className="p-3 text-left text-sm font-medium text-neutral-500 dark:text-neutral-400">Camera</th>
                  <th className="p-3 text-left text-sm font-medium text-neutral-500 dark:text-neutral-400">Type</th>
                  <th className="p-3 text-center text-sm font-medium text-neutral-500 dark:text-neutral-400">Severity</th>
                  <th className="p-3 text-center text-sm font-medium text-neutral-500 dark:text-neutral-400">Status</th>
                  <th className="p-3 text-right text-sm font-medium text-neutral-500 dark:text-neutral-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {alerts.map((alert: any) => (
                  <tr
                    key={alert.id}
                    className={clsx(
                      'hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors',
                      alert.status === 'new' && 'bg-danger-50 dark:bg-danger-900/20'
                    )}
                  >
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selectedAlerts.includes(alert.id)}
                        onChange={() => handleSelect(alert.id)}
                        className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                      />
                    </td>
                    <td className="p-3 text-sm text-neutral-900 dark:text-white font-mono">
                      {format(new Date(alert.created_at), 'PPpp')}
                    </td>
                    <td className="p-3">
                      <span className="font-mono font-medium text-neutral-900 dark:text-white">{alert.plate_text}</span>
                      {alert.details?.blacklist_reason && (
                        <span className="badge badge-danger ml-2">{alert.details.blacklist_reason}</span>
                      )}
                    </td>
                    <td className="p-3 text-sm text-neutral-600 dark:text-neutral-300">
                      {alert.camera_id || '—'}
                    </td>
                    <td className="p-3">
                      <span className="flex items-center gap-1 text-sm">
                        {typeIcons[alert.alert_type as keyof typeof typeIcons]}
                        {typeLabels[alert.alert_type as keyof typeof typeLabels]}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={clsx('badge', severityStyles[alert.severity as keyof typeof severityStyles])}>
                        {alert.severity.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={clsx('badge', statusStyles[alert.status as keyof typeof statusStyles])}>
                        {alert.status.charAt(0).toUpperCase() + alert.status.slice(1)}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleViewTrajectory(alert.plate_text)}
                          className="p-2 rounded-lg text-neutral-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
                          title="View Trajectory"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        {alert.status === 'new' && (
                          <button
                            onClick={() => handleAcknowledge(alert.id)}
                            disabled={acknowledgeMutation.isPending}
                            className="p-2 rounded-lg text-neutral-500 hover:text-success-600 hover:bg-success-50 dark:hover:bg-success-900/30 transition-colors"
                            title="Acknowledge"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        
                        {alert.status !== 'resolved' && (
                          <button
                            onClick={() => handleResolve(alert.id, 'Resolved via dashboard')}
                            disabled={resolveMutation.isPending}
                            className="p-2 rounded-lg text-neutral-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
                            title="Resolve"
                          >
                            <Flag className="w-4 h-4" />
                          </button>
                        )}
                        
                        <button className="p-2 rounded-lg text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4 p-4 border-t border-neutral-200 dark:border-neutral-700">
        <span className="text-sm text-neutral-500 dark:text-neutral-400">
          Showing {alerts.length} of {alertsData?.data?.total || 0} alerts
        </span>
        <div className="flex gap-2">
          <button className="btn-secondary btn-sm" disabled>Previous</button>
          <button className="btn-secondary btn-sm" disabled>Next</button>
        </div>
      </div>
    </div>
  )
}