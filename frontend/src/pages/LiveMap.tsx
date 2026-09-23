import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, CircleMarker, Popup, useMapEvents } from 'react-leaflet'
import { useQuery } from '@tanstack/react-query'
import { 
  MapPin, Circle, SlidersHorizontal, ZoomIn, ZoomOut, 
  Layers, RefreshCw, Search, X
} from 'lucide-react'
import { cameraApi, analyticsApi } from '../services/apiService'
import { useAppStore } from '../store/useAppStore'
import clsx from 'clsx'

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
          'w-5 h-5 rounded-full border-2 border-white dark:border-dark-bg shadow-lg transition-all',
          isSelected && 'scale-125 ring-2 ring-primary-500'
        )} style={{ backgroundColor: statusColors[camera.status as keyof typeof statusColors] }}>
        </div>
        <span className="text-xs text-gray-700 dark:text-gray-300 bg-white dark:bg-dark-card px-1.5 py-0.5 rounded shadow whitespace-nowrap">
          {camera.camera_id}
        </span>
      </div>
    </Marker>
  )
}

const HeatmapLayer = ({ cells, intensity }: { cells: any[]; intensity: number }) => {
  return (
    <>
      {cells.map((cell, index) => (
        <CircleMarker
          key={index}
          center={[cell.lat, cell.lon]}
          radius={Math.max(3, Math.min(40, cell.vehicle_count * intensity * 1.5))}
          pathOptions={{
            color: 'rgba(239, 68, 68, 0.7)',
            fillColor: 'rgba(239, 68, 68, 0.3)',
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
            <span className="text-xs text-gray-700 dark:text-gray-300 bg-white dark:bg-dark-card px-1.5 py-0.5 rounded shadow whitespace-nowrap">
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
      <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border p-4 mb-4">
        <div className="flex items-center gap-3">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search camera..."
            className="input w-48 bg-gray-100 dark:bg-gray-800 border-0"
          />
        </div>
        
        <div className="flex items-center gap-2 border-l border-gray-200 dark:border-gray-700 pl-4">
          <Layers className="w-5 h-5 text-gray-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Layers</span>
        </div>
        
        {[
          { key: 'cameras', label: 'Cameras', icon: MapPin },
          { key: 'heatmap', label: 'Heatmap', icon: Circle },
          { key: 'congestion', label: 'Congestion', icon: Circle },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setMapLayer(key as any, !mapLayers[key as keyof typeof mapLayers])}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors',
              mapLayers[key as keyof typeof mapLayers]
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
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
            <SlidersHorizontal className="w-4 h-4 text-gray-400" />
            <label className="text-sm text-gray-600 dark:text-gray-400">Intensity:</label>
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
        
        {/* Cluster toggle */}
        <button
          onClick={() => setClusterMode(!clusterMode)}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors',
            clusterMode
              ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
          )}
        >
          <Layers className="w-4 h-4" />
          Cluster
        </button>
        
        <button className="btn-secondary btn-sm">
          <RefreshCw className="w-4 h-4 mr-1" /> Refresh
        </button>
      </div>

      {/* Map */}
      <div className="flex-1 relative min-h-0">
        <MapContainer
          center={[23.08, 72.62]}
          zoom={10}
          style={{ height: '100%', width: '100%' }}
          className="rounded-xl"
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
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
          <button className="btn-secondary rounded-l-full" title="Zoom In">
            <ZoomIn className="w-5 h-5" />
          </button>
          <button className="btn-secondary rounded-r-full" title="Zoom Out">
            <ZoomOut className="w-5 h-5" />
          </button>
        </div>
        
        {/* Camera details panel */}
        {cameraDetails && (
          <div className="absolute bottom-4 left-4 right-4 lg:left-auto lg:right-4 lg:w-80 max-h-[400px] overflow-y-auto">
            <div className="card shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Camera {cameraDetails.camera_id}
                </h3>
                <button
                  onClick={() => setSelectedCamera(null)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Zone</span>
                  <span className="font-medium">{cameraDetails.zone || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Status</span>
                  <span className={clsx(
                    'badge',
                    cameraDetails.status === 'online' && 'badge-green',
                    cameraDetails.status === 'offline' && 'badge-gray',
                    cameraDetails.status === 'alerting' && 'badge-red'
                  )}>
                    {cameraDetails.status}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Location</span>
                  <span className="font-mono truncate max-w-[150px]">
                    {cameraDetails.lat.toFixed(6)}, {cameraDetails.lon.toFixed(6)}
                  </span>
                </div>
                
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
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