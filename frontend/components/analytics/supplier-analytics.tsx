"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface SupplierAnalyticsProps {
  timeRange: string
}

// Mock supplier data
const supplierPerformanceData = [
  { supplier: "TechCorp", orders: 45, onTime: 92, quality: 88, cost: 85 },
  { supplier: "AudioMax", orders: 32, onTime: 95, quality: 91, cost: 78 },
  { supplier: "CableCo", orders: 28, onTime: 88, quality: 85, cost: 92 },
  { supplier: "DeskPro", orders: 18, onTime: 85, quality: 82, cost: 75 },
  { supplier: "GlobalSupply", orders: 25, onTime: 90, quality: 87, cost: 88 },
]

const supplierOrdersData = [
  { supplier: "TechCorp", orders: 45, value: 125000 },
  { supplier: "AudioMax", orders: 32, value: 89000 },
  { supplier: "CableCo", orders: 28, value: 67000 },
  { supplier: "DeskPro", orders: 18, value: 45000 },
  { supplier: "GlobalSupply", orders: 25, value: 78000 },
]

export function SupplierAnalytics({ timeRange }: SupplierAnalyticsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Supplier Order Volume</CardTitle>
          <CardDescription>Number of orders placed with each supplier</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              orders: {
                label: "Orders",
                color: "hsl(var(--chart-1))",
              },
            }}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={supplierOrdersData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="supplier" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="orders" fill="var(--color-chart-1)" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Supplier Order Value</CardTitle>
          <CardDescription>Total value of orders by supplier</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              value: {
                label: "Order Value ($)",
                color: "hsl(var(--chart-2))",
              },
            }}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={supplierOrdersData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="supplier" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" fill="var(--color-chart-2)" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Supplier Performance Scorecard</CardTitle>
          <CardDescription>Key performance indicators for each supplier</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>On-Time Delivery</TableHead>
                <TableHead>Quality Score</TableHead>
                <TableHead>Cost Efficiency</TableHead>
                <TableHead>Overall Rating</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {supplierPerformanceData.map((supplier) => {
                const overallScore = Math.round((supplier.onTime + supplier.quality + supplier.cost) / 3)
                const getRatingBadge = (score: number) => {
                  if (score >= 90) return <Badge variant="default">Excellent</Badge>
                  if (score >= 80) return <Badge variant="secondary">Good</Badge>
                  if (score >= 70) return <Badge variant="outline">Fair</Badge>
                  return <Badge variant="destructive">Poor</Badge>
                }

                return (
                  <TableRow key={supplier.supplier}>
                    <TableCell className="font-medium">{supplier.supplier}</TableCell>
                    <TableCell>{supplier.orders}</TableCell>
                    <TableCell>{supplier.onTime}%</TableCell>
                    <TableCell>{supplier.quality}%</TableCell>
                    <TableCell>{supplier.cost}%</TableCell>
                    <TableCell>{getRatingBadge(overallScore)}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
