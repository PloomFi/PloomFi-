import React from "react"
import { DashboardProps } from "./tokenAnalyticsDashboard.types"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableRow, TableCell, TableHead } from "@/components/ui/table"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from "recharts"

export function TokenAnalyticsDashboard(props: DashboardProps) {
  const { title, riskScore, activityHeatmap, patternDetections } = props

  // prepare heatmap data for recharts
  const heatmapData = activityHeatmap.timeLabels.map((t, i) => {
    const row: Record<string, any> = { time: new Date(t).toLocaleTimeString() }
    activityHeatmap.hourLabels.forEach((hour, j) => {
      row[`h${hour}`] = activityHeatmap.matrix[i][j]
    })
    return row
  })

  // prepare radar data for risk breakdown
  const radarData = [
    { factor: "Volume", value: riskScore.breakdown.volumeFactor },
    { factor: "Addresses", value: riskScore.breakdown.addressFactor },
    { factor: "Tx Count", value: riskScore.breakdown.txFactor },
    { factor: "Age", value: riskScore.breakdown.ageFactor },
  ]

  return (
    <div className="grid grid-cols-1 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{title} Risk Score: {riskScore.score}/100</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="factor" />
              <PolarRadiusAxis angle={30} domain={[0, 100]} />
              <Radar name="Score" dataKey="value" />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity Heatmap (Transfers)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={heatmapData}>
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              {activityHeatmap.hourLabels.map((hour) => (
                <Bar key={hour} dataKey={`h${hour}`} stackId="a" />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

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
              {patternDetections.map((evt, idx) => (
                <TableRow key={idx}>
                  <TableCell>{evt.index}</TableCell>
                  <TableCell>{evt.type}</TableCell>
                  <TableCell>{evt.metric}</TableCell>
                  <TableCell>{evt.value}</TableCell>
                  <TableCell>{evt.threshold}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
