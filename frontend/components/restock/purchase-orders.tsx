"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Eye, CheckCircle, Clock, AlertCircle, Package, Loader2, RefreshCw } from "lucide-react"
import { getPurchaseOrders, updatePurchaseOrder, type PurchaseOrder } from "@/lib/api"
import { useAppToast } from "@/lib/use-toast"

export function PurchaseOrders() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const { push } = useAppToast()

  useEffect(() => {
    loadOrders()
  }, [statusFilter])

  const loadOrders = async () => {
    try {
      setLoading(true)
      const filterStatus = statusFilter === "all" ? undefined : statusFilter
      const data = await getPurchaseOrders(filterStatus)
      setOrders(data)
    } catch (error) {
      console.error('Failed to load purchase orders:', error)
      push({
        title: "Error",
        description: "Failed to load purchase orders",
        variant: "error",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (orderId: number, newStatus: string) => {
    try {
      await updatePurchaseOrder(orderId, { status: newStatus })
      push({
        title: "Success",
        description: "Order status updated",
        variant: "success",
      })
      loadOrders() // Refresh the list
    } catch (error) {
      console.error('Failed to update order status:', error)
      push({
        title: "Error",
        description: "Failed to update order status",
        variant: "error",
      })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>Pending</span>
          </Badge>
        )
      case "completed":
        return (
          <Badge variant="default" className="flex items-center space-x-1 bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3" />
            <span>Completed</span>
          </Badge>
        )
      case "cancelled":
        return (
          <Badge variant="destructive" className="flex items-center space-x-1">
            <AlertCircle className="h-3 w-3" />
            <span>Cancelled</span>
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString()
  }

  const calculateTotal = (order: PurchaseOrder) => {
    if (order.product) {
      return ((order.product.price / 100) * order.quantity_ordered).toFixed(2)
    }
    return "0.00"
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading order history...</span>
        </CardContent>
      </Card>
    )
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Order History</CardTitle>
          <CardDescription>Your purchase order history will appear here</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No order history found</p>
          <p className="text-sm">Once you create purchase orders, they will appear here</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Purchase Order History</CardTitle>
              <CardDescription>View and manage your purchase orders</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={loadOrders}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Total Value</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">#{order.id}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{order.product?.name || "Unknown Product"}</p>
                      <p className="text-sm text-muted-foreground">{order.product?.sku}</p>
                    </div>
                  </TableCell>
                  <TableCell>{order.supplier?.name || "No Supplier"}</TableCell>
                  <TableCell>{order.quantity_ordered}</TableCell>
                  <TableCell>${calculateTotal(order)}</TableCell>
                  <TableCell>{formatDate(order.order_date)}</TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {order.status === "pending" && (
                        <Button 
                          size="sm" 
                          onClick={() => handleStatusUpdate(order.id, "completed")}
                        >
                          Mark Complete
                        </Button>
                      )}
                      {order.notes && (
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
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
