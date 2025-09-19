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
  Bar,
  BarChart,
  Pie,
  PieChart,
  Cell,
} from "recharts"

interface SalesAnalyticsProps {
  timeRange: string
}

// Mock clothing sales data
const salesTrendData = [
  { month: "Jan", revenue: 58000, orders: 285, avgOrderValue: 203 },
  { month: "Feb", revenue: 67000, orders: 335, avgOrderValue: 200 },
  { month: "Mar", revenue: 72000, orders: 360, avgOrderValue: 200 },
  { month: "Apr", revenue: 89000, orders: 425, avgOrderValue: 209 },
  { month: "May", revenue: 95000, orders: 456, avgOrderValue: 208 },
  { month: "Jun", revenue: 105000, orders: 512, avgOrderValue: 205 },
]

const topProductsData = [
  { name: "Classic White T-Shirt", sales: 324, revenue: 9720 },
  { name: "Slim Fit Jeans", sales: 256, revenue: 15360 },
  { name: "Cotton Hoodie", sales: 198, revenue: 13860 },
  { name: "Summer Dress", sales: 167, revenue: 11690 },
  { name: "Denim Jacket", sales: 134, revenue: 10720 },
]

const salesChannelData = [
  { name: "Online Store", value: 45, color: "hsl(var(--chart-1))" },
  { name: "Retail Partners", value: 30, color: "hsl(var(--chart-2))" },
  { name: "Direct Sales", value: 15, color: "hsl(var(--chart-3))" },
  { name: "Marketplace", value: 10, color: "hsl(var(--chart-4))" },
]

export function SalesAnalytics({ timeRange }: SalesAnalyticsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Sales Revenue Trend</CardTitle>
          <CardDescription>Monthly revenue and order volume</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              revenue: {
                label: "Revenue ($)",
                color: "hsl(var(--chart-1))",
              },
              orders: {
                label: "Orders",
                color: "hsl(var(--chart-2))",
              },
            }}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar yAxisId="left" dataKey="revenue" fill="var(--color-chart-1)" />
                <Line yAxisId="right" type="monotone" dataKey="orders" stroke="var(--color-chart-2)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top Selling Products</CardTitle>
          <CardDescription>Best performing products by sales volume</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              sales: {
                label: "Units Sold",
                color: "hsl(var(--chart-3))",
              },
            }}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProductsData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="sales" fill="var(--color-chart-3)" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sales Channels</CardTitle>
          <CardDescription>Revenue distribution by sales channel</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              value: {
                label: "Percentage",
                color: "hsl(var(--chart-1))",
              },
            }}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={salesChannelData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {salesChannelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}
