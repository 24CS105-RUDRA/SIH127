import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Camera, Plus, Edit, Trash2, MapPin, Wifi, WifiOff, 
  AlertTriangle, Activity, Search, X, Check, MoreVertical,
  Settings, Eye, Trash2 as Trash2Icon
} from 'lucide-react'
import { cameraApi } from '../services/apiService'
import clsx from 'clsx'

export function CameraManager() {
  const queryClient = useQueryClient()
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingCamera, setEditingCamera] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [zoneFilter, setZoneFilter] = useState<string>('')

  const { data: camerasData, isLoading, refetch } = useQuery({
    queryKey: ['cameras', statusFilter, zoneFilter],
    queryFn: () => cameraApi.list({ status: statusFilter || undefined, zone: zoneFilter || undefined, page_size: 200 }),
  })

  const { data: zonesData } = useQuery({
    queryKey: ['camera-zones'],
    queryFn: () => cameraApi.zones(),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => cameraApi.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['cameras'] }); setShowAddModal(false); },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => cameraApi.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['cameras'] }); setEditingCamera(null); },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => cameraApi.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['cameras'] }); },
  })

  const [formData, setFormData] = useState({
    camera_id: '',
    lat: 23.08,
    lon: 72.62,
    zone: '',
    direction: '',
    stream_url: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingCamera) {
      updateMutation.mutate({ id: editingCamera.camera_id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
    setFormData({ camera_id: '', lat: 23.08, lon: 72.62, zone: '', direction: '', stream_url: '' })
  }

  const handleEdit = (camera: any) => {
    setEditingCamera(camera)
    setFormData({
      camera_id: camera.camera_id,
      lat: camera.lat,
      lon: camera.lon,
      zone: camera.zone || '',
      direction: camera.direction || '',
      stream_url: camera.stream_url || '',
    })
    setShowAddModal(true)
  }

  const handleStatusToggle = (camera: any) => {
    const newStatus = camera.status === 'online' ? 'offline' : 'online'
    updateMutation.mutate({ id: camera.camera_id, data: { status: newStatus } })
  }

  const filteredCameras = camerasData?.data?.cameras?.filter((c: any) =>
    c.camera_id.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Camera Manager</h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            {camerasData?.data?.total || 0} cameras • {camerasData?.data?.cameras?.filter((c: any) => c.status === 'online').length || 0} online
          </p>
        </div>
        <button onClick={() => { setEditingCamera(null); setShowAddModal(true); }} className="btn-primary">
          <Plus className="w-4 h-4 mr-2" /> Add Camera
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search camera ID..."
                className="input pl-10"
              />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-40">
              <option value="">All Status</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
              <option value="alerting">Alerting</option>
            </select>
            <select value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value)} className="input w-40">
              <option value="">All Zones</option>
              {zonesData?.data?.map((z: string) => <option key={z} value={z}>{z}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 card overflow-hidden">
        {filteredCameras.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 text-neutral-500 dark:text-neutral-400">
            <Camera className="w-16 h-16 mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No cameras found</h3>
            <p>Add cameras to start monitoring</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th className="p-3 text-left text-sm font-medium text-neutral-500 dark:text-neutral-400">Camera ID</th>
                  <th className="p-3 text-left text-sm font-medium text-neutral-500 dark:text-neutral-400">Zone</th>
                  <th className="p-3 text-left text-sm font-medium text-neutral-500 dark:text-neutral-400">Direction</th>
                  <th className="p-3 text-center text-sm font-medium text-neutral-500 dark:text-neutral-400">Status</th>
                  <th className="p-3 text-left text-sm font-medium text-neutral-500 dark:text-neutral-400">Location</th>
                  <th className="p-3 text-left text-sm font-medium text-neutral-500 dark:text-neutral-400">Stream</th>
                  <th className="p-3 text-left text-sm font-medium text-neutral-500 dark:text-neutral-400">Accuracy (24h)</th>
                  <th className="p-3 text-right text-sm font-medium text-neutral-500 dark:text-neutral-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {filteredCameras.map((camera: any) => (
                  <tr key={camera.camera_id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                    <td className="p-3 font-mono font-medium text-neutral-900 dark:text-white">{camera.camera_id}</td>
                    <td className="p-3 text-sm">
                      {camera.zone ? (
                        <span className="badge badge-info">{camera.zone}</span>
                      ) : '—'}
                    </td>
                    <td className="p-3 text-sm text-neutral-600 dark:text-neutral-300">{camera.direction || '—'}</td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleStatusToggle(camera)}
                        className={clsx(
                          'badge px-3 py-1',
                          camera.status === 'online' && 'badge-success',
                          camera.status === 'offline' && 'badge-neutral',
                          camera.status === 'alerting' && 'badge-danger'
                        )}
                      >
                        <span className="flex items-center gap-1">
                          {camera.status === 'online' && <Wifi className="w-3 h-3" />}
                          {camera.status === 'offline' && <WifiOff className="w-3 h-3" />}
                          {camera.status === 'alerting' && <AlertTriangle className="w-3 h-3" />}
                          {camera.status.charAt(0).toUpperCase() + camera.status.slice(1)}
                        </span>
                      </button>
                    </td>
                    <td className="p-3 text-sm text-neutral-600 dark:text-neutral-300 font-mono">
                      {camera.lat && camera.lon ? 
                        `${camera.lat.toFixed(4)}, ${camera.lon.toFixed(4)}` : '—'}
                    </td>
                    <td className="p-3 text-sm text-neutral-600 dark:text-neutral-300 truncate max-w-[200px]">
                      {camera.stream_url || 'Simulated'}
                    </td>
                    <td className="p-3 text-sm">
                      {camera.ocr_accuracy_24h !== undefined ? (
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary-600 rounded-full transition-all"
                              style={{ width: `${Math.min(100, camera.ocr_accuracy_24h * 100)}%` }}
                            />
                          </div>
                          <span className="font-mono text-xs">{(camera.ocr_accuracy_24h * 100).toFixed(1)}%</span>
                        </div>
                      ) : '—'}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleEdit(camera)} className="p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded" title="Edit">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded" title="View Accuracy">
                          <Activity className="w-4 h-4" />
                        </button>
                        <button onClick={() => { if (confirm('Delete this camera?')) deleteMutation.mutate(camera.camera_id) }} className="p-2 text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/30 rounded" title="Delete">
                          <Trash2Icon className="w-4 h-4" />
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

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => { setShowAddModal(false); setEditingCamera(null); }}>
          <div className="bg-white dark:bg-neutral-900 rounded-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto animate-scale-in" onClick={e => e.stopPropagation()}>
            <form onSubmit={handleSubmit}>
              <div className="card-header flex items-center justify-between">
                <h3 className="font-semibold text-neutral-900 dark:text-white">{editingCamera ? 'Edit Camera' : 'Add Camera'}</h3>
                <button type="button" onClick={() => { setShowAddModal(false); setEditingCamera(null); }} className="p-1 rounded-lg text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="card-body space-y-4">
                {!editingCamera && (
                  <div>
                    <label className="label">Camera ID *</label>
                    <input
                      type="text"
                      value={formData.camera_id}
                      onChange={(e) => setFormData({...formData, camera_id: e.target.value.toUpperCase()})}
                      placeholder="CAM013"
                      className="input text-uppercase"
                      required
                    />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Latitude *</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={formData.lat}
                      onChange={(e) => setFormData({...formData, lat: parseFloat(e.target.value)})}
                      className="input"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Longitude *</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={formData.lon}
                      onChange={(e) => setFormData({...formData, lon: parseFloat(e.target.value)})}
                      className="input"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Zone</label>
                  <select value={formData.zone} onChange={(e) => setFormData({...formData, zone: e.target.value})} className="select">
                    <option value="">Select zone</option>
                    {zonesData?.data?.map((z: string) => <option key={z} value={z}>{z}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Direction</label>
                  <select value={formData.direction} onChange={(e) => setFormData({...formData, direction: e.target.value})} className="select">
                    <option value="">Select direction</option>
                    <option value="Northbound">Northbound</option>
                    <option value="Southbound">Southbound</option>
                    <option value="Eastbound">Eastbound</option>
                    <option value="Westbound">Westbound</option>
                  </select>
                </div>
                <div>
                  <label className="label">Stream URL (optional)</label>
                  <input
                    type="text"
                    value={formData.stream_url}
                    onChange={(e) => setFormData({...formData, stream_url: e.target.value})}
                    placeholder="rtsp://... or 'simulated'"
                    className="input"
                  />
                </div>
              </div>
              <div className="card-footer">
                <button type="button" onClick={() => { setShowAddModal(false); setEditingCamera(null); }} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="btn-primary">
                  {(createMutation.isPending || updateMutation.isPending) ? 'Saving...' : (editingCamera ? 'Update' : 'Add Camera')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}