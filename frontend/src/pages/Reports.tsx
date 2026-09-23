import { useState } from 'react'
import { 
  FileText, Download, Calendar, Clock, 
  TrendingUp, AlertTriangle, Shield, MapPin,
  RefreshCw, ChevronDown
} from 'lucide-react'
import { reportApi } from '../services/apiService'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import clsx from 'clsx'

const reportTypes = [
  { id: 'daily_summary', name: 'Daily Traffic Summary', icon: FileText, description: 'Overall traffic statistics, density, O-D matrix, and congestion for a day' },
  { id: 'trajectory', name: 'Trajectory Report', icon: MapPin, description: 'Complete trajectory for a specific plate with timestamps and speeds' },
  { id: 'alert_log', name: 'Alert Log', icon: AlertTriangle, description: 'All alerts with filtering by severity, type, and time range' },
  { id: 'congestion', name: 'Congestion Analysis', icon: TrendingUp, description: 'Detailed congestion analysis with z-scores and speed data' },
]

export function Reports() {
  const [selectedType, setSelectedType] = useState('daily_summary')
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 1), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd'),
  })
  const [plate, setPlate] = useState('')
  const [formatType, setFormatType] = useState<'csv' | 'json'>('csv')
  const [generating, setGenerating] = useState(false)
  const [lastGenerated, setLastGenerated] = useState<string | null>(null)

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      let blob: Blob
      const start = new Date(dateRange.start + 'T00:00:00')
      const end = new Date(dateRange.end + 'T23:59:59')

      switch (selectedType) {
        case 'daily_summary':
          blob = await reportApi.dailySummary(format(start, 'yyyy-MM-dd'), formatType)
          break
        case 'trajectory':
          if (!plate.trim()) { alert('Please enter a plate number'); setGenerating(false); return }
          blob = await reportApi.trajectory(plate, start.toISOString(), end.toISOString(), formatType)
          break
        case 'alert_log':
          blob = await reportApi.alerts(start.toISOString(), end.toISOString(), undefined, formatType)
          break
        case 'congestion':
          blob = await reportApi.congestion(start.toISOString(), end.toISOString(), formatType)
          break
        default:
          return
      }

      // Download the blob
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const timestamp = format(new Date(), 'yyyyMMdd_HHmmss')
      const typeNames: Record<string, string> = {
        daily_summary: 'daily_summary',
        trajectory: `trajectory_${plate}`,
        alert_log: 'alerts',
        congestion: 'congestion',
      }
      a.download = `${typeNames[selectedType]}_${timestamp}.${formatType}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setLastGenerated(format(new Date(), 'PPpp'))
    } catch (error) {
      console.error('Report generation failed:', error)
      alert('Failed to generate report')
    } finally {
      setGenerating(false)
    }
  }

  const currentType = reportTypes.find(t => t.id === selectedType)

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
          <p className="text-gray-500 dark:text-gray-400">Generate and export traffic analytics reports</p>
        </div>
      </div>

      {/* Report Type Selector */}
      <div className="card mb-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Select Report Type</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {reportTypes.map(type => {
            const Icon = type.icon
            const isSelected = selectedType === type.id
            return (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={clsx(
                  'p-4 rounded-xl border-2 transition-all text-left',
                  isSelected
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={clsx(
                    'p-3 rounded-lg',
                    isSelected ? 'bg-primary-100 dark:bg-primary-900/50' : 'bg-gray-100 dark:bg-gray-800'
                  )}>
                    <Icon className={clsx('w-5 h-5', isSelected ? 'text-primary-600' : 'text-gray-600')} />
                  </div>
                  <div className="flex-1">
                    <h4 className={clsx('font-medium', isSelected ? 'text-primary-700 dark:text-primary-300' : 'text-gray-900 dark:text-white')}>
                      {type.name}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{type.description}</p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Report Configuration */}
      <div className="card mb-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Configure Report</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Date Range */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date Range</label>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                  className="input"
                  max={format(new Date(), 'yyyy-MM-dd')}
                />
              </div>
              <label className="block text-xs text-gray-500 mb-1">End Date</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                className="input"
                max={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
          </div>

          {/* Format */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Format</label>
            <select value={formatType} onChange={(e) => setFormatType(e.target.value as 'csv' | 'json')} className="input">
              <option value="csv">CSV (Excel compatible)</option>
              <option value="json">JSON</option>
            </select>
          </div>

          {/* Plate input for trajectory */}
          {selectedType === 'trajectory' && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Plate Number</label>
              <input
                type="text"
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
                placeholder="GJ01AB1234"
                className="input text-uppercase"
              />
            </div>
          )}
        </div>
      </div>

      {/* Generate Button */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <button
              onClick={handleGenerate}
              disabled={generating || (selectedType === 'trajectory' && !plate.trim())}
              className="btn-primary btn-lg"
            >
              {generating ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  Generating...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  Generate & Download {formatType.toUpperCase()}
                </span>
              )}
            </button>
            {lastGenerated && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Last generated: {lastGenerated}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Report Preview / Info */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Report Preview</h3>
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6">
          <div className="font-mono text-sm text-gray-700 dark:text-gray-300 space-y-1">
            <div>> Report: {currentType?.name}</div>
            <div>> Period: {format(new Date(dateRange.start), 'PP')} - {format(new Date(dateRange.end), 'PP')}</div>
            <div>> Format: {formatType.toUpperCase()}</div>
            {selectedType === 'trajectory' && plate && <div>> Plate: {plate}</div>}
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <span className="text-green-600 dark:text-green-400">></span> Ready to generate
            </div>
          </div>
        </div>
      </div>

      {/* Recent Reports */}
      <div className="card mt-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Recent Reports</h3>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No recent reports. Generate your first report above.</p>
        </div>
      </div>
    </div>
  )
}