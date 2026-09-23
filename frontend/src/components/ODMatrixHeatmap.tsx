import { useMemo } from 'react'
import clsx from 'clsx'

interface ODMatrixHeatmapProps {
  data: any[]
}

export function ODMatrixHeatmap({ data }: ODMatrixHeatmapProps) {
  const matrix = useMemo(() => {
    if (!data.length) return { origins: [], destinations: [], cells: [] }
    
    const origins = [...new Set(data.map(d => d.origin_camera))]
    const destinations = [...new Set(data.map(d => d.dest_camera))]
    
    const maxCount = Math.max(...data.map(d => d.vehicle_count))
    
    const cells = origins.map(origin => 
      destinations.map(dest => {
        const item = data.find(d => d.origin_camera === origin && d.dest_camera === dest)
        return item ? item.vehicle_count : 0
      })
    )
    
    return { origins, destinations, cells, maxCount }
  }, [data])

  if (!matrix.origins.length) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-500 dark:text-gray-400">
        No O-D data available for selected time range
      </div>
    )
  }

  const getColor = (count: number) => {
    if (count === 0) return 'bg-gray-100 dark:bg-gray-800'
    const intensity = count / matrix.maxCount
    if (intensity < 0.25) return 'bg-blue-100 dark:bg-blue-900/30'
    if (intensity < 0.5) return 'bg-blue-300 dark:bg-blue-700'
    if (intensity < 0.75) return 'bg-blue-500 dark:bg-blue-600'
    return 'bg-blue-700 dark:bg-blue-500'
  }

  const getTextColor = (count: number) => {
    if (count === 0) return 'text-gray-500 dark:text-gray-400'
    const intensity = count / matrix.maxCount
    return intensity > 0.5 ? 'text-white' : 'text-blue-900 dark:text-blue-100'
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="p-2 text-left font-medium text-gray-500 dark:text-gray-400">From \\ To</th>
            {matrix.destinations.map(dest => (
              <th key={dest} className="p-2 text-center font-medium text-gray-500 dark:text-gray-400">
                {dest}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.origins.map((origin, i) => (
            <tr key={origin}>
              <td className="p-2 font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">{origin}</td>
              {matrix.destinations.map((dest, j) => (
                <td
                  key={dest}
                  className={clsx(
                    'p-2 text-center rounded transition-colors cursor-pointer',
                    getColor(matrix.cells[i][j]),
                    getTextColor(matrix.cells[i][j]),
                    matrix.cells[i][j] > 0 && 'hover:opacity-80'
                  )}
                  title={`${origin} → ${dest}: ${matrix.cells[i][j]} vehicles`}
                >
                  {matrix.cells[i][j] > 0 ? matrix.cells[i][j] : '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}