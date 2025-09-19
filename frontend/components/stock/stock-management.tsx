"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { SimpleUploadButton } from "./simple-upload-button"
import { Plus, Search, Package, AlertTriangle, DollarSign, Filter } from "lucide-react"
import { getProducts, getCategories } from '@/lib/api'
import { notificationManager } from '@/lib/notifications'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export interface Product {
  id: number
  name: string
  sku: string
  category_id: number | null
  description: string | null
  price: number
  quantity: number
  low_stock_threshold: number
  size: string
  color?: string
  material?: string
  brand?: string
  user_id: number | null
  last_updated: string | null
  category: { id: number; name: string } | null
}

export function StockManagement() {
  const searchParams = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedSize, setSelectedSize] = useState<string>("all")
  const [stockFilter, setStockFilter] = useState<string>(searchParams.get("filter") || "all")

  const loadData = async () => {
    try {
      setLoading(true)
      const [productsData, categoriesData] = await Promise.all([
        getProducts(),
        getCategories()
      ])
      setProducts(productsData)
      setCategories(categoriesData)
      
      // Check stock levels and trigger notifications
      const stockItems = productsData.map(p => ({
        id: p.id.toString(),
        name: p.name,
        currentStock: p.quantity,
        threshold: p.low_stock_threshold,
        category: p.category?.name || 'Unknown'
      }))
      
      // Only check notifications on initial load to avoid spam
      if (productsData.length > 0) {
        setTimeout(() => {
          notificationManager.checkStockLevels(stockItems)
        }, 2000) // Delay to allow page to load
      }
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Get unique sizes and colors for filters
  const uniqueSizes = [...new Set(products.map(p => p.size))].sort()
  const uniqueColors = [...new Set(products.map(p => p.color).filter(Boolean))].sort()

  // Filter products based on search and filters
  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category?.name.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCategory = selectedCategory === "all" || product.category?.id.toString() === selectedCategory
    const matchesSize = selectedSize === "all" || product.size === selectedSize
    
    const matchesStock = (() => {
      switch (stockFilter) {
        case "out": return product.quantity === 0
        case "low": return product.quantity > 0 && product.quantity <= product.low_stock_threshold
        case "normal": return product.quantity > product.low_stock_threshold
        default: return true
      }
    })()

    return matchesSearch && matchesCategory && matchesSize && matchesStock
  })

  // Calculate summary stats
  const outOfStockCount = products.filter(p => p.quantity === 0).length
  const lowStockCount = products.filter(p => p.quantity > 0 && p.quantity <= p.low_stock_threshold).length
  const totalProducts = products.length
  const totalValue = products.reduce((sum, product) => sum + (product.quantity * product.price), 0)

  const getStockStatus = (product: Product) => {
    if (product.quantity === 0) {
      return { label: "Out of Stock", variant: "destructive" as const }
    } else if (product.quantity <= product.low_stock_threshold) {
      return { label: "Low Stock", variant: "secondary" as const }
    }
    return { label: "In Stock", variant: "default" as const }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading inventory...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">Clothing Inventory</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage {totalProducts.toLocaleString()} SKUs across your clothing inventory</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-blue-500" onClick={() => setStockFilter("all")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="h-4 w-4 text-blue-600" />
              </div>
              <CardTitle className="text-sm font-medium">Total SKUs</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalProducts.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Active inventory items</p>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-red-500" onClick={() => setStockFilter("out")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
              <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{outOfStockCount}</div>
            <p className="text-xs text-muted-foreground">Items with zero stock</p>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-amber-500" onClick={() => setStockFilter("low")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-amber-100 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </div>
              <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{lowStockCount}</div>
            <p className="text-xs text-muted-foreground">Items below threshold</p>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-green-500" onClick={() => setStockFilter("normal")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-4 w-4 text-green-600" />
              </div>
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${totalValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Current inventory value</p>
          </CardContent>
        </Card>
      </div>

      {/* Products Table with Integrated Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Product Inventory</CardTitle>
              <CardDescription>Detailed view of all clothing SKUs</CardDescription>
            </div>
            <SimpleUploadButton onUploadComplete={loadData} />
          </div>
          
          {/* Integrated Search and Filters */}
          <div className="grid gap-4 md:grid-cols-5 mt-4">
            {/* Search */}
            <div className="relative md:col-span-2">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, SKU, brand..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>

            {/* Category Filter */}
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Size Filter */}
            <Select value={selectedSize} onValueChange={setSelectedSize}>
              <SelectTrigger>
                <SelectValue placeholder="Size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sizes</SelectItem>
                {uniqueSizes.map(size => (
                  <SelectItem key={size} value={size}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Stock Status Filter */}
            <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Stock Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stock Levels</SelectItem>
                <SelectItem value="out">Out of Stock</SelectItem>
                <SelectItem value="low">Low Stock</SelectItem>
                <SelectItem value="normal">Normal Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Showing {filteredProducts.length.toLocaleString()} of {totalProducts.toLocaleString()} SKUs
            </p>
            {(searchTerm || selectedCategory !== "all" || selectedSize !== "all" || stockFilter !== "all") && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setSearchTerm("")
                  setSelectedCategory("all")
                  setSelectedSize("all")
                  setStockFilter("all")
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">SKU</th>
                  <th className="text-left p-2">Product Name</th>
                  <th className="text-left p-2">Category</th>
                  <th className="text-left p-2">Size</th>
                  <th className="text-left p-2">Color</th>
                  <th className="text-right p-2">Stock</th>
                  <th className="text-right p-2">Price</th>
                  <th className="text-center p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.slice(0, 100).map((product) => {
                  const status = getStockStatus(product)
                  return (
                    <tr 
                      key={product.id} 
                      className="border-b hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => window.open(`/dashboard/products/${product.id}`, '_blank')}
                    >
                      <td className="p-2 font-mono text-sm">{product.sku}</td>
                      <td className="p-2">
                        <div>
                          <div className="font-medium">{product.name}</div>
                          {product.brand && (
                            <div className="text-xs text-muted-foreground">{product.brand}</div>
                          )}
                        </div>
                      </td>
                      <td className="p-2 text-sm">{product.category?.name || "—"}</td>
                      <td className="p-2">
                        <Badge variant="outline">{product.size}</Badge>
                      </td>
                      <td className="p-2 text-sm">{product.color || "—"}</td>
                      <td className="p-2 text-right font-medium">
                        {product.quantity.toLocaleString()}
                      </td>
                      <td className="p-2 text-right font-medium">
                        ${product.price.toFixed(2)}
                      </td>
                      <td className="p-2 text-center">
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filteredProducts.length > 100 && (
              <div className="mt-4 text-center text-sm text-muted-foreground">
                Showing first 100 results. Use filters to narrow down your search.
              </div>
            )}
            {filteredProducts.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No products found matching your criteria.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
