import { LucideIcon } from 'lucide-react'
import clsx from 'clsx'

interface KPICardProps {
  title: string
  value: string | number
  icon: LucideIcon
  iconColor: string
  trend?: string
  trendUp?: boolean
}

export function KPICard({ title, value, icon: Icon, iconColor, trend, trendUp = true }: KPICardProps) {
  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          {trend && (
            <p className={clsx(
              'text-sm mt-1 flex items-center gap-1',
              trendUp ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            )}>
              {trendUp ? '↑' : '↓'} {trend} vs last period
            </p>
          )}
        </div>
        <div className={clsx('p-3 rounded-xl', iconColor)}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  )
}