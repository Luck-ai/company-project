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

// Mock sales data
const salesTrendData = [
  { month: "Jan", revenue: 45000, orders: 180, avgOrderValue: 250 },
  { month: "Feb", revenue: 52000, orders: 208, avgOrderValue: 250 },
  { month: "Mar", revenue: 48000, orders: 192, avgOrderValue: 250 },
  { month: "Apr", revenue: 61000, orders: 244, avgOrderValue: 250 },
  { month: "May", revenue: 55000, orders: 220, avgOrderValue: 250 },
  { month: "Jun", revenue: 67000, orders: 268, avgOrderValue: 250 },
]

const topProductsData = [
  { name: "Wireless Headphones", sales: 245, revenue: 24495 },
  { name: "Bluetooth Speaker", sales: 189, revenue: 15111 },
  { name: "USB-C Cable", sales: 156, revenue: 3118 },
  { name: "Wireless Mouse", sales: 134, revenue: 4016 },
  { name: "Laptop Stand", sales: 98, revenue: 4899 },
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
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
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
