"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertTriangle, Package, TrendingDown, Clock } from "lucide-react"

// Mock alert data
const stockAlerts = [
  {
    id: "1",
    product: "Bluetooth Speaker",
    sku: "BS-002",
    currentStock: 8,
    threshold: 15,
    category: "Electronics",
    supplier: "AudioMax",
    lastRestock: "2024-01-10",
    priority: "high",
    type: "low_stock",
  },
  {
    id: "2",
    product: "Laptop Stand",
    sku: "LS-004",
    currentStock: 3,
    threshold: 5,
    category: "Accessories",
    supplier: "DeskPro",
    lastRestock: "2024-01-08",
    priority: "high",
    type: "low_stock",
  },
  {
    id: "3",
    product: "Gaming Keyboard",
    sku: "GK-006",
    currentStock: 0,
    threshold: 10,
    category: "Electronics",
    supplier: "TechCorp",
    lastRestock: "2024-01-05",
    priority: "critical",
    type: "out_of_stock",
  },
  {
    id: "4",
    product: "Wireless Charger",
    sku: "WC-007",
    currentStock: 12,
    threshold: 20,
    category: "Accessories",
    supplier: "TechCorp",
    lastRestock: "2024-01-12",
    priority: "medium",
    type: "low_stock",
  },
  {
    id: "5",
    product: "USB Hub",
    sku: "UH-008",
    currentStock: 0,
    threshold: 15,
    category: "Accessories",
    supplier: "CableCo",
    lastRestock: "2024-01-03",
    priority: "critical",
    type: "out_of_stock",
  },
]

export function StockAlerts() {
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "critical":
        return <Badge variant="destructive">Critical</Badge>
      case "high":
        return <Badge variant="secondary">High</Badge>
      case "medium":
        return <Badge variant="outline">Medium</Badge>
      default:
        return <Badge variant="default">Low</Badge>
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "out_of_stock":
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case "low_stock":
        return <Package className="h-4 w-4 text-yellow-500" />
      default:
        return <TrendingDown className="h-4 w-4 text-blue-500" />
    }
  }

  const criticalAlerts = stockAlerts.filter((alert) => alert.priority === "critical").length
  const highAlerts = stockAlerts.filter((alert) => alert.priority === "high").length
  const totalAlerts = stockAlerts.length

  return (
    <div className="space-y-4">
      {/* Alert Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{criticalAlerts}</div>
            <p className="text-xs text-muted-foreground">Require immediate attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
            <Package className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{highAlerts}</div>
            <p className="text-xs text-muted-foreground">Need restocking soon</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAlerts}</div>
            <p className="text-xs text-muted-foreground">Active stock alerts</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Stock Alerts</CardTitle>
          <CardDescription>Items requiring attention due to low or zero stock levels</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Current Stock</TableHead>
                <TableHead>Threshold</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stockAlerts.map((alert) => (
                <TableRow key={alert.id}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {getTypeIcon(alert.type)}
                      <span className="font-medium">{alert.product}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{alert.sku}</TableCell>
                  <TableCell>
                    <span
                      className={alert.currentStock === 0 ? "text-red-600 font-bold" : "text-yellow-600 font-medium"}
                    >
                      {alert.currentStock}
                    </span>
                  </TableCell>
                  <TableCell>{alert.threshold}</TableCell>
                  <TableCell>{alert.category}</TableCell>
                  <TableCell>{alert.supplier}</TableCell>
                  <TableCell>{getPriorityBadge(alert.priority)}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button size="sm" variant="outline">
                        Reorder
                      </Button>
                      <Button size="sm" variant="ghost">
                        View
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
