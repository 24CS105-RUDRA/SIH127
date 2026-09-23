import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authApi } from '../services/apiService'

interface User {
  id: number
  name: string
  email: string
  role: string
  is_active: boolean
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string, role: string) => Promise<void>
  logout: () => void
  setUser: (user: User) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      
      login: async (email: string, password: string) => {
        const response = await authApi.login(email, password)
        const { access_token } = response.data
        localStorage.setItem('access_token', access_token)
        set({ token: access_token, isAuthenticated: true })
        // Fetch user info
        try {
          const userResponse = await authApi.me()
          set({ user: userResponse.data })
        } catch {
          // Token might be invalid
          get().logout()
        }
      },
      
      register: async (name: string, email: string, password: string, role: string) => {
        await authApi.register(name, email, password, role)
        // Auto login after register
        await get().login(email, password)
      },
      
      logout: () => {
        localStorage.removeItem('access_token')
        set({ user: null, token: null, isAuthenticated: false })
      },
      
      setUser: (user: User) => set({ user }),
    }),
    {
      name: 'anpr-auth',
      partialize: (state) => ({
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)