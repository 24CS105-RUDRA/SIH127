import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Shield, Plus, Edit, Trash2, Upload, Download, 
  Search, Filter, X, Check, AlertTriangle, Eye,
  FileText, MoreVertical
} from 'lucide-react'
import { blacklistApi } from '../services/apiService'
import clsx from 'clsx'

export function BlacklistManager() {
  const queryClient = useQueryClient()
  const [showAddModal, setShowAddModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeOnly, setActiveOnly] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editReason, setEditReason] = useState('')
  const [editExpiry, setEditExpiry] = useState('')

  const { data: blacklistData, isLoading, refetch } = useQuery({
    queryKey: ['blacklist', activeOnly],
    queryFn: () => blacklistApi.list({ active_only: activeOnly }),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => blacklistApi.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['blacklist'] }); setShowAddModal(false); },
  })

  const updateMutation = useMutation({
    mutationFn: ({ plate, data }: { plate: string; data: any }) => blacklistApi.update(plate, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['blacklist'] }); setEditingId(null); },
  })

  const deleteMutation = useMutation({
    mutationFn: (plate: string) => blacklistApi.delete(plate),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['blacklist'] }); },
  })

  const importMutation = useMutation({
    mutationFn: (plates: any[]) => blacklistApi.bulkImport(plates),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['blacklist'] }); setShowImportModal(false); },
  })

  const [formData, setFormData] = useState({
    plate_text: '',
    reason: 'Stolen',
    added_by: 'current-user',
    expires_at: '',
  })

  const [importData, setImportData] = useState('')

  const reasons = ['Stolen', 'Wanted', 'Under Investigation', 'Suspicious Activity', 'Custom']

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate({
      ...formData,
      expires_at: formData.expires_at || undefined,
    })
    setFormData({ plate_text: '', reason: 'Stolen', added_by: 'current-user', expires_at: '' })
  }

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault()
    const lines = importData.trim().split('\n').filter(l => l.trim())
    const plates = lines.map(line => {
      const [plate_text, reason, expires_at] = line.split(',').map(s => s.trim())
      return { plate_text, reason: reason || 'Custom', added_by: 'current-user', expires_at: expires_at || undefined }
    })
    importMutation.mutate(plates)
    setImportData('')
  }

  const handleEdit = (plate: string, reason: string, expires_at?: string) => {
    setEditingId(plate)
    setEditReason(reason)
    setEditExpiry(expires_at ? expires_at.split('T')[0] : '')
  }

  const handleSaveEdit = (plate: string) => {
    updateMutation.mutate({ plate, data: { reason: editReason, expires_at: editExpiry || undefined } })
  }

  const handleViewSightings = async (plate: string) => {
    // Navigate to trajectory search with this plate
    window.location.href = `/search?plate=${encodeURIComponent(plate)}`
  }

  const filteredData = blacklistData?.data?.blacklist?.filter((item: any) =>
    item.plate_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.reason.toLowerCase().includes(searchQuery.toLowerCase())
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Blacklist Manager</h1>
          <p className="text-gray-500 dark:text-gray-400">
            {blacklistData?.data?.total || 0} plates • {filteredData.filter((f: any) => f.is_active).length} active
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowImportModal(true)} className="btn-secondary">
            <Upload className="w-4 h-4 mr-2" /> Import CSV
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            <Plus className="w-4 h-4 mr-2" /> Add Plate
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="card mb-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search plate or reason..."
              className="input pl-10"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            Active only
          </label>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-hidden bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-gray-700">
        {filteredData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 text-gray-500 dark:text-gray-400">
            <Shield className="w-16 h-16 mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No blacklisted plates</h3>
            <p>Add plates to the blacklist to enable real-time alerts</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="p-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Plate</th>
                  <th className="p-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Reason</th>
                  <th className="p-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Added By</th>
                  <th className="p-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Date Added</th>
                  <th className="p-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Expires</th>
                  <th className="p-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">Status</th>
                  <th className="p-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredData.map((item: any) => (
                  <tr key={item.plate_text} className={clsx('hover:bg-gray-50 dark:hover:bg-gray-800/50', !item.is_active && 'opacity-50')}>
                    <td className="p-3 font-mono font-medium text-gray-900 dark:text-white">{item.plate_text}</td>
                    <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{item.reason}</td>
                    <td className="p-3 text-sm text-gray-600 dark:text-gray-400">{item.added_by}</td>
                    <td className="p-3 text-sm text-gray-600 dark:text-gray-400">
                      {new Date(item.added_at).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-sm text-gray-600 dark:text-gray-400">
                      {item.expires_at ? new Date(item.expires_at).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="p-3 text-center">
                      <span className={clsx('badge', item.is_active ? 'badge-red' : 'badge-gray')}>
                        {item.is_active ? 'Active' : 'Expired'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {editingId === item.plate_text ? (
                          <>
                            <input
                              type="text"
                              value={editReason}
                              onChange={(e) => setEditReason(e.target.value)}
                              className="input w-32"
                            />
                            <input
                              type="date"
                              value={editExpiry}
                              onChange={(e) => setEditExpiry(e.target.value)}
                              className="input w-32"
                            />
                            <button onClick={() => handleSaveEdit(item.plate_text)} className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded" title="Save">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={() => setEditingId(null)} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded" title="Cancel">
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => handleViewSightings(item.plate_text)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded" title="View Sightings">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleEdit(item.plate_text, item.reason, item.expires_at)} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded" title="Edit">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => { if (confirm('Remove from blacklist?')) deleteMutation.mutate(item.plate_text) }} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded" title="Remove">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowAddModal(false)}>
          <div className="bg-white dark:bg-dark-card rounded-xl max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <form onSubmit={handleSubmit}>
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h3 className="font-semibold">Add to Blacklist</h3>
                <button type="button" onClick={() => setShowAddModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Plate Number *</label>
                  <input
                    type="text"
                    value={formData.plate_text}
                    onChange={(e) => setFormData({...formData, plate_text: e.target.value.toUpperCase()})}
                    placeholder="GJ01AB1234"
                    className="input text-uppercase"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Reason *</label>
                  <select value={formData.reason} onChange={(e) => setFormData({...formData, reason: e.target.value})} className="input">
                    {reasons.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Expires At (optional)</label>
                  <input type="datetime-local" value={formData.expires_at} onChange={(e) => setFormData({...formData, expires_at: e.target.value})} className="input" />
                </div>
              </div>
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="btn-primary">
                  {createMutation.isPending ? 'Adding...' : 'Add to Blacklist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowImportModal(false)}>
          <div className="bg-white dark:bg-dark-card rounded-xl max-w-2xl w-full mx-4" onClick={e => e.stopPropagation()}>
            <form onSubmit={handleImport}>
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h3 className="font-semibold">Bulk Import (CSV)</h3>
                <button type="button" onClick={() => setShowImportModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4 space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Paste CSV data (one plate per line): <code className="text-xs">plate,reason,expires_at</code>
                </p>
                <textarea
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  placeholder="GJ01AB1234,Stolen,2024-12-31\nMH12CD5678,Wanted,\nDL09EF9012,Under Investigation,"
                  className="input h-48 font-mono text-sm"
                  required
                />
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Format: plate,reason,expires_at (expires_at optional, ISO format)
                </div>
              </div>
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
                <button type="button" onClick={() => setShowImportModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={importMutation.isPending} className="btn-primary">
                  {importMutation.isPending ? 'Importing...' : 'Import Plates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}