import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface SpeedChartProps {
  data: any[]
}

export function SpeedChart({ data }: SpeedChartProps) {
  if (!data.length) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
        No speed data available
      </div>
    )
  }

  const chartData = data.map((item, index) => ({
    ...item,
    label: `${item.origin_camera}→${item.dest_camera}`,
    color: `hsl(${index * 40}, 70%, 50%)`
  }))

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
          <XAxis 
            type="number" 
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={{ stroke: '#e2e8f0' }}
          />
          <YAxis 
            type="category" 
            dataKey="label" 
            width={120}
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
          <Bar dataKey="avg_speed_kmph" radius={[0, 4, 4, 0]}>
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={`hsl(${index * 40}, 70%, 50%)`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}