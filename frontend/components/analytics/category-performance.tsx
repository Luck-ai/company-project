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

// Mock clothing category data
const categoryRevenueData = [
  { category: "T-Shirts", revenue: 145000, growth: 18.5, margin: 38 },
  { category: "Jeans", revenue: 98000, growth: 12.3, margin: 35 },
  { category: "Hoodies", revenue: 87000, growth: 15.7, margin: 32 },
  { category: "Dresses", revenue: 76000, growth: 8.9, margin: 40 },
  { category: "Jackets", revenue: 65000, growth: 6.2, margin: 28 },
  { category: "Accessories", revenue: 45000, growth: -2.1, margin: 45 },
]

const categoryMetricsData = [
  { category: "T-Shirts", inventory: 88, sales: 95, profit: 85, satisfaction: 92 },
  { category: "Jeans", inventory: 82, sales: 88, profit: 78, satisfaction: 89 },
  { category: "Hoodies", inventory: 75, sales: 82, profit: 72, satisfaction: 88 },
  { category: "Dresses", inventory: 68, sales: 75, profit: 68, satisfaction: 85 },
  { category: "Jackets", inventory: 65, sales: 68, profit: 58, satisfaction: 82 },
  { category: "Accessories", inventory: 52, sales: 58, profit: 65, satisfaction: 78 },
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
