import { useEffect, useState, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, CircleMarker, Popup, useMapEvents } from 'react-leaflet'
import { useQuery } from '@tanstack/react-query'
import { 
  Truck, Camera, AlertTriangle, Gauge, 
  ChevronDown, Download, RefreshCw, Layers,
  MapPin, Activity, TrendingUp, TrendingDown,
  LayoutGrid, SlidersHorizontal
} from 'lucide-react'
import { 
  analyticsApi, cameraApi, alertApi 
} from '../services/apiService'
import { useAppStore } from '../store/useAppStore'
import { KPICard } from '../components/KPICard'
import { DensityChart } from '../components/DensityChart'
import { ODMatrixHeatmap } from '../components/ODMatrixHeatmap'
import { CongestionTable } from '../components/CongestionTable'
import { SpeedChart } from '../components/SpeedChart'
import clsx from 'clsx'
import 'leaflet/dist/leaflet.css'

// Camera marker component with custom icon
const CameraMarker = ({ camera, onClick, isSelected }: any) => {
  const statusColors = {
    online: '#22c55e',
    offline: '#94a3b8',
    alerting: '#ef4444'
  }
  
  return (
    <Marker position={[camera.lat, camera.lon]} onClick={onClick}>
      <div className="flex flex-col items-center">
        <div className={clsx(
          'w-5 h-5 rounded-full border-2 border-white dark:border-slate-950 shadow-lg transition-all duration-200',
          isSelected && 'scale-125 ring-2 ring-primary-500'
        )} style={{ backgroundColor: statusColors[camera.status as keyof typeof statusColors] }}>
        </div>
        <span className="text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded shadow whitespace-nowrap">
          {camera.camera_id}
        </span>
      </div>
    </Marker>
  )
}

