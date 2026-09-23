import { api } from './api'
import type {
  Camera, Sighting, TrajectoryResponse, DensityResponse,
  ODMatrixResponse, CongestionResponse, HeatmapResponse,
  Alert, AlertListResponse, BlacklistEntry, BlacklistListResponse,
  KPIResponse, AnalyticsQuery, TimeRange
} from './api'

// Camera API
export const cameraApi = {
  list: (params?: { zone?: string; status?: string; page?: number; page_size?: number }) =>
    api.get('/cameras', { params }),
  get: (camera_id: string) => api.get(`/cameras/${camera_id}`),
  create: (data: { camera_id: string; lat: number; lon: number; zone?: string; direction?: string; stream_url?: string }) =>
    api.post('/cameras', data),
  update: (camera_id: string, data: Partial<Camera>) => api.patch(`/cameras/${camera_id}`, data),
  delete: (camera_id: string) => api.delete(`/cameras/${camera_id}`),
  zones: () => api.get('/cameras/zones'),
  locations: () => api.get('/cameras/locations'),
}

// Sightings API
export const sightingApi = {
  create: (data: { plate_text: string; camera_id: string; confidence?: number; snapshot_url?: string; bbox?: Record<string, any>; ts: string }) =>
    api.post('/sightings', data),
  batchCreate: (sightings: Array<{ plate_text: string; camera_id: string; confidence?: number; snapshot_url?: string; bbox?: Record<string, any>; ts: string }>) =>
    api.post('/sightings/batch', { sightings }),
  list: (params?: { camera_id?: string; plate_text?: string; start_time?: string; end_time?: string; page?: number; page_size?: number }) =>
    api.get('/sightings', { params }),
  recent: (params?: { camera_id?: string; plate_text?: string; limit?: number }) =>
    api.get('/sightings/recent', { params }),
}

// Trajectory API
export const trajectoryApi = {
  get: (plate: string, params?: { start_time?: string; end_time?: string; camera_zone?: string; confidence_threshold?: number; fuzzy_threshold?: number }) =>
    api.get<TrajectoryResponse>(`/trajectory/${plate}`, { params }),
  search: (query: string, params?: { limit?: number; start_time?: string; end_time?: string }) =>
    api.get(`/trajectory/search/${query}`, { params }),
}

// Analytics API
export const analyticsApi = {
  kpis: () => api.get<KPIResponse>('/analytics/kpis'),
  density: (params?: AnalyticsQuery) => api.get<DensityResponse>('/analytics/density', { params }),
  odMatrix: (params?: AnalyticsQuery) => api.get<ODMatrixResponse>('/analytics/od-matrix', { params }),
  congestion: (params?: AnalyticsQuery) => api.get<CongestionResponse>('/analytics/congestion', { params }),
  heatmap: (params?: AnalyticsQuery & { resolution?: number }) => api.get<HeatmapResponse>('/analytics/heatmap', { params }),
  speeds: (params?: AnalyticsQuery) => api.get('/analytics/speed', { params }),
}

// Alerts API
export const alertApi = {
  list: (params?: { status?: string; alert_type?: string; severity?: string; plate_text?: string; camera_id?: string; start_time?: string; end_time?: string; page?: number; page_size?: number }) =>
    api.get<AlertListResponse>('/alerts', { params }),
  get: (id: number) => api.get<Alert>(`/alerts/${id}`),
  acknowledge: (id: number, user_id: string) => api.post(`/alerts/${id}/acknowledge`, { user_id }),
  resolve: (id: number, user_id: string, note?: string) => api.post(`/alerts/${id}/resolve`, { user_id, note }),
}

// Blacklist API
export const blacklistApi = {
  list: (params?: { active_only?: boolean; page?: number; page_size?: number }) =>
    api.get<BlacklistListResponse>('/blacklist', { params }),
  get: (plate_text: string) => api.get<BlacklistEntry>(`/blacklist/${plate_text}`),
  create: (data: { plate_text: string; reason: string; added_by?: string; expires_at?: string }) =>
    api.post('/blacklist', data),
  bulkImport: (plates: Array<{ plate_text: string; reason: string; added_by?: string; expires_at?: string }>) =>
    api.post('/blacklist/import', { plates }),
  update: (plate_text: string, data: { reason?: string; expires_at?: string; is_active?: boolean }) =>
    api.patch(`/blacklist/${plate_text}`, data),
  delete: (plate_text: string) => api.delete(`/blacklist/${plate_text}`),
  sightings: (plate_text: string, limit?: number) => api.get(`/blacklist/${plate_text}/sightings`, { params: { limit } }),
}

// Detection API
export const detectionApi = {
  detect: (imageBase64: string, camera_id: string, timestamp?: string) =>
    api.post('/detect/base64', { image_base64: imageBase64, camera_id, timestamp }),
  detectUpload: (file: File, camera_id: string) => {
    const formData = new FormData()
    formData.append('image', file)
    formData.append('camera_id', camera_id)
    return api.post('/detect', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  detectBatch: (images: Array<{ image: string; camera_id: string; timestamp?: string }>) =>
    api.post('/detect/batch', { images }),
}

// Reports API
export const reportApi = {
  dailySummary: (date: string, format: 'csv' | 'json' = 'csv') =>
    api.get('/reports/daily-summary', { params: { date, format }, responseType: format === 'csv' ? 'blob' : 'json' }),
  trajectory: (plate: string, start_time: string, end_time: string, format: 'csv' | 'json' = 'csv') =>
    api.get(`/reports/trajectory/${plate}`, { params: { start_time, end_time, format }, responseType: format === 'csv' ? 'blob' : 'json' }),
  alerts: (start_time: string, end_time: string, severity?: string, format: 'csv' | 'json' = 'csv') =>
    api.get('/reports/alerts', { params: { start_time, end_time, severity, format }, responseType: format === 'csv' ? 'blob' : 'json' }),
  congestion: (start_time: string, end_time: string, format: 'csv' | 'json' = 'csv') =>
    api.get('/reports/congestion', { params: { start_time, end_time, format }, responseType: format === 'csv' ? 'blob' : 'json' }),
}

// Auth API
export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (name: string, email: string, password: string, role: string) =>
    api.post('/auth/register', { name, email, password, role }),
  me: () => api.get('/auth/me'),
}