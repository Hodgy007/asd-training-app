'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface WeeklyData {
  week: string
  social: number
  behaviour: number
  sensory: number
}

interface DomainChartProps {
  data: WeeklyData[]
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-calm-200 p-3">
        <p className="text-sm font-semibold text-slate-900 mb-2">{label}</p>
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-slate-600">{entry.name}:</span>
            <span className="font-medium text-slate-900">{entry.value}</span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

export function DomainChart({ data }: DomainChartProps) {
  const hasData = data.some((d) => d.social > 0 || d.behaviour > 0 || d.sensory > 0)

  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
        No observation data to chart yet. Start logging observations.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="week"
          tick={{ fontSize: 12, fill: '#94a3b8' }}
          axisLine={{ stroke: '#e2e8f0' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value) => (
            <span className="text-xs text-slate-600 capitalize">{value}</span>
          )}
        />
        <Line
          type="monotone"
          dataKey="social"
          name="Social Communication"
          stroke="#0284c7"
          strokeWidth={2.5}
          dot={{ fill: '#0284c7', r: 4, strokeWidth: 0 }}
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone"
          dataKey="behaviour"
          name="Behaviour & Play"
          stroke="#16a34a"
          strokeWidth={2.5}
          dot={{ fill: '#16a34a', r: 4, strokeWidth: 0 }}
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone"
          dataKey="sensory"
          name="Sensory Responses"
          stroke="#fb923c"
          strokeWidth={2.5}
          dot={{ fill: '#fb923c', r: 4, strokeWidth: 0 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
