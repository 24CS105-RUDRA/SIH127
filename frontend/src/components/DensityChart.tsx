import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import clsx from 'clsx'

interface DensityChartProps {
  data: any[]
  loading?: boolean
}

export function DensityChart({ data, loading }: DensityChartProps) {
  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-3 border-primary-600 border-t-transparent" />
      </div>
    )
  }

  // Group by camera and time bucket
  const cameraData = data.reduce((acc: any, item: any) => {
    const key = item.camera_id
    if (!acc[key]) acc[key] = []
    acc[key].push({
      time: new Date(item.bucket_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      count: item.vehicle_count,
      camera: item.camera_id
    })
    return acc
  }, {})

  const chartData = Object.entries(cameraData).flatMap(([camera, points]: [string, any]) => 
    points.map((p: any) => ({ ...p, camera }))
  )

  // Sort by time
  chartData.sort((a, b) => a.time.localeCompare(b.time))

  const cameras = [...new Set(chartData.map(d => d.camera))]

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
          <XAxis 
            dataKey="time" 
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={{ stroke: '#e2e8f0' }}
          />
          <YAxis 
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={{ stroke: '#e2e8f0' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1e293b', 
              border: 'none', 
              borderRadius: '8px',
              color: '#f1f5f9'
            }}
            labelStyle={{ color: '#94a3b8' }}
          />
          <Legend wrapperStyle={{ paddingTop: '8px' }} />
          {cameras.map((camera, index) => {
            const cameraPoints = chartData.filter(d => d.camera === camera)
            const colors = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
            return (
              <Line
                key={camera}
                type="monotone"
                dataKey="count"
                name={camera}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
                data={cameraPoints}
              />
            )
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}