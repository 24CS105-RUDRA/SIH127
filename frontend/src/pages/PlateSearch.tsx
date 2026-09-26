import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useDeferredValue } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMapEvents } from 'react-leaflet'
import { 
  Search, Filter, Calendar, SlidersHorizontal, Play, Pause, 
  Eye, Flag, Plus, MapPin, Clock, AlertTriangle, CheckCircle,
  ChevronLeft, ChevronRight, SkipBack, SkipForward, RotateCcw,
  X, Download, MoreHorizontal
} from 'lucide-react'
import { trajectoryApi, sightingApi } from '../services/apiService'
import clsx from 'clsx'
import { formatDistanceToNow, format } from 'date-fns'
import 'leaflet/dist/leaflet.css'

// Trajectory Map Component
const TrajectoryMap = ({ points, selectedIndex, onPointClick, playing }: any) => {
  const [map, setMap] = useState<any>(null)
  
  useMapEvents({
    moveend: () => {}
  })

  const positions = points.map((p: any) => [p.lat, p.lon])

  return (
    <MapContainer
      ref={setMap}
      center={points.length > 0 ? [points[0].lat, points[0].lon] : [23.08, 72.62]}
      zoom={points.length > 0 ? 11 : 10}
      style={{ height: '100%', width: '100%' }}
      className="rounded-xl"
      scrollWheelZoom={true}
      doubleClickZoom={true}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains="abcd"
        maxZoom={19}
      />
      
      {positions.length > 1 && (
        <Polyline
          positions={positions}
          pathOptions={{
            color: '#0ea5e9',
            weight: 3,
            opacity: 0.8,
            dashArray: '10, 10',
            lineCap: 'round',
            lineJoin: 'round',
          }}
        />
      )}
      
      {points.map((point: any, index: number) => (
        <Marker key={index} position={[point.lat, point.lon]}>
          <div 
            className={clsx(
              'flex flex-col items-center cursor-pointer transition-all duration-200',
              index === selectedIndex && 'scale-125 z-10'
            )}
            onClick={() => onPointClick(index)}
          >
            <div className={clsx(
              'w-8 h-8 rounded-full border-3 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold',
              index === 0 ? 'bg-success-600' : 
              index === points.length - 1 ? 'bg-danger-600' : 'bg-primary-600'
            )}>
              {index + 1}
            </div>
            <span className="text-xs text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-900 px-1.5 py-0.5 rounded shadow mt-1 whitespace-nowrap">
              {point.camera_id}
            </span>
          </div>
        </Marker>
      ))}
    </MapContainer>
  )
}

