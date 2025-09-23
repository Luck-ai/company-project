"use client"

import React, { useState, useEffect, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SimpleUploadButton } from "./simple-upload-button"
import { Search, Package, AlertTriangle, Settings } from "lucide-react"
import { getProducts, getCategories } from '@/lib/api'
import { FixedSizeList as List } from 'react-window'
import { notificationManager } from '@/lib/notifications'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export interface Product {
  id: number
  name: string
  sku: string
  category_id: number | null
  description: string | null
  quantity: number
  low_stock_threshold: number
  size: string
  material?: string
  brand?: string
  user_id: number | null
  last_updated: string | null
  category: { id: number; name: string } | null
  // Enhanced fields for inventory management
  cost_price?: number
  selling_price?: number
  supplier?: string
  lead_time_days?: number
  color?: string
  season?: string
  collection?: string
  // Sales data for forecasting
  daily_sales_rate?: number
  weekly_sales_rate?: number
  monthly_sales?: number
  days_until_stockout?: number
  reorder_point?: number
  recommended_reorder_qty?: number
  inventory_value?: number
  profit_margin?: number
  sales_trend?: 'increasing' | 'stable' | 'decreasing'
}

export function StockManagement() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [baselineThreshold, setBaselineThreshold] = useState<number | ''>('')
  const [searchTerm, setSearchTerm] = useState("")
  const [typeahead, setTypeahead] = useState<string>("")
  const [suggestions, setSuggestions] = useState<Product[]>([])
  const typeaheadTimer = useRef<number | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedSize, setSelectedSize] = useState<string>("all")
  const [stockFilter, setStockFilter] = useState<string>(() => {
    const filter = searchParams.get("filter")
    // Map inventory summary filters to appropriate stock/reorder filters
    if (filter === "urgent" || filter === "needed" || filter === "slow" || filter === "dead") {
      return "all" // These go to reorderFilter instead
    }
    return filter || "all"
  })
  const [reorderFilter, setReorderFilter] = useState<string>(() => {
    const filter = searchParams.get("filter")
    // Handle reorder-specific filters from URL
    if (filter === "urgent" || filter === "needed" || filter === "slow" || filter === "dead") {
      return filter
    }
    return "all"
  })
  const [page, setPage] = useState(1)
  const [pageSize] = useState(50) // Fixed page size for better performance
  const [defaultLeadTime, setDefaultLeadTime] = useState<number>(14) // Default 14 days lead time
  const [showSettings, setShowSettings] = useState(false) // Toggle for settings panel

  // Initialize settings from localStorage
  useEffect(() => {
    try {
      const savedThreshold = localStorage.getItem('baselineLowStockThreshold')
      const savedLeadTime = localStorage.getItem('defaultLeadTime')
      
      if (savedThreshold && savedThreshold !== '') {
        setBaselineThreshold(Number(savedThreshold))
      } else {
        setBaselineThreshold(10) // Default value
      }
      
      if (savedLeadTime && savedLeadTime !== '') {
        setDefaultLeadTime(Number(savedLeadTime))
      } else {
        setDefaultLeadTime(14) // Default 14 days
      }
    } catch (e) {
      setBaselineThreshold(10)
      setDefaultLeadTime(14)
    }
  }, [])

  // Helper function to calculate consistent days since last sale
  const getDaysSinceLastSale = (productId: number) => {
    return (productId * 7) % 120 // Deterministic value between 0-119
  }

  // Helper function to get baseline threshold value
  const getBaselineThreshold = () => {
    return typeof baselineThreshold === 'number' ? baselineThreshold : 0
  }

  // Get unique values for filter dropdowns
  const uniqueSizes = React.useMemo(() => {
    const sizes = Array.from(new Set(products.map(p => p.size).filter(Boolean)))
    return sizes.sort()
  }, [products])



  // Calculate inventory forecasting metrics
  const enhancedProducts = React.useMemo(() => {
    return products.map(p => {
      // Mock sales data - in real app, this would come from sales CSV uploads
      const dailySalesRate = p.daily_sales_rate || Math.random() * 5 + 0.5
      const daysUntilStockout = dailySalesRate > 0 ? Math.floor(p.quantity / dailySalesRate) : 999
      const leadTime = p.lead_time_days || defaultLeadTime
      const reorderPoint = Math.max(p.low_stock_threshold, leadTime * dailySalesRate)
      const recommendedReorderQty = Math.ceil(dailySalesRate * 30) // 30 days supply
      const inventoryValue = (p.cost_price || 0) * p.quantity
      const profitMargin = p.selling_price && p.cost_price ? 
        ((p.selling_price - p.cost_price) / p.selling_price) * 100 : 0

      return {
        ...p,
        daily_sales_rate: dailySalesRate,
        days_until_stockout: daysUntilStockout,
        reorder_point: reorderPoint,
        recommended_reorder_qty: recommendedReorderQty,
        inventory_value: inventoryValue,
        profit_margin: profitMargin,
        sales_trend: (daysUntilStockout < 7 ? 'increasing' : 
                     daysUntilStockout < 30 ? 'stable' : 'decreasing') as 'increasing' | 'stable' | 'decreasing'
      }
    })
  }, [products, defaultLeadTime])

  // Apply all filters to products
  const filteredProducts = React.useMemo(() => {
    let filtered = enhancedProducts

    // Search filter
    if (searchTerm) {
      const query = searchTerm.toLowerCase()
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query) ||
        p.brand?.toLowerCase().includes(query) ||
        p.category?.name.toLowerCase().includes(query) ||
        p.color?.toLowerCase().includes(query) ||
        p.supplier?.toLowerCase().includes(query)
      )
    }

    // Category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter(p => p.category_id?.toString() === selectedCategory)
    }

    // Size filter
    if (selectedSize !== "all") {
      filtered = filtered.filter(p => p.size === selectedSize)
    }



    // Stock status filter
    if (stockFilter !== "all") {
      const baselineVal = getBaselineThreshold()
      filtered = filtered.filter(p => {
        const threshold = p.low_stock_threshold ?? baselineVal
        switch (stockFilter) {
          case "out":
            return p.quantity === 0
          case "low":
            return p.quantity > 0 && p.quantity <= threshold
          case "normal":
            return p.quantity > threshold
          default:
            return true
        }
      })
    }

    // Reorder filter
    if (reorderFilter !== "all") {
      filtered = filtered.filter(p => {
        // Generate consistent days since last sale based on product ID (same as status display)
        const daysSinceLastSale = (p.id * 7) % 120
        
        switch (reorderFilter) {
          case "urgent":
            return p.days_until_stockout! < 7
          case "needed":
            return p.quantity <= (p.low_stock_threshold ?? getBaselineThreshold())
          case "recommended":
            return p.days_until_stockout! < 30
          case "slow":
            return daysSinceLastSale > 60 && daysSinceLastSale <= 90 // 60-90 days without sales
          case "dead":
            return daysSinceLastSale > 90 // 90+ days without sales
          default:
            return true
        }
      })
    }

    return filtered
  }, [enhancedProducts, searchTerm, selectedCategory, selectedSize, stockFilter, reorderFilter, baselineThreshold])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [searchTerm, selectedCategory, selectedSize, stockFilter, reorderFilter])

  // Pagination calculations
  const pageCount = Math.ceil(filteredProducts.length / pageSize)
  const currentPageItems = React.useMemo(() => {
    const startIndex = (page - 1) * pageSize
    const endIndex = startIndex + pageSize
    return filteredProducts.slice(startIndex, endIndex)
  }, [filteredProducts, page, pageSize])

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
      console.error('Failed to load inventory data:', error)
      // You could add a toast notification here
    } finally {
      setLoading(false)
    }
  }

  // Load data on component mount
  useEffect(() => {
    loadData()
  }, [])

  // Typeahead debounce and suggestions (client-side)
  useEffect(() => {
    if (typeaheadTimer.current) window.clearTimeout(typeaheadTimer.current)
    if (!typeahead) {
      setSuggestions([])
      return
    }
    typeaheadTimer.current = window.setTimeout(() => {
      const q = typeahead.toLowerCase()
      const matches = products.filter(p =>
        p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.brand?.toLowerCase().includes(q)
      )
      setSuggestions(matches.slice(0, 10))
    }, 250)
    return () => { if (typeaheadTimer.current) window.clearTimeout(typeaheadTimer.current) }
  }, [typeahead, products])

  // Calculate business-critical summary stats
  const totalProducts = products.length
  const outOfStockCount = enhancedProducts.filter(p => p.quantity === 0).length
  const urgentReorderCount = enhancedProducts.filter(p => p.days_until_stockout! < 7).length
  const needsReorderCount = enhancedProducts.filter(p => 
    p.quantity <= (p.low_stock_threshold ?? getBaselineThreshold())
  ).length

  const stockoutRisk = enhancedProducts.filter(p => p.days_until_stockout! < 14).length

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading inventory...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">Clothing Inventory</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage {totalProducts.toLocaleString()} SKUs • 
            Default lead time: {defaultLeadTime} days • 
            Baseline threshold: {typeof baselineThreshold === 'number' ? baselineThreshold : 'Not set'}
            {(reorderFilter !== "all" || stockFilter !== "all") && (
              <span className="ml-2 text-blue-600 font-medium">
                • Filter active: {
                  reorderFilter !== "all" ? 
                    reorderFilter === "urgent" ? "Urgent items" :
                    reorderFilter === "needed" ? "Reorder needed" :
                    reorderFilter === "slow" ? "Slow moving" :
                    reorderFilter === "dead" ? "Dead stock" :
                    reorderFilter === "recommended" ? "Recommended" : reorderFilter
                  : 
                    stockFilter === "out" ? "Out of stock" :
                    stockFilter === "low" ? "Low stock" :
                    stockFilter === "normal" ? "Normal stock" : stockFilter
                }
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Inventory Settings
            </CardTitle>
            <CardDescription>
              Configure default values for inventory calculations and thresholds
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              {/* Baseline Low Stock Threshold */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Baseline Low-Stock Threshold</label>
                <div className="flex items-center gap-3">
                  <div className="flex items-center border rounded-md overflow-hidden">
                    <button
                      className="px-2 py-1 bg-muted hover:bg-muted/80"
                      onClick={() => {
                        const cur = typeof baselineThreshold === 'number' ? baselineThreshold : 0
                        const v = Math.max(0, cur - 1)
                        setBaselineThreshold(v)
                        try { localStorage.setItem('baselineLowStockThreshold', String(v)) } catch (e) {}
                      }}
                    >-</button>
                    <Input
                      type="number"
                      min={0}
                      value={baselineThreshold}
                      onChange={(e) => {
                        const raw = e.target.value
                        if (raw === '') {
                          setBaselineThreshold('')
                          try { localStorage.setItem('baselineLowStockThreshold', '') } catch (e) {}
                          return
                        }
                        const v = Math.max(0, Number(raw))
                        setBaselineThreshold(v)
                        try { localStorage.setItem('baselineLowStockThreshold', String(v)) } catch (e) {}
                      }}
                      className="w-20 text-center border-0"
                    />
                    <button
                      className="px-2 py-1 bg-muted hover:bg-muted/80"
                      onClick={() => {
                        const cur = typeof baselineThreshold === 'number' ? baselineThreshold : 0
                        const v = cur + 1
                        setBaselineThreshold(v)
                        try { localStorage.setItem('baselineLowStockThreshold', String(v)) } catch (e) {}
                      }}
                    >+</button>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={50}
                    value={typeof baselineThreshold === 'number' ? baselineThreshold : 0}
                    onChange={(e) => {
                      const v = Number(e.target.value)
                      setBaselineThreshold(v)
                      try { localStorage.setItem('baselineLowStockThreshold', String(v)) } catch (e) {}
                    }}
                    className="flex-1"
                  />
                </div>
                <div className="flex gap-2">
                  {[5,10,15,20].map(preset => (
                    <button
                      key={preset}
                      className="px-3 py-1 rounded bg-accent/10 hover:bg-accent/20 text-sm"
                      onClick={() => {
                        setBaselineThreshold(preset)
                        try { localStorage.setItem('baselineLowStockThreshold', String(preset)) } catch (e) {}
                      }}
                    >{preset}</button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (baselineThreshold === '') return
                    const applyVal = typeof baselineThreshold === 'number' ? baselineThreshold : 0
                    const updated = products.map(p => ({ ...p, low_stock_threshold: applyVal }))
                    setProducts(updated)
                    notificationManager.resetFirstRunFlag()
                    notificationManager.checkStockLevels(updated.map(p => ({
                      id: p.id.toString(),
                      name: p.name,
                      currentStock: p.quantity,
                      threshold: p.low_stock_threshold ?? applyVal,
                      category: p.category?.name || 'Unknown'
                    })))
                  }}
                  disabled={baselineThreshold === ''}
                  className="w-full"
                >
                  Apply to all SKUs
                </Button>
                <p className="text-xs text-muted-foreground">Used when a product's low-stock threshold is not set.</p>
              </div>

              {/* Default Lead Time */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Default Lead Time (Days)</label>
                <div className="flex items-center gap-3">
                  <div className="flex items-center border rounded-md overflow-hidden">
                    <button
                      className="px-2 py-1 bg-muted hover:bg-muted/80"
                      onClick={() => {
                        const v = Math.max(1, defaultLeadTime - 1)
                        setDefaultLeadTime(v)
                        try { localStorage.setItem('defaultLeadTime', String(v)) } catch (e) {}
                      }}
                    >-</button>
                    <Input
                      type="number"
                      min={1}
                      value={defaultLeadTime}
                      onChange={(e) => {
                        const v = Math.max(1, Number(e.target.value) || 1)
                        setDefaultLeadTime(v)
                        try { localStorage.setItem('defaultLeadTime', String(v)) } catch (e) {}
                      }}
                      className="w-20 text-center border-0"
                    />
                    <button
                      className="px-2 py-1 bg-muted hover:bg-muted/80"
                      onClick={() => {
                        const v = defaultLeadTime + 1
                        setDefaultLeadTime(v)
                        try { localStorage.setItem('defaultLeadTime', String(v)) } catch (e) {}
                      }}
                    >+</button>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={90}
                    value={defaultLeadTime}
                    onChange={(e) => {
                      const v = Number(e.target.value)
                      setDefaultLeadTime(v)
                      try { localStorage.setItem('defaultLeadTime', String(v)) } catch (e) {}
                    }}
                    className="flex-1"
                  />
                </div>
                <div className="flex gap-2">
                  {[7,14,21,30].map(preset => (
                    <button
                      key={preset}
                      className="px-3 py-1 rounded bg-accent/10 hover:bg-accent/20 text-sm"
                      onClick={() => {
                        setDefaultLeadTime(preset)
                        try { localStorage.setItem('defaultLeadTime', String(preset)) } catch (e) {}
                      }}
                    >{preset}d</button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const updated = products.map(p => ({ ...p, lead_time_days: defaultLeadTime }))
                    setProducts(updated)
                  }}
                  className="w-full"
                >
                  Apply to all SKUs
                </Button>
                <p className="text-xs text-muted-foreground">Time from order to delivery. Used for reorder point calculations.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Business Intelligence Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-red-500" onClick={() => setReorderFilter("urgent")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
              <CardTitle className="text-sm font-medium">Urgent Reorders</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{urgentReorderCount}</div>
            <p className="text-xs text-muted-foreground">Stockout in &lt;7 days</p>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-amber-500" onClick={() => setReorderFilter("needed")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Package className="h-4 w-4 text-amber-600" />
              </div>
              <CardTitle className="text-sm font-medium">Reorder Needed</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{needsReorderCount}</div>
            <p className="text-xs text-muted-foreground">Below reorder point</p>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-orange-500" onClick={() => setStockFilter("out")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
              </div>
              <CardTitle className="text-sm font-medium">Stockout Risk</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stockoutRisk}</div>
            <p className="text-xs text-muted-foreground">Risk in 14 days</p>
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
          <div className="space-y-4 mt-4">
            {/* Search and Filters */}
            <div className="grid gap-4 md:grid-cols-6">
              {/* Search */}
              <div className="relative md:col-span-2">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, SKU, brand, color, supplier..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setTypeahead(e.target.value)
                  }}
                  className="pl-8"
                />

                {/* Typeahead dropdown */}
                {typeahead && (
                  <div className="absolute left-0 right-0 top-12 bg-popover shadow rounded-md z-50">
                    {suggestions.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">No suggestions</div>
                    ) : (
                      suggestions.slice(0, 10).map(s => (
                        <div
                          key={s.id}
                          className="p-2 hover:bg-muted/50 cursor-pointer"
                          onClick={() => {
                            setSearchTerm(s.name)
                            setTypeahead("")
                            setSuggestions([])
                          }}
                        >
                          <div className="font-medium">{s.name}</div>
                          <div className="text-xs text-muted-foreground">{s.sku} • {s.size} • {s.brand}</div>
                        </div>
                      ))
                    )}
                  </div>
                )}
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
                  <SelectItem value="out">🔴 Out of Stock</SelectItem>
                  <SelectItem value="low">🟡 Low Stock</SelectItem>
                  <SelectItem value="normal">🟢 Normal Stock</SelectItem>
                </SelectContent>
              </Select>

              {/* Reorder Filter */}
              <Select value={reorderFilter} onValueChange={setReorderFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Reorder Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Items</SelectItem>
                  <SelectItem value="urgent">🔴 Urgent (&lt;7 days)</SelectItem>
                  <SelectItem value="needed">🟡 Reorder Needed</SelectItem>
                  <SelectItem value="recommended">🟠 Recommended (&lt;30 days)</SelectItem>
                  <SelectItem value="slow">🟣 Slow Moving (60+ days)</SelectItem>
                  <SelectItem value="dead">⚫ Dead Stock (90+ days)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Clear All Filters Button */}
            <div className="mt-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setSearchTerm("")
                  setSelectedCategory("all")
                  setSelectedSize("all")
                  setStockFilter("all")
                  setReorderFilter("all")
                }}
              >
                Clear All Filters
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-4">
              <p className="text-sm text-muted-foreground">
                Showing {filteredProducts.length.toLocaleString()} of {totalProducts.toLocaleString()} SKUs
              </p>
              
              {/* Contextual Filter Info */}
              {(reorderFilter !== "all" || stockFilter !== "all" || selectedCategory !== "all" || selectedSize !== "all" || searchTerm) && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Active filters:</span>
                  {reorderFilter !== "all" && (
                    <Badge variant="outline" className="text-xs">
                      {reorderFilter === "urgent" ? "🔴 Urgent" :
                       reorderFilter === "needed" ? "🟡 Reorder Needed" :
                       reorderFilter === "slow" ? "🟣 Slow Moving" :
                       reorderFilter === "dead" ? "⚫ Dead Stock" :
                       reorderFilter === "recommended" ? "🟠 Recommended" : reorderFilter}
                    </Badge>
                  )}
                  {stockFilter !== "all" && (
                    <Badge variant="outline" className="text-xs">
                      {stockFilter === "out" ? "🔴 Out of Stock" :
                       stockFilter === "low" ? "🟡 Low Stock" :
                       stockFilter === "normal" ? "🟢 Normal Stock" : stockFilter}
                    </Badge>
                  )}
                  {selectedCategory !== "all" && (
                    <Badge variant="outline" className="text-xs">
                      {categories.find(c => c.id.toString() === selectedCategory)?.name || selectedCategory}
                    </Badge>
                  )}
                  {selectedSize !== "all" && (
                    <Badge variant="outline" className="text-xs">Size: {selectedSize}</Badge>
                  )}
                  {searchTerm && (
                    <Badge variant="outline" className="text-xs">Search: "{searchTerm}"</Badge>
                  )}
                </div>
              )}
            </div>
            
            {/* Filter Summary Stats */}
            {filteredProducts.length > 0 && (reorderFilter !== "all" || stockFilter !== "all") && (
              <div className="text-xs text-muted-foreground">
                {reorderFilter === "urgent" && `⚠️ ${filteredProducts.filter(p => p.days_until_stockout! < 7).length} items need immediate attention`}
                {reorderFilter === "needed" && `📦 ${filteredProducts.filter(p => p.quantity <= (p.low_stock_threshold ?? getBaselineThreshold())).length} items below reorder point`}
                {reorderFilter === "slow" && `🐌 ${filteredProducts.length} slow-moving items (60+ days)`}
                {reorderFilter === "dead" && `💀 ${filteredProducts.length} dead stock items (90+ days)`}
                {stockFilter === "out" && `🔴 ${filteredProducts.filter(p => p.quantity === 0).length} out of stock items`}
                {stockFilter === "low" && `🟡 ${filteredProducts.filter(p => p.quantity > 0 && p.quantity <= (p.low_stock_threshold ?? (typeof baselineThreshold === 'number' ? baselineThreshold : 0))).length} low stock items`}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-18 gap-2 p-3 bg-muted/50 border-b font-medium text-sm">
              <div className="col-span-3 text-left">SKU</div>
              <div className="col-span-4 text-left">Product Details</div>
              <div className="col-span-2 text-left">Category</div>
              <div className="col-span-2 text-center">Stock Level</div>
              <div className="col-span-2 text-center">Sales Rate</div>
              <div className="col-span-2 text-center">Days Left</div>
              <div className="col-span-2 text-center">Trend</div>
              <div className="col-span-1 text-center">Status</div>
            </div>

            {/* Virtualized Product Rows */}
            {currentPageItems.length > 0 ? (
              <div style={{ height: Math.min(600, currentPageItems.length * 60) }}>
                <List
                  height={Math.min(600, currentPageItems.length * 60)}
                  itemCount={currentPageItems.length}
                  itemSize={60}
                  width={'100%'}
                >
                  {({ index, style }: { index: number; style: React.CSSProperties }) => {
                    const product = currentPageItems[index]
                    return (
                      <div
                        key={product.id}
                        style={style}
                        className="grid grid-cols-18 gap-2 p-3 border-b hover:bg-muted/50 cursor-pointer transition-colors items-center"
                        onClick={() => router.push(`/dashboard/products/${product.id}`)}
                      >
                        {/* SKU */}
                        <div className="col-span-3 font-mono text-sm text-muted-foreground">
                          {product.sku}
                        </div>
                        
                        {/* Product Details */}
                        <div className="col-span-4">
                          <div className="font-medium text-sm">{product.name}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {product.size && <Badge variant="outline" className="text-xs px-1 py-0">{product.size}</Badge>}
                          </div>
                        </div>
                        
                        {/* Category */}
                        <div className="col-span-2 text-sm">
                          {product.category?.name || '—'}
                        </div>
                        
                        {/* Stock Level */}
                        <div className="col-span-2 text-center">
                          <span className={`font-medium text-sm ${
                            product.quantity === 0 ? 'text-red-600' :
                            product.quantity <= (product.low_stock_threshold ?? getBaselineThreshold()) ? 'text-amber-600' :
                            'text-green-600'
                          }`}>
                            {product.quantity.toLocaleString()}
                          </span>
                        </div>
                        
                        {/* Sales Rate */}
                        <div className="col-span-2 text-center">
                          <div className="flex flex-col items-center">
                            <span className="font-medium text-sm">
                              {product.daily_sales_rate?.toFixed(1) || '0.0'}
                            </span>
                            <span className="text-xs text-muted-foreground">per day</span>
                          </div>
                        </div>
                        
                        {/* Days Until Stockout */}
                        <div className="col-span-2 text-center">
                          <span className={`font-medium text-sm ${
                            product.days_until_stockout! < 7 ? 'text-red-600' :
                            product.days_until_stockout! < 14 ? 'text-orange-600' :
                            product.days_until_stockout! < 30 ? 'text-amber-600' : 'text-green-600'
                          }`}>
                            {product.days_until_stockout! > 999 ? '∞' : `${product.days_until_stockout}d`}
                          </span>
                        </div>
                        
                        {/* Sales Trend */}
                        <div className="col-span-2 text-center">
                          <div className="flex flex-col items-center">
                            {product.sales_trend === 'increasing' ? (
                              <span className="text-green-600 text-lg">📈</span>
                            ) : product.sales_trend === 'decreasing' ? (
                              <span className="text-red-600 text-lg">📉</span>
                            ) : (
                              <span className="text-gray-600 text-lg">➡️</span>
                            )}
                            <span className="text-xs text-muted-foreground capitalize">
                              {product.sales_trend}
                            </span>
                          </div>
                        </div>
                        
                        {/* Status Badge */}
                        <div className="col-span-1 text-center">
                          {(() => {
                            // Generate consistent days since last sale based on product ID (for demo purposes)
                            const daysSinceLastSale = (product.id * 7) % 120 // Deterministic value between 0-119
                            
                            if (product.quantity === 0) {
                              return <Badge variant="destructive" className="text-xs px-2 py-1 bg-red-600 text-white">Out</Badge>
                            } else if (daysSinceLastSale > 90) {
                              return <Badge variant="destructive" className="text-xs px-2 py-1 bg-gray-800 text-white">Dead</Badge>
                            } else if (daysSinceLastSale > 60) {
                              return <Badge variant="secondary" className="text-xs px-2 py-1 bg-purple-500 text-white">Slow</Badge>
                            } else if (product.days_until_stockout! < 7) {
                              return <Badge variant="destructive" className="text-xs px-2 py-1 bg-red-500 text-white">Urgent</Badge>
                            } else if (product.quantity <= (product.low_stock_threshold ?? getBaselineThreshold())) {
                              return <Badge variant="secondary" className="text-xs px-2 py-1 bg-amber-500 text-white">Low</Badge>
                            } else if (product.days_until_stockout! < 30) {
                              return <Badge variant="outline" className="text-xs px-2 py-1 bg-yellow-500 text-black">Watch</Badge>
                            } else {
                              return <Badge variant="default" className="text-xs px-2 py-1 bg-green-500 text-white">Good</Badge>
                            }
                          })()}
                        </div>
                      </div>
                    )
                  }}
                </List>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No products found matching your criteria.</p>
                <p className="text-sm mt-1">Try adjusting your filters or search terms.</p>
              </div>
            )}

            {/* Pagination controls */}
            {filteredProducts.length > 0 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing {filteredProducts.length.toLocaleString()} results — page {page} of {pageCount}
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => setPage(1)} disabled={page === 1}>
                    First
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>
                    Prev
                  </Button>
                  {(() => {
                    if (pageCount <= 1) return null
                    
                    const visiblePages = []
                    const maxVisible = 5
                    let startPage = Math.max(1, page - Math.floor(maxVisible / 2))
                    let endPage = Math.min(pageCount, startPage + maxVisible - 1)
                    
                    // Adjust startPage if we're near the end
                    if (endPage - startPage + 1 < maxVisible) {
                      startPage = Math.max(1, endPage - maxVisible + 1)
                    }
                    
                    for (let p = startPage; p <= endPage; p++) {
                      visiblePages.push(p)
                    }
                    
                    return visiblePages.map((p) => (
                      <Button 
                        key={`page-${p}`} 
                        size="sm" 
                        variant={p === page ? 'default' : 'outline'} 
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </Button>
                    ))
                  })()}
                  <Button size="sm" variant="outline" onClick={() => setPage(Math.min(pageCount, page + 1))} disabled={page === pageCount}>
                    Next
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setPage(pageCount)} disabled={page === pageCount}>
                    Last
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
