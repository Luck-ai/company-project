"use client"

import React, { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Clock, 
  ShoppingCart,
  BarChart3,
  PieChart,
  Target,
  Truck,
  Calendar,
  Filter
} from "lucide-react"
import { getProducts, getCategories } from '@/lib/api'
import { Product } from '@/components/stock/stock-management'

export function InventorySummary() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState("30d")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const [productsData, categoriesData] = await Promise.all([
          getProducts(),
          getCategories()
        ])
        
        // Enhance products with calculated metrics
        const enhancedProducts = productsData.map(p => {
          const product = p as any // Type assertion to access optional properties
          const dailySalesRate = product.daily_sales_rate || Math.random() * 5 + 0.5
          const daysUntilStockout = dailySalesRate > 0 ? Math.floor(p.quantity / dailySalesRate) : 999
          const leadTime = product.lead_time_days || 14
          const reorderPoint = Math.max(p.low_stock_threshold, leadTime * dailySalesRate)
          
          // Calculate days since last sale (mock data - in real app would come from sales data)
          const daysSinceLastSale = Math.floor(Math.random() * 120) // 0-120 days
          const isSlowMoving = daysSinceLastSale > 60 // 2+ months without sales
          const isDeadStock = daysSinceLastSale > 90 // 3+ months without sales
          
          // Calculate total sales volume (mock data)
          const monthlySales = product.monthly_sales || Math.floor(dailySalesRate * 30)
          const totalSalesValue = monthlySales * (Math.random() * 100 + 20) // Mock sales value

          const salesTrend: 'increasing' | 'stable' | 'decreasing' = 
            daysSinceLastSale > 90 ? 'decreasing' :
            daysUntilStockout < 7 ? 'increasing' : 
            daysUntilStockout < 30 ? 'stable' : 'decreasing'

          return {
            ...p,
            daily_sales_rate: dailySalesRate,
            days_until_stockout: daysUntilStockout,
            reorder_point: reorderPoint,
            sales_trend: salesTrend,
            lead_time_days: leadTime,
            monthly_sales: monthlySales,
            total_sales_value: totalSalesValue,
            days_since_last_sale: daysSinceLastSale,
            is_slow_moving: isSlowMoving,
            is_dead_stock: isDeadStock
          } as Product & {
            total_sales_value: number,
            days_since_last_sale: number,
            is_slow_moving: boolean,
            is_dead_stock: boolean
          }
        })
        
        setProducts(enhancedProducts)
        setCategories(categoriesData)
      } catch (error) {
        console.error('Failed to load inventory data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Filter products by category
  const filteredProducts = useMemo(() => {
    if (selectedCategory === "all") return products
    return products.filter(p => p.category_id?.toString() === selectedCategory)
  }, [products, selectedCategory])

  // Calculate summary metrics
  const metrics = useMemo(() => {
    const totalProducts = filteredProducts.length
    const totalSalesValue = filteredProducts.reduce((sum, p) => sum + ((p as any).total_sales_value || 0), 0)
    const totalQuantity = filteredProducts.reduce((sum, p) => sum + p.quantity, 0)
    
    const outOfStock = filteredProducts.filter(p => p.quantity === 0).length
    const lowStock = filteredProducts.filter(p => p.quantity > 0 && p.quantity <= p.low_stock_threshold).length
    const urgentReorders = filteredProducts.filter(p => p.days_until_stockout! < 7).length
    const needReorder = filteredProducts.filter(p => p.quantity <= p.reorder_point!).length
    
    // Inventory longevity breakdown
    const within14Days = filteredProducts.filter(p => p.days_until_stockout! <= 14 && p.days_until_stockout! > 0).length
    const within30Days = filteredProducts.filter(p => p.days_until_stockout! <= 30 && p.days_until_stockout! > 14).length
    const within6Months = filteredProducts.filter(p => p.days_until_stockout! <= 180 && p.days_until_stockout! > 30).length
    const within1Year = filteredProducts.filter(p => p.days_until_stockout! <= 365 && p.days_until_stockout! > 180).length
    const over1Year = filteredProducts.filter(p => p.days_until_stockout! > 365).length
    
    // Slow moving and dead stock analysis
    const slowMovingStock = filteredProducts.filter(p => (p as any).is_slow_moving).length
    const deadStock = filteredProducts.filter(p => (p as any).is_dead_stock).length
    
    const avgDaysUntilStockout = filteredProducts.length > 0 ? 
      filteredProducts.reduce((sum, p) => sum + Math.min(p.days_until_stockout!, 365), 0) / filteredProducts.length : 0
    
    const avgSalesVelocity = filteredProducts.length > 0 ?
      filteredProducts.reduce((sum, p) => sum + (p.daily_sales_rate || 0), 0) / filteredProducts.length : 0
    
    // Category breakdown
    const categoryBreakdown = categories.map(cat => {
      const catProducts = filteredProducts.filter(p => p.category_id === cat.id)
      const catSalesValue = catProducts.reduce((sum, p) => sum + ((p as any).total_sales_value || 0), 0)
      const catQuantity = catProducts.reduce((sum, p) => sum + p.quantity, 0)
      return {
        name: cat.name,
        count: catProducts.length,
        salesValue: catSalesValue,
        quantity: catQuantity,
        percentage: totalSalesValue > 0 ? (catSalesValue / totalSalesValue) * 100 : 0
      }
    }).filter(cat => cat.count > 0).sort((a, b) => b.salesValue - a.salesValue)

    // Stock health
    const healthyStock = filteredProducts.filter(p => 
      p.quantity > p.reorder_point! && p.days_until_stockout! > 30 && !(p as any).is_slow_moving
    ).length
    
    // Top performing products by sales velocity
    const topPerformers = [...filteredProducts]
      .filter(p => (p as any).days_since_last_sale < 30) // Only include recently selling items
      .sort((a, b) => (b.daily_sales_rate || 0) - (a.daily_sales_rate || 0))
      .slice(0, 5)

    // Inventory longevity distribution for chart
    const longevityDistribution = [
      { label: '≤14 days', count: within14Days, color: '#ef4444' },
      { label: '15-30 days', count: within30Days, color: '#f97316' },
      { label: '1-6 months', count: within6Months, color: '#eab308' },
      { label: '6-12 months', count: within1Year, color: '#22c55e' },
      { label: '1+ years', count: over1Year, color: '#3b82f6' }
    ]

    return {
      totalProducts,
      totalSalesValue,
      totalQuantity,
      outOfStock,
      lowStock,
      urgentReorders,
      needReorder,
      healthyStock,
      slowMovingStock,
      deadStock,
      avgDaysUntilStockout,
      avgSalesVelocity,
      categoryBreakdown,
      topPerformers,
      longevityDistribution,
      stockHealthPercentage: totalProducts > 0 ? (healthyStock / totalProducts) * 100 : 0,
      salesTurnoverRate: totalQuantity > 0 ? (avgSalesVelocity * 365) / totalQuantity : 0
    }
  }, [filteredProducts, categories])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Loading inventory summary...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">Inventory Summary</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            High-level overview of your clothing inventory performance and health
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Categories" />
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
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${metrics.totalSalesValue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.totalProducts.toLocaleString()} SKUs • {metrics.totalQuantity.toLocaleString()} units
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Health Score</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {metrics.stockHealthPercentage.toFixed(1)}%
            </div>
            <Progress value={metrics.stockHealthPercentage} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.healthyStock} of {metrics.totalProducts} SKUs healthy
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Days Until Stockout</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              metrics.avgDaysUntilStockout < 14 ? 'text-red-600' :
              metrics.avgDaysUntilStockout < 30 ? 'text-orange-600' : 'text-green-600'
            }`}>
              {metrics.avgDaysUntilStockout.toFixed(0)} days
            </div>
            <p className="text-xs text-muted-foreground">
              Based on current sales velocity
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Sales Velocity</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {metrics.avgSalesVelocity.toFixed(1)} units/day
            </div>
            <p className="text-xs text-muted-foreground">
              Average across all products
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alert Summary */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card 
          className="border-l-4 border-l-red-500 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => router.push('/dashboard/stock?filter=urgent')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Urgent Action Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{metrics.urgentReorders}</div>
            <p className="text-xs text-muted-foreground">Items need reorder within 7 days</p>
            <p className="text-xs text-blue-600 mt-1 font-medium">Click to view items →</p>
          </CardContent>
        </Card>

        <Card 
          className="border-l-4 border-l-orange-500 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => router.push('/dashboard/stock?filter=needed')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Truck className="h-4 w-4 text-orange-500" />
              Reorder Needed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{metrics.needReorder}</div>
            <p className="text-xs text-muted-foreground">Below reorder point</p>
            <p className="text-xs text-blue-600 mt-1 font-medium">Click to view items →</p>
          </CardContent>
        </Card>

        <Card 
          className="border-l-4 border-l-purple-500 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => router.push('/dashboard/stock?filter=slow')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-500" />
              Slow Moving
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{metrics.slowMovingStock}</div>
            <p className="text-xs text-muted-foreground">No sales in 60+ days</p>
            <p className="text-xs text-blue-600 mt-1 font-medium">Click to view items →</p>
          </CardContent>
        </Card>

        <Card 
          className="border-l-4 border-l-gray-500 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => router.push('/dashboard/stock?filter=dead')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4 text-gray-500" />
              Dead Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{metrics.deadStock}</div>
            <p className="text-xs text-muted-foreground">No sales in 90+ days</p>
            <p className="text-xs text-blue-600 mt-1 font-medium">Click to view items →</p>
          </CardContent>
        </Card>

        <Card 
          className="border-l-4 border-l-red-600 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => router.push('/dashboard/stock?filter=out')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              Out of Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{metrics.outOfStock}</div>
            <p className="text-xs text-muted-foreground">Zero inventory</p>
            <p className="text-xs text-blue-600 mt-1 font-medium">Click to view items →</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis Tabs */}
      <Tabs defaultValue="longevity" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="longevity">Inventory Longevity</TabsTrigger>
          <TabsTrigger value="categories">Category Breakdown</TabsTrigger>
          <TabsTrigger value="performance">Top Performers</TabsTrigger>
          <TabsTrigger value="trends">Business Trends</TabsTrigger>
          <TabsTrigger value="insights">Key Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="longevity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Inventory Duration Distribution
              </CardTitle>
              <CardDescription>
                How long current stock levels will last based on sales velocity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.longevityDistribution.map((segment, index) => (
                  <div key={segment.label} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: segment.color }}
                        />
                        <span className="font-medium">{segment.label}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold">{segment.count} SKUs</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          ({metrics.totalProducts > 0 ? ((segment.count / metrics.totalProducts) * 100).toFixed(1) : 0}%)
                        </span>
                      </div>
                    </div>
                    <Progress 
                      value={metrics.totalProducts > 0 ? (segment.count / metrics.totalProducts) * 100 : 0}
                      className="h-2"
                    />
                  </div>
                ))}
              </div>
              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">📊 Longevity Insights</h4>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span>Items needing immediate attention (≤30 days):</span>
                    <Badge variant="destructive">
                      {(metrics.longevityDistribution[0]?.count || 0) + (metrics.longevityDistribution[1]?.count || 0)} SKUs
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Stable inventory (1-12 months):</span>
                    <Badge variant="default">
                      {(metrics.longevityDistribution[2]?.count || 0) + (metrics.longevityDistribution[3]?.count || 0)} SKUs
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Excess inventory (1+ years):</span>
                    <Badge variant="secondary">
                      {metrics.longevityDistribution[4]?.count || 0} SKUs
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Sales Value by Category
              </CardTitle>
              <CardDescription>
                Distribution of sales performance across product categories
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.categoryBreakdown.map((category, index) => (
                  <div key={category.name} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${{
                        0: 'bg-blue-500',
                        1: 'bg-green-500', 
                        2: 'bg-purple-500',
                        3: 'bg-orange-500',
                        4: 'bg-pink-500'
                      }[index] || 'bg-gray-500'}`} />
                      <div>
                        <p className="font-medium">{category.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {category.count} SKUs • {category.quantity.toLocaleString()} units
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${category.salesValue.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">{category.percentage.toFixed(1)}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Top Performing Products
              </CardTitle>
              <CardDescription>
                Products with highest sales velocity and performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metrics.topPerformers.map((product, index) => (
                  <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="w-8 h-8 flex items-center justify-center">
                        {index + 1}
                      </Badge>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          SKU: {product.sku} • {product.category?.name} • Size: {product.size}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{(product.daily_sales_rate || 0).toFixed(1)} units/day</p>
                      <p className="text-sm text-muted-foreground">
                        {product.quantity} in stock • {product.days_until_stockout}d left
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* SKU Performance Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  📊 SKU Performance Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div>
                      <p className="font-medium text-green-800">Fast Moving SKUs</p>
                      <p className="text-sm text-green-600">High sales velocity</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-700">
                        {filteredProducts.filter(p => (p.days_until_stockout || 999) < 30).length}
                      </p>
                      <p className="text-xs text-green-600">
                        {metrics.totalProducts > 0 ? 
                          ((filteredProducts.filter(p => (p.days_until_stockout || 999) < 30).length / metrics.totalProducts) * 100).toFixed(1) 
                          : 0}%
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div>
                      <p className="font-medium text-yellow-800">Moderate Moving</p>
                      <p className="text-sm text-yellow-600">Stable sales pattern</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-yellow-700">
                        {filteredProducts.filter(p => {
                          const days = p.days_until_stockout || 999;
                          return days >= 30 && days <= 180;
                        }).length}
                      </p>
                      <p className="text-xs text-yellow-600">
                        {metrics.totalProducts > 0 ? 
                          ((filteredProducts.filter(p => {
                            const days = p.days_until_stockout || 999;
                            return days >= 30 && days <= 180;
                          }).length / metrics.totalProducts) * 100).toFixed(1) 
                          : 0}%
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div>
                      <p className="font-medium text-red-800">Slow/Dead Stock</p>
                      <p className="text-sm text-red-600">Needs attention</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-red-700">
                        {metrics.slowMovingStock + metrics.deadStock}
                      </p>
                      <p className="text-xs text-red-600">
                        {metrics.totalProducts > 0 ? 
                          (((metrics.slowMovingStock + metrics.deadStock) / metrics.totalProducts) * 100).toFixed(1) 
                          : 0}%
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sales Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  📈 Sales Trend Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <span className="text-sm font-medium">Increasing Trend</span>
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      {filteredProducts.filter(p => p.sales_trend === 'increasing').length} SKUs
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <span className="text-sm font-medium">Stable Performance</span>
                    <Badge variant="outline">
                      {filteredProducts.filter(p => p.sales_trend === 'stable').length} SKUs
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <span className="text-sm font-medium">Declining Trend</span>
                    <Badge variant="destructive" className="bg-red-100 text-red-800">
                      {filteredProducts.filter(p => p.sales_trend === 'decreasing').length} SKUs
                    </Badge>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">🎯 Trend Insights</h4>
                  <div className="text-sm text-blue-700 space-y-1">
                    <p>• {((filteredProducts.filter(p => p.sales_trend === 'increasing').length / Math.max(metrics.totalProducts, 1)) * 100).toFixed(1)}% of SKUs showing growth</p>
                    <p>• {((filteredProducts.filter(p => p.sales_trend === 'decreasing').length / Math.max(metrics.totalProducts, 1)) * 100).toFixed(1)}% of SKUs need attention</p>
                    <p>• Average portfolio health: {metrics.stockHealthPercentage.toFixed(1)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Operational Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  ⚡ Operational Efficiency
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Inventory Turnover</span>
                      <span className="text-lg font-bold text-blue-600">
                        {metrics.salesTurnoverRate.toFixed(1)}x
                      </span>
                    </div>
                    <Progress value={Math.min(metrics.salesTurnoverRate * 10, 100)} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">Annual turnover rate</p>
                  </div>
                  
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Stock Coverage</span>
                      <span className="text-lg font-bold text-green-600">
                        {metrics.avgDaysUntilStockout.toFixed(0)} days
                      </span>
                    </div>
                    <Progress value={Math.min(metrics.avgDaysUntilStockout / 365 * 100, 100)} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">Average stock runway</p>
                  </div>
                  
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Action Required</span>
                      <span className="text-lg font-bold text-red-600">
                        {metrics.urgentReorders + metrics.needReorder}
                      </span>
                    </div>
                    <Progress 
                      value={((metrics.urgentReorders + metrics.needReorder) / Math.max(metrics.totalProducts, 1)) * 100} 
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">SKUs needing immediate action</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  📊 Sales & Inventory Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <span className="text-sm">Sales turnover rate</span>
                  <Badge variant="outline">{metrics.salesTurnoverRate.toFixed(1)}x/year</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <span className="text-sm">Average sales per SKU</span>
                  <Badge variant="outline">${(metrics.totalSalesValue / Math.max(metrics.totalProducts, 1)).toLocaleString()}</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <span className="text-sm">Units per SKU average</span>
                  <Badge variant="outline">{Math.round(metrics.totalQuantity / Math.max(metrics.totalProducts, 1))}</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <span className="text-sm">Average sales velocity</span>
                  <Badge variant="outline">{metrics.avgSalesVelocity.toFixed(1)} units/day</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  💡 Actionable Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {metrics.urgentReorders > 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm font-medium text-red-800">
                      🚨 {metrics.urgentReorders} products need immediate reordering
                    </p>
                  </div>
                )}
                {metrics.deadStock > 0 && (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-sm font-medium text-gray-800">
                      🗑️ {metrics.deadStock} products have no sales in 90+ days - consider discontinuing
                    </p>
                  </div>
                )}
                {metrics.slowMovingStock > 0 && (
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="text-sm font-medium text-purple-800">
                      🐌 {metrics.slowMovingStock} slow-moving products - review for markdowns or promotions
                    </p>
                  </div>
                )}
                {metrics.stockHealthPercentage < 70 && (
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-sm font-medium text-orange-800">
                      ⚠️ Stock health is below 70% - review reorder policies
                    </p>
                  </div>
                )}
                {metrics.avgDaysUntilStockout < 21 && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm font-medium text-yellow-800">
                      📅 Average stockout window is short - consider increasing safety stock
                    </p>
                  </div>
                )}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium text-blue-800">
                    💰 Total sales value tracked: ${metrics.totalSalesValue.toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}