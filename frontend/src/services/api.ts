import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor for auth
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Types
export interface Camera {
  camera_id: string
  location: { type: 'Point'; coordinates: [number, number] }
  zone?: string
  direction?: string
  status: 'online' | 'offline' | 'alerting'
  stream_url?: string
  installed_at: string
}

export interface Sighting {
  id: number
  plate_text: string
  normalized_plate?: string
  camera_id: string
  confidence?: number
  snapshot_url?: string
  bbox?: Record<string, any>
  ts: string
}

export interface TrajectoryPoint {
  camera_id: string
  camera_zone?: string
  lat: number
  lon: number
  timestamp: string
  plate_text: string
  confidence?: number
  snapshot_url?: string
  speed_kmph?: number
  direction?: string
  bearing?: number
}

export interface TrajectoryResponse {
  plate: string
  points: TrajectoryPoint[]
  total_distance_km?: number
  avg_speed_kmph?: number
  start_time: string
  end_time: string
  sighting_count: number
}

export interface DensityPoint {
  camera_id: string
  zone?: string
  lat: number
  lon: number
  vehicle_count: number
  bucket_start: string
  bucket_end: string
}

export interface DensityResponse {
  data: DensityPoint[]
  time_range: string
  total_vehicles: number
}

export interface ODMatrixCell {
  origin_camera: string
  origin_zone?: string
  dest_camera: string
  dest_zone?: string
  vehicle_count: number
}

export interface ODMatrixResponse {
  matrix: ODMatrixCell[]
  time_range: string
  total_trips: number
}

export interface CongestionPoint {
  camera_id: string
  zone?: string
  lat: number
  lon: number
  density_score: number
  avg_speed?: number
  congestion_level: 'normal' | 'watch' | 'congested'
  z_score?: number
}

export interface CongestionResponse {
  data: CongestionPoint[]
  time_range: string
}

export interface HeatmapCell {
  h3_index: string
  lat: number
  lon: number
  vehicle_count: number
}

export interface HeatmapResponse {
  cells: HeatmapCell[]
  resolution: number
  time_range: string
  total_vehicles: number
}

export interface Alert {
  id: number
  plate_text: string
  camera_id?: string
  alert_type: 'blacklist_hit' | 'anomaly' | 'system'
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'new' | 'acknowledged' | 'resolved'
  details?: Record<string, any>
  created_at: string
  acknowledged_at?: string
  resolved_at?: string
  resolved_by?: string
  note?: string
}

export interface AlertListResponse {
  alerts: Alert[]
  total: number
  page: number
  page_size: number
}

export interface BlacklistEntry {
  plate_text: string
  normalized_plate?: string
  reason: string
  added_by?: string
  added_at: string
  expires_at?: string
  is_active: boolean
}

export interface BlacklistListResponse {
  blacklist: BlacklistEntry[]
  total: number
  page: number
  page_size: number
}

export interface KPIResponse {
  total_vehicles_today: number
  active_cameras: number
  total_cameras: number
  active_alerts: number
  avg_city_speed_kmph?: number
}

export type TimeRange = '1h' | '6h' | '24h' | '7d' | 'custom'

export interface AnalyticsQuery {
  time_range?: TimeRange
  start_time?: string
  end_time?: string
  zone?: string
  camera_id?: string
}