"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { TrendingUp, Package, DollarSign } from "lucide-react"

// Mock restock history data
const restockHistory = [
  {
    id: "1",
    date: "2024-01-15",
    product: "Wireless Headphones",
    sku: "WH-001",
    quantity: 50,
    supplier: "TechCorp",
    unitCost: 65.99,
    totalCost: 3299.5,
    type: "automatic",
    reason: "Below threshold",
  },
  {
    id: "2",
    date: "2024-01-14",
    product: "Bluetooth Speaker",
    sku: "BS-002",
    quantity: 30,
    supplier: "AudioMax",
    unitCost: 45.99,
    totalCost: 1379.7,
    type: "manual",
    reason: "Manual reorder",
  },
  {
    id: "3",
    date: "2024-01-12",
    product: "USB-C Cable",
    sku: "UC-003",
    quantity: 100,
    supplier: "CableCo",
    unitCost: 12.99,
    totalCost: 1299.0,
    type: "automatic",
    reason: "High demand",
  },
  {
    id: "4",
    date: "2024-01-10",
    product: "Laptop Stand",
    sku: "LS-004",
    quantity: 25,
    supplier: "DeskPro",
    unitCost: 35.99,
    totalCost: 899.75,
    type: "manual",
    reason: "Seasonal demand",
  },
  {
    id: "5",
    date: "2024-01-08",
    product: "Wireless Mouse",
    sku: "WM-005",
    quantity: 40,
    supplier: "TechCorp",
    unitCost: 19.99,
    totalCost: 799.6,
    type: "automatic",
    reason: "Below threshold",
  },
]

// Mock trend data
const restockTrendData = [
  { month: "Jul", orders: 12, value: 15400 },
  { month: "Aug", orders: 15, value: 18200 },
  { month: "Sep", orders: 11, value: 14800 },
  { month: "Oct", orders: 18, value: 22100 },
  { month: "Nov", orders: 16, value: 19500 },
  { month: "Dec", orders: 14, value: 17300 },
  { month: "Jan", orders: 20, value: 24800 },
]

export function RestockHistory() {
  const totalRestocks = restockHistory.length
  const totalValue = restockHistory.reduce((sum, item) => sum + item.totalCost, 0)
  const automaticRestocks = restockHistory.filter((item) => item.type === "automatic").length

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Restocks</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRestocks}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Restock investment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Automatic Orders</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{automaticRestocks}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((automaticRestocks / totalRestocks) * 100)}% of total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Restock Trends</CardTitle>
          <CardDescription>Monthly restock orders and spending over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              orders: {
                label: "Orders",
                color: "hsl(var(--chart-1))",
              },
              value: {
                label: "Value ($)",
                color: "hsl(var(--chart-2))",
              },
            }}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={restockTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line yAxisId="left" type="monotone" dataKey="orders" stroke="var(--color-chart-1)" strokeWidth={2} />
                <Line yAxisId="right" type="monotone" dataKey="value" stroke="var(--color-chart-2)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Restock History</CardTitle>
          <CardDescription>Complete log of all restock activities</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Unit Cost</TableHead>
                <TableHead>Total Cost</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {restockHistory.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.date}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{item.product}</p>
                      <p className="text-sm text-muted-foreground">{item.sku}</p>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{item.quantity}</TableCell>
                  <TableCell>{item.supplier}</TableCell>
                  <TableCell>${item.unitCost}</TableCell>
                  <TableCell className="font-medium">${item.totalCost.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={item.type === "automatic" ? "default" : "secondary"}>
                      {item.type === "automatic" ? "Auto" : "Manual"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{item.reason}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
