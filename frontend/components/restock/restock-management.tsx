"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Settings, RefreshCw, Plus, Download, History } from "lucide-react"
import { AutoReorderSuggestions } from "./auto-reorder-suggestions"
import { PurchaseOrders } from "./purchase-orders"
import { getRestockSummary, type RestockSummary } from "@/lib/api"
import { useAppToast } from "@/lib/use-toast"

export function RestockManagement() {
  const [showHistory, setShowHistory] = useState(false)
  const [summary, setSummary] = useState<RestockSummary>({
    pending_orders: 0,
    low_stock_items: 0,
    out_of_stock_items: 0,
    total_pending_value: 0,
  })
  const [loading, setLoading] = useState(true)
  const { push } = useAppToast()

  useEffect(() => {
    loadSummary()
  }, [])

  const loadSummary = async () => {
    try {
      setLoading(true)
      const data = await getRestockSummary()
      setSummary(data)
    } catch (error) {
      console.error('Failed to load restock summary:', error)
      push({
        title: "Error",
        description: "Failed to load restock summary",
        variant: "error",
      })
    } finally {
      setLoading(false)
    }
  }

  const refreshData = () => {
    loadSummary()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Restock Management</h1>
            <p className="text-muted-foreground">
              {showHistory ? "View and manage purchase order history" : "Manage inventory replenishment and create orders"}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Orders
            </Button>
            <Button variant="outline" onClick={refreshData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button 
              variant={showHistory ? "default" : "outline"} 
              onClick={() => setShowHistory(!showHistory)}
            >
              <History className="h-4 w-4 mr-2" />
              {showHistory ? "Show Suggestions" : "Order History"}
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "..." : summary.pending_orders}</div>
              <p className="text-xs text-muted-foreground">Active purchase orders</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
              <RefreshCw className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{loading ? "..." : summary.low_stock_items}</div>
              <p className="text-xs text-muted-foreground">Items below threshold</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Order Value</CardTitle>
              <RefreshCw className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${loading ? "..." : summary.total_pending_value.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Pending order value</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
              <RefreshCw className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{loading ? "..." : summary.out_of_stock_items}</div>
              <p className="text-xs text-muted-foreground">Items completely out</p>
            </CardContent>
          </Card>
        </div>

        {/* Content */}
        {showHistory ? (
          <PurchaseOrders />
        ) : (
          <AutoReorderSuggestions />
        )}
    </div>
  )
}
