"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

interface CategoryPerformanceProps {
  timeRange: string
}

// Mock category data
const categoryRevenueData = [
  { category: "Electronics", revenue: 125000, growth: 15.2, margin: 35 },
  { category: "Accessories", revenue: 78000, growth: 8.7, margin: 42 },
  { category: "Clothing", revenue: 45000, growth: -2.1, margin: 28 },
  { category: "Books", revenue: 23000, growth: -8.5, margin: 18 },
  { category: "Home & Garden", revenue: 34000, growth: 12.3, margin: 31 },
]

const categoryMetricsData = [
  { category: "Electronics", inventory: 85, sales: 92, profit: 78, satisfaction: 88 },
  { category: "Accessories", inventory: 78, sales: 85, profit: 82, satisfaction: 91 },
  { category: "Clothing", inventory: 65, sales: 58, profit: 45, satisfaction: 75 },
  { category: "Books", inventory: 45, sales: 42, profit: 35, satisfaction: 82 },
  { category: "Home & Garden", inventory: 72, sales: 68, profit: 65, satisfaction: 86 },
]

export function CategoryPerformance({ timeRange }: CategoryPerformanceProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Revenue by Category</CardTitle>
          <CardDescription>Category performance and growth rates</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              revenue: {
                label: "Revenue ($)",
                color: "hsl(var(--chart-1))",
              },
            }}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryRevenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="revenue" fill="var(--color-chart-1)" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Category Performance Radar</CardTitle>
          <CardDescription>Multi-dimensional performance analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              inventory: {
                label: "Inventory",
                color: "hsl(var(--chart-1))",
              },
              sales: {
                label: "Sales",
                color: "hsl(var(--chart-2))",
              },
              profit: {
                label: "Profit",
                color: "hsl(var(--chart-3))",
              },
              satisfaction: {
                label: "Satisfaction",
                color: "hsl(var(--chart-4))",
              },
            }}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={categoryMetricsData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="category" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} />
                <Radar
                  name="Performance"
                  dataKey="sales"
                  stroke="var(--color-chart-2)"
                  fill="var(--color-chart-2)"
                  fillOpacity={0.3}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
              </RadarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Category Details</CardTitle>
          <CardDescription>Detailed performance metrics for each category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {categoryRevenueData.map((category) => (
              <div key={category.category} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{category.category}</h4>
                    <Badge variant={category.growth > 0 ? "default" : "destructive"}>
                      {category.growth > 0 ? "+" : ""}
                      {category.growth}%
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Revenue</p>
                      <p className="font-medium">${category.revenue.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Margin</p>
                      <p className="font-medium">{category.margin}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Performance</p>
                      <Progress value={category.margin} className="h-2 mt-1" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
