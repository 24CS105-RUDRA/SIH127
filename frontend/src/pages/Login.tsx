import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, User, Mail, Eye, EyeOff, AlertCircle, CheckCircle, LayoutGrid, ArrowRight, Info } from 'lucide-react'
import { authApi } from '../services/apiService'
import { useAuthStore } from '../store/useAuthStore'
import clsx from 'clsx'

export function Login() {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [isRegister, setIsRegister] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'analyst',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (isRegister) {
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match')
        return
      }
      if (formData.password.length < 8) {
        setError('Password must be at least 8 characters')
        return
      }
    }

    setLoading(true)
    try {
      await login(formData.email, formData.password)
      navigate('/', { replace: true })
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const roles = [
    { value: 'admin', label: 'Administrator', description: 'Full system access' },
    { value: 'analyst', label: 'Traffic Analyst', description: 'View analytics and reports' },
    { value: 'officer', label: 'Enforcement Officer', description: 'Manage alerts and blacklist' },
    { value: 'auditor', label: 'Auditor', description: 'Read-only access' },
  ]

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-blue-50 dark:from-neutral-900 dark:via-neutral-950 dark:to-neutral-900 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8 animate-slide-up">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl mb-4 shadow-lg shadow-primary-500/25">
            <LayoutGrid className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">ANPR Traffic Analytics</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-2">City-Wide Vehicle Tracking Platform</p>
        </div>

        {/* Card */}
        <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-700 p-8 animate-slide-up">
          {/* Tabs */}
          <div className="flex mb-6 border-b border-neutral-200 dark:border-neutral-700">
            {['login', 'register'].map(type => (
              <button
                key={type}
                onClick={() => { setIsRegister(type === 'register'); setError(''); }}
                className={clsx(
                  'flex-1 py-3 px-4 text-sm font-medium transition-all duration-200',
                  isRegister === (type === 'register')
                    ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 -mb-px'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                )}
              >
                {type === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-danger-50 dark:bg-danger-900/30 border border-danger-200 dark:border-danger-800 rounded-lg flex items-center gap-2 text-danger-700 dark:text-danger-400 animate-slide-up">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div className="animate-slide-up">
                <label className="label">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="John Doe"
                    className="input pl-10"
                    required={isRegister}
                  />
                </div>
              </div>
            )}

            {isRegister && (
              <div className="animate-slide-up">
                <label className="label">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => handleChange('role', e.target.value)}
                  className="select"
                  required
                >
                  {roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            )}

            <div className="animate-slide-up">
              <label className="label">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="admin@example.com"
                  className="input pl-10"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="animate-slide-up">
              <label className="label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  placeholder="••••••••"
                  className="input pl-10 pr-12"
                  required
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {isRegister && (
              <div className="animate-slide-up">
                <label className="label">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                    placeholder="••••••••"
                    className="input pl-10 pr-12"
                    required
                    autoComplete="new-password"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary btn-lg py-3 animate-slide-up"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  {isRegister ? 'Creating Account...' : 'Signing In...'}
                </span>
              ) : (
                isRegister ? 'Create Account' : 'Sign In'
              )}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg animate-slide-up">
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2 flex items-center gap-2">
              <Info className="w-4 h-4" />
              Demo Credentials
            </p>
            <div className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1 font-mono">
              <div>Email: <strong>admin@example.com</strong></div>
              <div>Password: <strong>admin123</strong></div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
          <p>Bharat Electronics Limited (BEL) • Smart Automation</p>
          <p className="mt-1">Problem Statement ID: 26127</p>
        </div>
      </div>
    </div>
  )
}