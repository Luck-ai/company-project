"use client"

import { useState } from "react"
import { Search, Eye, Grid as GridIcon, List as ListIcon, Plus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

// Reuse the mock products from products-listing for simplicity
const mockProducts = [
  { id: "1", name: "Wireless Headphones", sku: "WH-001", category: "Electronics", price: 99.99, stock: 45, status: "In Stock", image: "/wireless-headphones.png", description: "High-quality wireless headphones with noise cancellation", totalSales: 1250, monthlyGrowth: 12.5 },
  { id: "2", name: "Gaming Mouse", sku: "GM-002", category: "Electronics", price: 79.99, stock: 8, status: "Low Stock", image: "/gaming-mouse.png", description: "Precision gaming mouse with RGB lighting", totalSales: 890, monthlyGrowth: 8.3 },
  { id: "3", name: "Office Chair", sku: "OC-003", category: "Furniture", price: 299.99, stock: 0, status: "Out of Stock", image: "/ergonomic-office-chair.png", description: "Ergonomic office chair with lumbar support", totalSales: 456, monthlyGrowth: -2.1 },
]

function getStatusColor(status: string) {
  switch (status) {
    case "In Stock":
      return "bg-green-100 text-green-800"
    case "Low Stock":
      return "bg-yellow-100 text-yellow-800"
    case "Out of Stock":
      return "bg-red-100 text-red-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

export default function ProductsManager() {
  const [view, setView] = useState<"grid" | "list">("grid")
  const [search, setSearch] = useState("")

  const filtered = mockProducts.filter((p) => {
    const q = search.toLowerCase()
    return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
  })

  return (
    <div className="space-y-6">
      {/* Header and KPIs */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stock Management</h1>
          <p className="text-muted-foreground">Manage your inventory and track stock levels</p>
        </div>

        <div className="flex gap-2 items-center">
          <Button variant="outline" size="sm">
            <Plus className="mr-2" /> Add Product
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Total Products</p>
            <div className="text-2xl font-bold">{mockProducts.length}</div>
            <p className="text-xs text-muted-foreground">Active inventory items</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Low Stock Items</p>
            <div className="text-2xl font-bold">{mockProducts.filter((p) => p.stock <= 10).length}</div>
            <p className="text-xs text-muted-foreground">Items below threshold</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Total Value</p>
            <div className="text-2xl font-bold">${mockProducts.reduce((s, p) => s + p.price * p.stock, 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Current inventory value</p>
          </CardContent>
        </Card>
      </div>

      {/* Inventory search and controls */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input placeholder="Search products, SKU, or category..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          <div className="flex items-center gap-2">
            <Button variant={view === "grid" ? "default" : "outline"} size="sm" onClick={() => setView("grid") }>
              <GridIcon className="mr-2" /> Grid
            </Button>
            <Button variant={view === "list" ? "default" : "outline"} size="sm" onClick={() => setView("list") }>
              <ListIcon className="mr-2" /> List
            </Button>
          </div>
        </div>

        {view === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((product) => (
              <Card key={product.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <img src={product.image || "/placeholder.svg"} alt={product.name} className="w-12 h-12 rounded-lg object-cover" />
                      <div>
                        <CardTitle className="text-lg">{product.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{product.sku}</p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(product.status)}>
                      <span className="ml-1">{product.status}</span>
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold">${product.price}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span>{product.stock} units</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">{product.totalSales} sales</span>
                      <Badge variant={product.monthlyGrowth > 0 ? "default" : "destructive"}>{product.monthlyGrowth > 0 ? "+" : ""}{product.monthlyGrowth}%</Badge>
                    </div>
                    <Button size="sm" variant="outline"><Eye className="h-4 w-4 mr-1" />View</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-2 bg-muted/30 rounded-md p-2">
            <div className="grid grid-cols-12 gap-4 py-2 px-3 text-sm font-semibold text-muted-foreground">
              <div className="col-span-1">#</div>
              <div className="col-span-3">Product</div>
              <div className="col-span-2">SKU</div>
              <div className="col-span-2">Category</div>
              <div className="col-span-1 text-center">Quantity</div>
              <div className="col-span-1">Price</div>
              <div className="col-span-1">Status</div>
            </div>

            {filtered.map((p, idx) => (
              <div key={p.id} className="grid grid-cols-12 gap-4 items-center py-3 px-3 border-b">
                <div className="col-span-1">
                  <input type="checkbox" aria-label={`select-${p.id}`} />
                </div>
                <div className="col-span-3 flex items-center gap-3">
                  <img src={p.image || "/placeholder.svg"} alt={p.name} className="w-10 h-10 rounded object-cover" />
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.description}</div>
                  </div>
                </div>
                <div className="col-span-2">{p.sku}</div>
                <div className="col-span-2">{p.category}</div>
                <div className="col-span-1 text-center">{p.stock} {p.stock === 0 ? <span className="text-red-600 ml-1">!</span> : null}</div>
                <div className="col-span-1">${p.price}</div>
                <div className="col-span-1"><Badge className={getStatusColor(p.status)}>{p.status}</Badge></div>
                <div className="col-span-1 flex justify-end gap-2">
                  <Button variant="ghost" size="sm" className="text-muted-foreground">View</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
