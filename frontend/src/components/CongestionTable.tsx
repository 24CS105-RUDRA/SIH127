import clsx from 'clsx'

interface CongestionTableProps {
  data: any[]
}

export function CongestionTable({ data }: CongestionTableProps) {
  if (!data.length) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-500 dark:text-gray-400">
        No congestion data available
      </div>
    )
  }

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'congested': return 'badge-red'
      case 'watch': return 'badge-yellow'
      default: return 'badge-green'
    }
  }

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'congested': return '🔴'
      case 'watch': return '🟡'
      default: return '🟢'
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className="p-3 text-left font-medium text-gray-500 dark:text-gray-400">Camera</th>
            <th className="p-3 text-left font-medium text-gray-500 dark:text-gray-400">Zone</th>
            <th className="p-3 text-right font-medium text-gray-500 dark:text-gray-400">Density</th>
            <th className="p-3 text-right font-medium text-gray-500 dark:text-gray-400">Avg Speed</th>
            <th className="p-3 text-center font-medium text-gray-500 dark:text-gray-400">Status</th>
            <th className="p-3 text-right font-medium text-gray-500 dark:text-gray-400">Z-Score</th>
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 10).map((item, index) => (
            <tr key={item.camera_id} className={clsx('border-b border-gray-100 dark:border-gray-800', index % 2 === 0 && 'bg-gray-50 dark:bg-gray-800/50')}>
              <td className="p-3 font-medium text-gray-900 dark:text-white">{item.camera_id}</td>
              <td className="p-3 text-gray-600 dark:text-gray-300">{item.zone || '—'}</td>
              <td className="p-3 text-right font-mono text-gray-900 dark:text-white">{item.density_score.toFixed(1)}</td>
              <td className="p-3 text-right text-gray-600 dark:text-gray-300">
                {item.avg_speed ? `${item.avg_speed.toFixed(1)} km/h` : '—'}
              </td>
              <td className="p-3 text-center">
                <span className={clsx('badge', getLevelBadge(item.congestion_level))}>
                  {getLevelIcon(item.congestion_level)} {item.congestion_level}
                </span>
              </td>
              <td className="p-3 text-right font-mono text-gray-600 dark:text-gray-300">
                {item.z_score !== null && item.z_score !== undefined ? item.z_score.toFixed(2) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}