import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppState {
  // UI state
  sidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  
  // Time range for analytics
  timeRange: '1h' | '6h' | '24h' | '7d' | 'custom'
  setTimeRange: (range: '1h' | '6h' | '24h' | '7d' | 'custom') => void
  customTimeRange: { start: Date; end: Date } | null
  setCustomTimeRange: (range: { start: Date; end: Date } | null) => void
  
  // Map layers
  mapLayers: {
    heatmap: boolean
    cameras: boolean
    congestion: boolean
    livePings: boolean
  }
  toggleMapLayer: (layer: keyof AppState['mapLayers']) => void
  setMapLayer: (layer: keyof AppState['mapLayers'], value: boolean) => void
  
  // Selected items
  selectedCamera: string | null
  setSelectedCamera: (id: string | null) => void
  selectedPlate: string | null
  setSelectedPlate: (plate: string | null) => void
  
  // Notifications
  unreadAlerts: number
  incrementUnreadAlerts: () => void
  clearUnreadAlerts: () => void
  
  // Theme
  darkMode: boolean
  toggleDarkMode: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // UI
      sidebarOpen: true,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      
      // Time range
      timeRange: '1h',
      setTimeRange: (range) => set({ timeRange: range, customTimeRange: null }),
      customTimeRange: null,
      setCustomTimeRange: (range) => set({ customTimeRange: range, timeRange: 'custom' }),
      
      // Map layers
      mapLayers: {
        heatmap: true,
        cameras: true,
        congestion: false,
        livePings: false,
      },
      toggleMapLayer: (layer) => set((state) => ({
        mapLayers: { ...state.mapLayers, [layer]: !state.mapLayers[layer] }
      })),
      setMapLayer: (layer, value) => set((state) => ({
        mapLayers: { ...state.mapLayers, [layer]: value }
      })),
      
      // Selected items
      selectedCamera: null,
      setSelectedCamera: (id) => set({ selectedCamera: id }),
      selectedPlate: null,
      setSelectedPlate: (plate) => set({ selectedPlate: plate }),
      
      // Notifications
      unreadAlerts: 0,
      incrementUnreadAlerts: () => set((state) => ({ unreadAlerts: state.unreadAlerts + 1 })),
      clearUnreadAlerts: () => set({ unreadAlerts: 0 }),
      
      // Theme
      darkMode: false,
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
    }),
    {
      name: 'anpr-app-store',
      partialize: (state) => ({
        darkMode: state.darkMode,
        sidebarOpen: state.sidebarOpen,
        mapLayers: state.mapLayers,
      }),
    }
  )
)