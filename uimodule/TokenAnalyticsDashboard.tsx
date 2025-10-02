import React, { useMemo } from "react"
import { DashboardProps } from "./tokenAnalyticsDashboard.types"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableRow, TableCell, TableHead } from "@/components/ui/table"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend as BarLegend,
} from "recharts"
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend as RadarLegend,
} from "recharts"

function formatNumber(n: number | string, opts: Intl.NumberFormatOptions = {}): string {
  const num = typeof n === "string" ? Number(n) : n
  if (!Number.isFinite(num)) return "-"
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 2,
    ...opts,
  }).format(num)
}

export const TokenAnalyticsDashboard: React.FC<DashboardProps> = ({
  title,
  riskScore,
  activityHeatmap,
  patternDetections,
}) => {
  const hasHeatmap =
    Array.isArray(activityHeatmap?.timeLabels) &&
    Array.isArray(activityHeatmap?.hourLabels) &&
    Array.isArray(activityHeatmap?.matrix) &&
    activityHeatmap.timeLabels.length > 0 &&
    activityHeatmap.hourLabels.length > 0

  const heatmapData = useMemo(() => {
    if (!hasHeatmap) return []
    return activityHeatmap.timeLabels.map((ts, rowIdx) => {
      const row: Record<string, any> = {
        time: new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }
      activityHeatmap.hourLabels.forEach((hour, colIdx) => {
        row[`h${hour}`] = activityHeatmap.matrix[rowIdx]?.[colIdx] ?? 0
      })
      return row
    })
  }, [hasHeatmap, activityHeatmap])

  const barColors = ["#4ade80", "#60a5fa", "#f472b6", "#facc15", "#a78bfa", "#34d399", "#fb7185"]

  const radarData = useMemo(
    () => [
      { factor: "Volume", value: riskScore.breakdown?.volumeFactor ?? 0 },
      { factor: "Addresses", value: riskScore.breakdown?.addressFactor ?? 0 },
      { factor: "Tx Count", value: riskScore.breakdown?.txFactor ?? 0 },
      { factor: "Age", value: riskScore.breakdown?.ageFactor ?? 0 },
    ],
    [riskScore.breakdown]
  )

  return (
    <div className="grid grid-cols-1 gap-6">
      <Card aria-label="Risk radar">
        <CardHeader>
          <CardTitle className="flex items-baseline gap-2">
            <span className="truncate">{title}</span>
            <span className="text-sm text-gray-500">Risk Score</span>
            <span className="font-mono text-base">{formatNumber(riskScore.score)} / 100</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="factor" />
              <PolarRadiusAxis angle={30} domain={[0, 100]} />
              <Radar name="Score" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
              <RadarLegend verticalAlign="top" />
            </RadarChart>
          </ResponsiveContainer>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-gray-600">
            <div>Volume factor: {formatNumber(riskScore.breakdown?.volumeFactor)}</div>
            <div>Address factor: {formatNumber(riskScore.breakdown?.addressFactor)}</div>
            <div>Tx factor: {formatNumber(riskScore.breakdown?.txFactor)}</div>
            <div>Age factor: {formatNumber(riskScore.breakdown?.ageFactor)}</div>
          </div>
        </CardContent>
      </Card>

      <Card aria-label="Activity heatmap">
        <CardHeader>
          <CardTitle>Activity Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          {hasHeatmap ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={heatmapData} stackOffset="sign">
                <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: any) => [String(v), "Transfers"]} />
                <BarLegend />
                {activityHeatmap.hourLabels.map((hour, idx) => (
                  <Bar key={hour} dataKey={`h${hour}`} stackId="a">
                    {heatmapData.map((_, rowIdx) => (
                      <Cell key={`cell-${rowIdx}-${hour}`} fill={barColors[idx % barColors.length]} />
                    ))}
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-sm text-gray-600">No heatmap data</div>
          )}
        </CardContent>
      </Card>

      <Card aria-label="Detected patterns">
        <CardHeader>
          <CardTitle>Detected Patterns</CardTitle>
        </CardHeader>
        <CardContent>
          {patternDetections?.length ? (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Index</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Metric</TableCell>
                  <TableCell>Value</TableCell>
                  <TableCell>Threshold</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {patternDetections.map(({ index, type, metric, value, threshold }) => (
                  <TableRow key={`${type}-${index}`}>
                    <TableCell className="font-mono">{index}</TableCell>
                    <TableCell>{type}</TableCell>
                    <TableCell className="truncate">{metric}</TableCell>
                    <TableCell className="font-mono">{formatNumber(value)}</TableCell>
                    <TableCell className="font-mono">{formatNumber(threshold)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-sm text-gray-600">No patterns detected</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default TokenAnalyticsDashboard

/*
filename options
- token_analytics_dashboard.tsx
- token_risk_activity_panel.tsx
- token_patterns_overview.tsx
*/