// Heatmap layer
const HeatmapCircles = ({ cells, intensity }: { cells: any[]; intensity: number }) => {
  return (
    <>
      {cells.map((cell, index) => (
        <CircleMarker
          key={index}
          center={[cell.lat, cell.lon]}
          radius={Math.max(3, Math.min(40, cell.vehicle_count * intensity * 1.5))}
          pathOptions={{
            color: 'rgba(59, 130, 246, 0.8)',
            fillColor: 'rgba(59, 130, 246, 0.3)',
            weight: 1,
          }}
        >
          <Popup>
            <div className="p-1">
              <strong>Vehicles: {cell.vehicle_count}</strong>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </>
  )
}

// Congestion markers
const CongestionMarkers = ({ data }: { data: any[] }) => {
  const colors = {
    normal: '#22c55e',
    watch: '#f59e0b',
    congested: '#ef4444'
  }
  
  return (
    <>
      {data.map((item, index) => (
        <Marker key={index} position={[item.lat, item.lon]}>
          <div className="flex flex-col items-center">
            <div className={clsx(
              'w-6 h-6 rounded-full border-2 border-white shadow-lg animate-pulse flex items-center justify-center'
            )} style={{ backgroundColor: colors[item.congestion_level as keyof typeof colors] }}>
              <span className="text-white text-xs font-bold">!</span>
            </div>
            <span className="text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded shadow whitespace-nowrap">
              {item.camera_id}
            </span>
          </div>
        </Marker>
      ))}
    </>
  )
}

// Map Events component for useMapEvents hook
const MapEventsComponent = () => {
  useMapEvents({
    moveend: () => {}
  })
  return null
}

// Map View Component
const MapView = ({ cameras, heatmapCells, showHeatmap, showCameras, showCongestion, onCameraClick, selectedCamera }: any) => {
  const [map, setMap] = useState<any>(null)
  
  return (
    <MapContainer
      ref={setMap}
      center={[23.08, 72.62]}
      zoom={10}
      style={{ height: '100%', width: '100%', zIndex: 0 }}
      className="rounded-xl"
      scrollWheelZoom={true}
      doubleClickZoom={true}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains="abcd"
        maxZoom={19}
      />
      
      <MapEventsComponent />
      
      {showHeatmap && heatmapCells.length > 0 && (
        <HeatmapCircles cells={heatmapCells} />
      )}
      
      {showCongestion && (
        <CongestionMarkers data={congestionData} />
      )}
      
      {showCameras && cameras.map((camera: any) => (
        <CameraMarker
          key={camera.camera_id}
          camera={camera}
          onClick={() => onCameraClick(camera)}
          isSelected={selectedCamera === camera.camera_id}
        />
      ))}
    </MapContainer>
  )
}

export function Dashboard() {
  const { timeRange, mapLayers, setMapLayer, selectedCamera, setSelectedCamera } = useAppStore()
  const [cameraDetails, setCameraDetails] = useState<any>(null)
  const [heatmapIntensity, setHeatmapIntensity] = useState(1)
  
  // Fetch data
  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ['kpis', timeRange],
    queryFn: () => analyticsApi.kpis(),
    refetchInterval: 30000,
  })
  
  const { data: density, isLoading: densityLoading } = useQuery({
    queryKey: ['density', timeRange],
    queryFn: () => analyticsApi.density({ time_range: timeRange }),
    refetchInterval: 30000,
  })
  
  const { data: odMatrix } = useQuery({
    queryKey: ['odMatrix', timeRange],
    queryFn: () => analyticsApi.odMatrix({ time_range: timeRange }),
    refetchInterval: 60000,
  })
  
  const { data: congestion } = useQuery({
    queryKey: ['congestion', timeRange],
    queryFn: () => analyticsApi.congestion({ time_range: timeRange }),
    refetchInterval: 30000,
  })
  
  const { data: heatmap } = useQuery({
    queryKey: ['heatmap', timeRange],
    queryFn: () => analyticsApi.heatmap({ time_range: timeRange, resolution: 8 }),
    refetchInterval: 30000,
  })
  
  const { data: cameras } = useQuery({
    queryKey: ['cameras'],
    queryFn: () => cameraApi.locations(),
  })

  // Prepare camera data for map
  const cameraMarkers = cameras?.data?.map((c: any) => ({
    camera_id: c.camera_id,
    lat: c.lat,
    lon: c.lon,
    zone: c.zone,
    status: c.status,
  })) || []

  // Handle camera click
  const handleCameraClick = (camera: any) => {
    setSelectedCamera(camera.camera_id)
    setCameraDetails(camera)
  }

  if (kpisLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col gap-6 p-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard
          title="Total Vehicles Today"
          value={kpis?.data?.total_vehicles_today || 0}
          icon={Truck}
          iconColor="bg-primary-600"
          trend="+12%"
          trendUp
        />
        <KPICard
          title="Active Cameras"
          value={`${kpis?.data?.active_cameras || 0} / ${kpis?.data?.total_cameras || 0}`}
          icon={Camera}
          iconColor="bg-emerald-600"
        />
        <KPICard
          title="Active Alerts"
          value={kpis?.data?.active_alerts || 0}
          icon={AlertTriangle}
          iconColor="bg-red-600"
          trend="3 critical"
          trendUp={false}
        />
        <KPICard
          title="Avg City Speed"
          value={kpis?.data?.avg_city_speed_kmph ? `${kpis.data.avg_city_speed_kmph.toFixed(1)} km/h` : 'N/A'}
          icon={Gauge}
          iconColor="bg-violet-600"
        />
      </div>

      {/* Main content: Map + Analytics Panel */}
      <div className="flex-1 flex gap-6 min-h-0">
        {/* Map Section - 60% */}
        <div className="w-full lg:w-3/5 flex flex-col gap-4 min-h-0">
          {/* Map Controls */}
          <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-slate-500" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Layers:</span>
            </div>
            
            {[
              { key: 'cameras', label: 'Cameras', icon: MapPin },
              { key: 'heatmap', label: 'Heatmap', icon: Activity },
              { key: 'congestion', label: 'Congestion', icon: AlertTriangle },
              { key: 'livePings', label: 'Live Pings', icon: TrendingUp },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setMapLayer(key as any, !mapLayers[key as keyof typeof mapLayers])}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors',
                  mapLayers[key as keyof typeof mapLayers]
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
            
            <div className="flex-1" />
            
            {/* Heatmap intensity */}
            {mapLayers.heatmap && (
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-slate-400" />
                <label className="text-sm text-slate-600 dark:text-slate-400">Intensity:</label>
                <input
                  type="range"
                  min="0.1"
                  max="3"
                  step="0.1"
                  value={heatmapIntensity}
                  onChange={(e) => setHeatmapIntensity(parseFloat(e.target.value))}
                  className="w-32 accent-primary-600"
                />
              </div>
            )}
            
            {/* Time range selector */}
            <div className="relative">
              <select
                value={timeRange}
                onChange={(e) => useAppStore.getState().setTimeRange(e.target.value as any)}
                className="appearance-none pl-3 pr-10 py-2 bg-slate-100 dark:bg-slate-800 border-0 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-primary-500 cursor-pointer"
              >
                <option value="1h">Last 1 hour</option>
                <option value="6h">Last 6 hours</option>
                <option value="24h">Last 24 hours</option>
                <option value="7d">Last 7 days</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
            
            <div className="flex items-center gap-2">
              <button className="btn-secondary btn-sm">
                <RefreshCw className="w-4 h-4" />
              </button>
              <button className="btn-secondary btn-sm">
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
              </button>
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 min-h-0 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <MapView
            cameras={cameraMarkers}
            heatmapCells={heatmap?.data?.cells || []}
            showHeatmap={mapLayers.heatmap}
            showCameras={mapLayers.cameras}
            showCongestion={mapLayers.congestion}
            onCameraClick={handleCameraClick}
            selectedCamera={selectedCamera}
          />
        </div>
      </div>

      {/* Analytics Panel - 40% */}
      <div className="w-full lg:w-2/5 flex flex-col gap-4 min-h-0">
        {/* Camera Details Panel */}
        {cameraDetails && (
          <div className="card flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 dark:text-white">
                Camera {cameraDetails.camera_id}
              </h3>
              <button
                onClick={() => setSelectedCamera(null)}
                className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500 dark:text-slate-400">Zone</p>
                <p className="font-medium">{cameraDetails.zone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400">Status</p>
                <span className={clsx(
                  'badge',
                  cameraDetails.status === 'online' && 'badge-success',
                  cameraDetails.status === 'offline' && 'badge-neutral',
                  cameraDetails.status === 'alerting' && 'badge-danger'
                )}>
                  {cameraDetails.status}
                </span>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400">Location</p>
                <p className="font-medium truncate max-w-[150px]">{cameraDetails.lat.toFixed(4)}, {cameraDetails.lon.toFixed(4)}</p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400">Last Ping</p>
                <p className="font-medium">Just now</p>
              </div>
            </div>
            
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
              <button className="btn-primary w-full text-sm">
                View Camera Trajectory Feed
              </button>
            </div>
          </div>
        )}

        {/* Analytics Charts */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-2 scrollbar-thin">
          {/* Traffic Density */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 dark:text-white">Traffic Density</h3>
            </div>
            <DensityChart data={density?.data?.data || []} loading={densityLoading} />
          </div>

          {/* Origin-Destination Matrix */}
          <div className="card">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Origin-Destination Matrix</h3>
            <ODMatrixHeatmap data={odMatrix?.data?.matrix || []} />
          </div>

          {/* Congestion Bottlenecks */}
          <div className="card">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Congestion Bottlenecks</h3>
            <CongestionTable data={congestion?.data?.data || []} />
          </div>

          {/* Average Speed by Segment */}
          <div className="card">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Average Speed by Segment</h3>
            <SpeedChart data={[]} />
          </div>
        </div>
      </div>
    </div>
  )
}