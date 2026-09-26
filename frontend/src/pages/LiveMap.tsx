import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, CircleMarker, Popup, useMapEvents } from 'react-leaflet'
import { useQuery } from '@tanstack/react-query'
import { 
  MapPin, Circle, SlidersHorizontal, ZoomIn, ZoomOut, 
  Layers, RefreshCw, Search, X, AlertTriangle
} from 'lucide-react'
import { cameraApi, analyticsApi } from '../services/apiService'
import { useAppStore } from '../store/useAppStore'
import clsx from 'clsx'
import 'leaflet/dist/leaflet.css'

// Camera marker component
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
          'w-5 h-5 rounded-full border-2 border-white dark:border-neutral-950 shadow-lg transition-all duration-200',
          isSelected && 'scale-125 ring-2 ring-primary-500'
        )} style={{ backgroundColor: statusColors[camera.status as keyof typeof statusColors] }}>
        </div>
        <span className="text-xs text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-900 px-1.5 py-0.5 rounded shadow whitespace-nowrap">
          {camera.camera_id}
        </span>
      </div>
    </Marker>
  )
}

// Heatmap layer
const HeatmapLayer = ({ cells, intensity }: { cells: any[]; intensity: number }) => {
  return (
    <>
      {cells.map((cell, index) => (
        <CircleMarker
          key={index}
          center={[cell.lat, cell.lon]}
          radius={Math.max(3, Math.min(40, cell.vehicle_count * intensity * 1.5))}
          pathOptions={{
            color: 'rgba(14, 165, 233, 0.8)',
            fillColor: 'rgba(14, 165, 233, 0.3)',
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
            <span className="text-xs text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-900 px-1.5 py-0.5 rounded shadow whitespace-nowrap">
              {item.camera_id}
            </span>
          </div>
        </Marker>
      ))}
    </>
  )
}

export function LiveMap() {
  const { mapLayers, setMapLayer, selectedCamera, setSelectedCamera } = useAppStore()
  const [heatmapIntensity, setHeatmapIntensity] = useState(1)
  const [cameraDetails, setCameraDetails] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [clusterMode, setClusterMode] = useState(true)
  
  const { data: cameras } = useQuery({
    queryKey: ['cameras'],
    queryFn: () => cameraApi.locations(),
  })
  
  const { data: heatmap } = useQuery({
    queryKey: ['heatmap', 'live'],
    queryFn: () => analyticsApi.heatmap({ time_range: '1h', resolution: 8 }),
    refetchInterval: 30000,
  })
  
  const { data: congestion } = useQuery({
    queryKey: ['congestion', 'live'],
    queryFn: () => analyticsApi.congestion({ time_range: '1h' }),
    refetchInterval: 30000,
  })

  const cameraMarkers = cameras?.data?.map((c: any) => ({
    camera_id: c.camera_id,
    lat: c.lat,
    lon: c.lon,
    zone: c.zone,
    status: c.status,
  })) || []

  const handleCameraClick = (camera: any) => {
    setSelectedCamera(camera.camera_id)
    setCameraDetails(camera)
  }

  const filteredCameras = cameraMarkers.filter(c => 
    c.camera_id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="h-full flex flex-col">
      {/* Top Controls */}
      <div className="card">
        <div className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search camera..."
                className="input pl-10 bg-neutral-100 dark:bg-neutral-800 border-0"
              />
            </div>
            
            <div className="flex items-center gap-2 border-l border-neutral-200 dark:border-neutral-700 pl-4">
              <Layers className="w-5 h-5 text-neutral-500" />
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Layers</span>
            </div>
            
            {[
              { key: 'cameras', label: 'Cameras', icon: MapPin },
              { key: 'heatmap', label: 'Heatmap', icon: Circle },
              { key: 'congestion', label: 'Congestion', icon: AlertTriangle },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setMapLayer(key as any, !mapLayers[key as keyof typeof mapLayers])}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all duration-200',
                  mapLayers[key as keyof typeof mapLayers]
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 shadow-sm'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
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
                <SlidersHorizontal className="w-4 h-4 text-neutral-400" />
                <label className="text-sm text-neutral-600 dark:text-neutral-400">Intensity:</label>
                <input
                  type="range"
                  min="0.1"
                  max="3"
                  step="0.1"
                  value={heatmapIntensity}
                  onChange={(e) => setHeatmapIntensity(parseFloat(e.target.value))}
                  className="w-32 accent-primary-600 h-1.5"
                />
              </div>
            )}
            
            {/* Cluster toggle */}
            <button
              onClick={() => setClusterMode(!clusterMode)}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all duration-200',
                clusterMode
                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              )}
            >
              <Layers className="w-4 h-4" />
              Cluster
            </button>
            
            <button className="btn-secondary btn-sm">
              <RefreshCw className="w-4 h-4 mr-1" /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative min-h-0">
        <MapContainer
          center={[23.08, 72.62]}
          zoom={10}
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
          
          {mapLayers.heatmap && heatmap?.data?.cells && (
            <HeatmapLayer cells={heatmap.data.cells} intensity={heatmapIntensity} />
          )}
          
          {mapLayers.congestion && congestion?.data?.data && (
            <CongestionMarkers data={congestion.data.data} />
          )}
          
          {mapLayers.cameras && filteredCameras.map((camera: any) => (
            <CameraMarker
              key={camera.camera_id}
              camera={camera}
              onClick={() => handleCameraClick(camera)}
              isSelected={selectedCamera === camera.camera_id}
            />
          ))}
        </MapContainer>
        
        {/* Zoom controls */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-2">
          <button className="btn-secondary rounded-l-full shadow-lg" title="Zoom In">
            <ZoomIn className="w-5 h-5" />
          </button>
          <button className="btn-secondary rounded-r-full shadow-lg" title="Zoom Out">
            <ZoomOut className="w-5 h-5" />
          </button>
        </div>
        
        {/* Camera details panel */}
        {cameraDetails && (
          <div className="absolute bottom-4 left-4 right-4 lg:left-auto lg:right-4 lg:w-80 max-h-[400px] overflow-y-auto">
            <div className="card shadow-xl">
              <div className="card-header flex items-center justify-between">
                <h3 className="font-semibold text-neutral-900 dark:text-white">
                  Camera {cameraDetails.camera_id}
                </h3>
                <button
                  onClick={() => setSelectedCamera(null)}
                  className="p-1 rounded-lg text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="card-body space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Zone</span>
                  <span className="font-medium">{cameraDetails.zone || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Status</span>
                  <span className={clsx(
                    'badge',
                    cameraDetails.status === 'online' && 'badge-success',
                    cameraDetails.status === 'offline' && 'badge-neutral',
                    cameraDetails.status === 'alerting' && 'badge-danger'
                  )}>
                    {cameraDetails.status}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Location</span>
                  <span className="font-mono truncate max-w-[150px]">
                    {cameraDetails.lat.toFixed(6)}, {cameraDetails.lon.toFixed(6)}
                  </span>
                </div>
                
                <div className="pt-3 border-t border-neutral-200 dark:border-neutral-700">
                  <button className="btn-primary w-full text-sm">
                    View Camera Trajectory Feed
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}