// Timeline Card Component
const TimelineCard = ({ point, index, onViewSnapshot, onFlag, isSelected }: any) => {
  const confidenceColor = 
    (point.confidence || 0) > 0.8 ? 'text-success-600' :
    (point.confidence || 0) > 0.5 ? 'text-warning-600' : 'text-danger-600'

  return (
    <div className={clsx(
      'border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 transition-all duration-200',
      isSelected ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-200 dark:border-primary-800' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
    )}>
      <div className="flex items-start gap-4">
        <div className={clsx(
          'w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0',
          index === 0 ? 'bg-success-600' : 'bg-primary-600'
        )}>
          {index + 1}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-neutral-400" />
            <span className="font-medium text-neutral-900 dark:text-white">{point.camera_id}</span>
            {point.camera_zone && (
              <span className="badge badge-info">{point.camera_zone}</span>
            )}
          </div>
          
          <div className="flex items-center gap-4 text-sm text-neutral-600 dark:text-neutral-400 mb-2">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {format(new Date(point.timestamp), 'PPpp')}
            </span>
            {point.speed_kmph && (
              <span className="flex items-center gap-1 text-primary-600 dark:text-primary-400">
                <Gauge className="w-4 h-4" />
                {point.speed_kmph.toFixed(1)} km/h
              </span>
            )}
            {point.direction && (
              <span className="flex items-center gap-1">
                <Navigation className="w-4 h-4" />
                {point.direction}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <span className={clsx('font-mono text-sm', confidenceColor)}>
              Confidence: {(point.confidence * 100).toFixed(1)}%
            </span>
            {point.plate_text !== point.plate_text && (
              <span className="badge badge-warning">OCR Corrected</span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => onViewSnapshot(point)}
            className="p-2 rounded-lg text-neutral-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
            title="View Snapshot"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => onFlag(point)}
            className="p-2 rounded-lg text-neutral-500 hover:text-warning-600 hover:bg-warning-50 dark:hover:bg-warning-900/30 transition-colors"
            title="Flag as Incorrect"
          >
            <Flag className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

// Snapshot Modal
const SnapshotModal = ({ isOpen, point, onClose }: any) => {
  if (!isOpen || !point) return null
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => onClose()}>
      <div className="bg-white dark:bg-neutral-900 rounded-xl max-w-3xl max-h-[80vh] w-full mx-4 overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
          <h3 className="font-semibold text-neutral-900 dark:text-white">Snapshot - {point.camera_id}</h3>
          <button onClick={onClose} className="p-2 rounded-lg text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">
          {point.snapshot_url ? (
            <img src={point.snapshot_url} alt="Plate snapshot" className="w-full rounded-lg" />
          ) : (
            <div className="h-64 flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 rounded-lg text-neutral-500">
              No snapshot available
            </div>
          )}
          <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-neutral-500 dark:text-neutral-400 mb-1">Plate</p>
              <p className="font-mono font-medium text-neutral-900 dark:text-white">{point.plate_text}</p>
            </div>
            <div>
              <p className="text-neutral-500 dark:text-neutral-400 mb-1">Time</p>
              <p className="font-medium text-neutral-900 dark:text-white">{format(new Date(point.timestamp), 'PPpp')}</p>
            </div>
            <div>
              <p className="text-neutral-500 dark:text-neutral-400 mb-1">Confidence</p>
              <p className="font-medium text-neutral-900 dark:text-white">{(point.confidence * 100).toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function PlateSearch() {
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery] = useDeferredValue(searchQuery)
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [filters, setFilters] = useState({
    startTime: '',
    endTime: '',
    cameraZone: '',
    confidenceThreshold: 0,
  })
  const [trajectory, setTrajectory] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [selectedPointIndex, setSelectedPointIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [playSpeed, setPlaySpeed] = useState(1)
  const [snapshotModal, setSnapshotModal] = useState<{ open: boolean; point: any }>({ open: false, point: null })

  // Fetch suggestions
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      trajectoryApi.search(debouncedQuery, { limit: 10 })
        .then(res => setSuggestions(res.data))
        .catch(() => setSuggestions([]))
    } else {
      setSuggestions([])
    }
  }, [debouncedQuery])

  // Fetch trajectory
  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setLoading(true)
    try {
      const params: any = {}
      if (filters.startTime) params.start_time = filters.startTime
      if (filters.endTime) params.end_time = filters.endTime
      if (filters.cameraZone) params.camera_zone = filters.cameraZone
      if (filters.confidenceThreshold) params.confidence_threshold = filters.confidenceThreshold
      
      const res = await trajectoryApi.get(searchQuery, params)
      setTrajectory(res.data)
      setSelectedPointIndex(0)
      setPlaying(false)
    } catch (error) {
      console.error('Trajectory fetch failed:', error)
      setTrajectory(null)
    } finally {
      setLoading(false)
    }
  }

  // Playback animation
  useEffect(() => {
    if (!playing || !trajectory || selectedPointIndex >= trajectory.points.length - 1) {
      if (selectedPointIndex >= trajectory?.points?.length - 1) setPlaying(false)
      return
    }
    
    const interval = setInterval(() => {
      setSelectedPointIndex(prev => Math.min(prev + 1, trajectory.points.length - 1))
    }, 1000 / playSpeed)
    
    return () => clearInterval(interval)
  }, [playing, trajectory, selectedPointIndex, playSpeed])

  const handlePointClick = (index: number) => {
    setSelectedPointIndex(index)
    setPlaying(false)
  }

  const handleViewSnapshot = (point: any) => {
    setSnapshotModal({ open: true, point })
  }

  const handleFlag = (point: any) => {
    // TODO: Implement flag API
    alert('Flagged for review')
  }

  if (!trajectory) {
    return (
      <div className="max-w-4xl mx-auto">
        {/* Search Section */}
        <div className="card mb-6">
          <div className="card-header">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">Plate Search & Trajectory Reconstruction</h2>
          </div>
          <div className="card-body">
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="Enter plate number (e.g., GJ01AB1234)..."
                className="w-full pl-12 pr-4 py-3 bg-neutral-100 dark:bg-neutral-800 border-0 rounded-lg text-lg focus:ring-2 focus:ring-primary-500"
                autoFocus
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg overflow-hidden z-10">
                  {suggestions.map((s: any) => (
                    <button
                      key={s.plate}
                      onClick={() => { setSearchQuery(s.plate); setShowSuggestions(false); handleSearch(); }}
                      className="w-full px-4 py-3 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 border-b border-neutral-100 dark:border-neutral-700 last:border-0 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-mono font-medium text-neutral-900 dark:text-white">{s.plate}</p>
                        <p className="text-xs text-neutral-500">Last seen: {s.camera_id} at {new Date(s.last_seen).toLocaleTimeString()}</p>
                      </div>
                      <span className="badge badge-success">{Math.round(s.similarity * 100)}%</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-neutral-400" />
                <input
                  type="datetime-local"
                  value={filters.startTime}
                  onChange={(e) => setFilters({...filters, startTime: e.target.value})}
                  className="input w-48"
                />
                <span className="text-neutral-400">to</span>
                <input
                  type="datetime-local"
                  value={filters.endTime}
                  onChange={(e) => setFilters({...filters, endTime: e.target.value})}
                  className="input w-48"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-neutral-400" />
                <select
                  value={filters.cameraZone}
                  onChange={(e) => setFilters({...filters, cameraZone: e.target.value})}
                  className="input w-40"
                >
                  <option value="">All Zones</option>
                  <option value="Zone-A">Zone A</option>
                  <option value="Zone-B">Zone B</option>
                  <option value="Zone-C">Zone C</option>
                  <option value="Zone-D">Zone D</option>
                  <option value="Zone-E">Zone E</option>
                  <option value="Zone-F">Zone F</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-neutral-400" />
                <label className="text-sm text-neutral-600 dark:text-neutral-400">Confidence: {(filters.confidenceThreshold * 100).toFixed(0)}%</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={filters.confidenceThreshold}
                  onChange={(e) => setFilters({...filters, confidenceThreshold: parseFloat(e.target.value)})}
                  className="w-32 accent-primary-600 h-1.5"
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={loading || !searchQuery.trim()}
                className="btn-primary ml-auto"
              >
                {loading ? 'Searching...' : 'Track Vehicle'}
              </button>
            </div>
          </div>
        </div>

        {/* Empty state */}
        <div className="card text-center py-16">
          <Search className="w-16 h-16 text-neutral-300 dark:text-neutral-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">Search for a vehicle</h3>
          <p className="text-neutral-500 dark:text-neutral-400">Enter a plate number above to reconstruct its trajectory across the city</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
            Trajectory for <span className="font-mono text-primary-600 dark:text-primary-400">{trajectory.plate}</span>
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400">
            {trajectory.sighting_count} sightings • {trajectory.total_distance_km ? `${trajectory.total_distance_km.toFixed(1)} km` : 'N/A'} • 
            Avg speed: {trajectory.avg_speed_kmph ? `${trajectory.avg_speed_kmph.toFixed(1)} km/h` : 'N/A'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary">
            <Plus className="w-4 h-4 mr-2" /> Add to Blacklist
          </button>
          <button className="btn-primary" onClick={() => { setTrajectory(null); setSearchQuery('') }}>
            <RotateCcw className="w-4 h-4 mr-2" /> New Search
          </button>
        </div>
      </div>

{/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map - 2/3 width */}
        <div className="lg:col-span-2">
          <div className="card h-[500px] lg:h-[600px] overflow-hidden relative">
            <TrajectoryMap
              points={trajectory.points}
              selectedIndex={selectedPointIndex}
              onPointClick={handlePointClick}
              playing={playing}
            />
            
            {/* Playback Controls */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-xl rounded-full px-6 py-3 shadow-xl border border-neutral-200 dark:border-neutral-700">
              <button
                onClick={() => setSelectedPointIndex(0)}
                className="p-2 rounded-full text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                title="Restart"
              >
                <SkipBack className="w-5 h-5" />
              </button>
              <button
                onClick={() => setPlaying(!playing)}
                disabled={trajectory.points.length <= 1}
                className="p-3 rounded-full bg-primary-600 text-white hover:bg-primary-700 transition-colors"
              >
                {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setSelectedPointIndex(trajectory.points.length - 1)}
                className="p-2 rounded-full text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                title="Jump to end"
              >
                <SkipForward className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2 ml-2 border-l border-neutral-200 dark:border-neutral-700 pl-2">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">Speed:</span>
                <select
                  value={playSpeed}
                  onChange={(e) => setPlaySpeed(parseFloat(e.target.value))}
                  className="text-sm bg-transparent border-0 text-neutral-700 dark:text-neutral-300 focus:ring-0"
                >
                  <option value={0.5}>0.5x</option>
                  <option value={1}>1x</option>
                  <option value={2}>2x</option>
                  <option value={4}>4x</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline - 1/3 width */}
        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-neutral-900 dark:text-white">Timeline</h3>
            <span className="text-sm text-neutral-500 dark:text-neutral-400">
              {trajectory.points.length} sightings
            </span>
          </div>
          
          {trajectory.points.map((point: any, index: number) => (
            <TimelineCard
              key={index}
              point={point}
              index={index}
              onViewSnapshot={handleViewSnapshot}
              onFlag={handleFlag}
              isSelected={index === selectedPointIndex}
            />
          ))}
        </div>
      </div>

      {/* Snapshot Modal */}
      <SnapshotModal 
        isOpen={snapshotModal.open} 
        point={snapshotModal.point} 
        onClose={() => setSnapshotModal({ open: false, point: null })} 
      />
    </div>
  )
}