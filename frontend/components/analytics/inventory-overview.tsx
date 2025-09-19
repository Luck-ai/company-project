"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Area,
  AreaChart,
  Bar,
  BarChart,
} from "recharts"

interface InventoryOverviewProps {
  timeRange: string
}

// Mock data for clothing inventory trends
const inventoryTrendData = [
  { date: "Jan", totalValue: 1150000, totalItems: 580, turnoverRate: 12.8 },
  { date: "Feb", totalValue: 1220000, totalItems: 595, turnoverRate: 13.2 },
  { date: "Mar", totalValue: 1180000, totalItems: 605, turnoverRate: 12.5 },
  { date: "Apr", totalValue: 1285000, totalItems: 620, turnoverRate: 14.1 },
  { date: "May", totalValue: 1320000, totalItems: 635, turnoverRate: 14.5 },
  { date: "Jun", totalValue: 1240680, totalItems: 630, turnoverRate: 13.8 },
]

const stockLevelData = [
  { category: "T-Shirts", inStock: 145, lowStock: 8, outOfStock: 2 },
  { category: "Jeans", inStock: 128, lowStock: 5, outOfStock: 1 },
  { category: "Hoodies", inStock: 92, lowStock: 3, outOfStock: 1 },
  { category: "Dresses", inStock: 85, lowStock: 2, outOfStock: 0 },
  { category: "Jackets", inStock: 65, lowStock: 0, outOfStock: 1 },
  { category: "Accessories", inStock: 115, lowStock: 0, outOfStock: 0 },
]

export function InventoryOverview({ timeRange }: InventoryOverviewProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Inventory Value Trend</CardTitle>
          <CardDescription>Total inventory value and item count over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              totalValue: {
                label: "Total Value ($)",
                color: "hsl(var(--chart-1))",
              },
              totalItems: {
                label: "Total Items",
                color: "hsl(var(--chart-2))",
              },
            }}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={inventoryTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="totalValue"
                  stroke="var(--color-chart-1)"
                  fill="var(--color-chart-1)"
                  fillOpacity={0.3}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="totalItems"
                  stroke="var(--color-chart-2)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stock Levels by Category</CardTitle>
          <CardDescription>Current stock status across all categories</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              inStock: {
                label: "In Stock",
                color: "hsl(var(--chart-1))",
              },
              lowStock: {
                label: "Low Stock",
                color: "hsl(var(--chart-4))",
              },
              outOfStock: {
                label: "Out of Stock",
                color: "hsl(var(--chart-5))",
              },
            }}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stockLevelData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="inStock" stackId="a" fill="var(--color-chart-1)" />
                <Bar dataKey="lowStock" stackId="a" fill="var(--color-chart-4)" />
                <Bar dataKey="outOfStock" stackId="a" fill="var(--color-chart-5)" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inventory Turnover Rate</CardTitle>
          <CardDescription>How quickly inventory is sold and replaced</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              turnoverRate: {
                label: "Turnover Rate",
                color: "hsl(var(--chart-3))",
              },
            }}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={inventoryTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="turnoverRate" stroke="var(--color-chart-3)" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}
