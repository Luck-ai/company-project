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

// Mock data for inventory trends
const inventoryTrendData = [
  { date: "Jan", totalValue: 850000, totalItems: 1250, turnoverRate: 8.2 },
  { date: "Feb", totalValue: 892000, totalItems: 1320, turnoverRate: 8.5 },
  { date: "Mar", totalValue: 876000, totalItems: 1280, turnoverRate: 7.9 },
  { date: "Apr", totalValue: 923000, totalItems: 1380, turnoverRate: 9.1 },
  { date: "May", totalValue: 945000, totalItems: 1420, turnoverRate: 9.3 },
  { date: "Jun", totalValue: 892340, totalItems: 1350, turnoverRate: 8.8 },
]

const stockLevelData = [
  { category: "Electronics", inStock: 450, lowStock: 23, outOfStock: 5 },
  { category: "Accessories", inStock: 320, lowStock: 12, outOfStock: 2 },
  { category: "Clothing", inStock: 280, lowStock: 8, outOfStock: 1 },
  { category: "Books", inStock: 150, lowStock: 15, outOfStock: 3 },
  { category: "Home & Garden", inStock: 200, lowStock: 6, outOfStock: 1 },
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
