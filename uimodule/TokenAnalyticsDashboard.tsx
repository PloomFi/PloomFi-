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
} from "recharts"
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from "recharts"

export const TokenAnalyticsDashboard: React.FC<DashboardProps> = ({
  title,
  riskScore,
  activityHeatmap,
  patternDetections,
}) => {
  // prepare heatmap data
  const heatmapData = useMemo(
    () =>
      activityHeatmap.timeLabels.map((ts, rowIdx) => {
        const row: Record<string, any> = {
          time: new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        }
        activityHeatmap.hourLabels.forEach((hour, colIdx) => {
          row[`h${hour}`] = activityHeatmap.matrix[rowIdx][colIdx] ?? 0
        })
        return row
      }),
    [activityHeatmap]
  )

  // colors for stacked bars
  const barColors = ["#4ade80", "#60a5fa", "#f472b6", "#facc15", "#a78bfa"]

  // prepare radar data
  const radarData = useMemo(
    () => [
      { factor: "Volume", value: riskScore.breakdown.volumeFactor },
      { factor: "Addresses", value: riskScore.breakdown.addressFactor },
      { factor: "Tx Count", value: riskScore.breakdown.txFactor },
      { factor: "Age", value: riskScore.breakdown.ageFactor },
    ],
    [riskScore.breakdown]
  )

  return (
    <div className="grid grid-cols-1 gap-6">
      {/* Risk Radar */}
      <Card>
        <CardHeader>
          <CardTitle>
            {title} Risk Score: {riskScore.score}/100
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="factor" />
              <PolarRadiusAxis angle={30} domain={[0, 100]} />
              <Radar name="Score" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
              <Legend verticalAlign="top" />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Activity Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Heatmap (Transfers)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={heatmapData} stackOffset="sign">
              <XAxis dataKey="time" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              {activityHeatmap.hourLabels.map((hour, idx) => (
                <Bar key={hour} dataKey={`h${hour}`} stackId="a">
                  {heatmapData.map((_, rowIdx) => (
                    <Cell key={`cell-${rowIdx}-${hour}`} fill={barColors[idx % barColors.length]} />
                  ))}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detected Patterns */}
      <Card>
        <CardHeader>
          <CardTitle>Detected Patterns</CardTitle>
        </CardHeader>
        <CardContent>
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
                  <TableCell>{index}</TableCell>
                  <TableCell>{type}</TableCell>
                  <TableCell>{metric}</TableCell>
                  <TableCell>{value}</TableCell>
                  <TableCell>{threshold}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
