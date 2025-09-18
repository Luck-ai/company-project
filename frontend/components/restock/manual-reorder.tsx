"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, ShoppingCart } from "lucide-react"

// Mock product data for manual reorder
const products = [
  { id: "1", name: "Wireless Headphones", sku: "WH-001", currentStock: 45, supplier: "TechCorp", unitCost: 65.99 },
  { id: "2", name: "Bluetooth Speaker", sku: "BS-002", currentStock: 8, supplier: "AudioMax", unitCost: 45.99 },
  { id: "3", name: "USB-C Cable", sku: "UC-003", currentStock: 120, supplier: "CableCo", unitCost: 12.99 },
  { id: "4", name: "Laptop Stand", sku: "LS-004", currentStock: 3, supplier: "DeskPro", unitCost: 35.99 },
  { id: "5", name: "Wireless Mouse", sku: "WM-005", currentStock: 67, supplier: "TechCorp", unitCost: 19.99 },
]

const suppliers = ["TechCorp", "AudioMax", "CableCo", "DeskPro", "GlobalSupply"]

interface OrderItem {
  productId: string
  product: string
  sku: string
  quantity: number
  unitCost: number
  totalCost: number
  supplier: string
}

export function ManualReorder() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSupplier, setSelectedSupplier] = useState("All suppliers")
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [orderNotes, setOrderNotes] = useState("")

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const addToOrder = (product: any, quantity: number) => {
    const existingItem = orderItems.find((item) => item.productId === product.id)

    if (existingItem) {
      setOrderItems(
        orderItems.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + quantity, totalCost: (item.quantity + quantity) * item.unitCost }
            : item,
        ),
      )
    } else {
      setOrderItems([
        ...orderItems,
        {
          productId: product.id,
          product: product.name,
          sku: product.sku,
          quantity,
          unitCost: product.unitCost,
          totalCost: quantity * product.unitCost,
          supplier: product.supplier,
        },
      ])
    }
  }

  const removeFromOrder = (productId: string) => {
    setOrderItems(orderItems.filter((item) => item.productId !== productId))
  }

  const updateQuantity = (productId: string, quantity: number) => {
    setOrderItems(
      orderItems.map((item) =>
        item.productId === productId ? { ...item, quantity, totalCost: quantity * item.unitCost } : item,
      ),
    )
  }

  const totalOrderValue = orderItems.reduce((sum, item) => sum + item.totalCost, 0)

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Product Selection */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Select Products</CardTitle>
            <CardDescription>Search and add products to your reorder list</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products or SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All suppliers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All suppliers">All suppliers</SelectItem>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier} value={supplier}>
                      {supplier}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{product.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {product.sku} • Stock: {product.currentStock} • ${product.unitCost}
                    </p>
                    <Badge variant="outline" className="mt-1">
                      {product.supplier}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="number"
                      placeholder="Qty"
                      className="w-20"
                      min="1"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const quantity = Number.parseInt((e.target as HTMLInputElement).value)
                          if (quantity > 0) {
                            addToOrder(product, quantity)
                            ;(e.target as HTMLInputElement).value = ""
                          }
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        const input = document.querySelector(`input[placeholder="Qty"]`) as HTMLInputElement
                        const quantity = Number.parseInt(input.value)
                        if (quantity > 0) {
                          addToOrder(product, quantity)
                          input.value = ""
                        }
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order Summary */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
            <CardDescription>Review your manual reorder before submitting</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {orderItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No items added to order yet</p>
                <p className="text-sm">Search and add products from the left panel</p>
              </div>
            ) : (
              <>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {orderItems.map((item) => (
                    <div key={item.productId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{item.product}</h4>
                        <p className="text-sm text-muted-foreground">
                          {item.sku} • ${item.unitCost} each
                        </p>
                        <Badge variant="outline">{item.supplier}</Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.productId, Number.parseInt(e.target.value) || 0)}
                          className="w-20"
                          min="1"
                        />
                        <div className="text-right">
                          <p className="font-medium">${item.totalCost.toFixed(2)}</p>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => removeFromOrder(item.productId)}>
                          ×
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-medium">Total Order Value:</span>
                    <span className="text-xl font-bold">${totalOrderValue.toFixed(2)}</span>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Order Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Add any special instructions or notes for this order..."
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                    />
                  </div>

                  <div className="flex space-x-2 mt-4">
                    <Button variant="outline" className="flex-1 bg-transparent">
                      Save Draft
                    </Button>
                    <Button className="flex-1">
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Create Order
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
