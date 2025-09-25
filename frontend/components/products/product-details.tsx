"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

import { ArrowLeft, TrendingUp, TrendingDown, Package, DollarSign, BarChart3 } from "lucide-react"


import { apiFetch, getDataSource } from '@/lib/api'
import { useAppToast } from '@/lib/use-toast'
import type { Product } from "@/components/stock/stock-management"

interface Sale {
  sale_id: number
  channel: string
  date: string
  sku: string
  quantity: number
  created_at?: string
}

interface ProductDetailsProps {
  productId: string
}

export function ProductDetails({ productId }: ProductDetailsProps) {
  const router = useRouter()
  const { push: pushToast } = useAppToast()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sales, setSales] = useState<Sale[]>([])
  const [loadingSales, setLoadingSales] = useState(true)

  // Channel color mapping for consistent visualization
  const channelColors = {
    'Shopee': 'bg-orange-500',
    'Facebook': 'bg-blue-500', 
    'TikTok': 'bg-pink-500',
    'TIKTOK': 'bg-pink-500',
    'Instagram': 'bg-purple-500',
    'Lazada': 'bg-indigo-500',
    'LINE': 'bg-green-500',
    'Website': 'bg-gray-700',
    'Store': 'bg-yellow-600',
    'unknown': 'bg-gray-400',
    'default': 'bg-slate-500'
  }

  const getChannelColor = (channel: string): string => {
    const normalizedChannel = channel?.toLowerCase().replace(/[^a-z]/g, '')
    const colorKey = Object.keys(channelColors).find(key => 
      key.toLowerCase().replace(/[^a-z]/g, '') === normalizedChannel
    )
    return channelColors[colorKey as keyof typeof channelColors] || channelColors.default
  }


  const fetchProductSales = async (productSku: string) => {
    try {
      setLoadingSales(true)
      
      // Only fetch real data if using pajara backend
      if (getDataSource() === 'pajara') {
        // Use the new dedicated endpoint to fetch sales for a single SKU
        const res = await apiFetch(`/sales/${encodeURIComponent(productSku)}`)
        if (!res.ok) throw new Error('Failed to fetch sales for SKU')
        const skuSales: Sale[] = await res.json()

        // Sort by date (most recent first)
        skuSales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

        setSales(skuSales)
      } else {
        // Not using backend: do not generate mock sales. Clear sales so UI shows empty state.
        setSales([])
      }
    } catch (err: any) {
      console.error('Error fetching sales:', err)
      pushToast({
        title: "Error Loading Sales",
        description: "Failed to load sales data.",
        variant: "error"
      })
      // Do not fallback to mock sales data; clear sales so UI remains accurate
      setSales([])
    } finally {
      setLoadingSales(false)
    }
  }

  // Simple seeded random generator for consistent mock data
  const seededRandom = (seed: string, index: number): number => {
    const str = seed + index.toString()
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return Math.abs(hash) / 2147483647 // Normalize to 0-1
  }

  // Mock sales generator removed — do not fabricate sales data in the UI.

  // Prepare chart data for monthly sales over time
  const prepareSalesChartData = () => {
    if (sales.length === 0) return []

    // Group sales by month and channel
    const salesByMonth: Record<string, Record<string, number>> = {}
    
    sales.forEach(sale => {
      // Create month key (YYYY-MM format)
      const saleDate = new Date(sale.date)
      const monthKey = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, '0')}`
      
      if (!salesByMonth[monthKey]) {
        salesByMonth[monthKey] = {}
      }
      if (!salesByMonth[monthKey][sale.channel]) {
        salesByMonth[monthKey][sale.channel] = 0
      }
      salesByMonth[monthKey][sale.channel] += sale.quantity
    })

    // Convert to chart format with proper month names
    const chartData = Object.entries(salesByMonth)
      .map(([monthKey, channelData]) => {
        const [year, month] = monthKey.split('-')
        const date = new Date(parseInt(year), parseInt(month) - 1, 1)
        const totalForMonth = Object.values(channelData).reduce((sum, qty) => sum + qty, 0)
        
        return {
          date: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          fullDate: monthKey,
          sortDate: date.getTime(),
          total: totalForMonth,
          ...channelData
        }
      })
      .sort((a, b) => a.sortDate - b.sortDate)

    return chartData
  }
  // Stock movement graphs and mock generators removed — stock movements not used in this component

  const fetchProduct = async () => {
    try {
      setLoading(true)
      setError(null)
      
      let productData: Product
      
      // Use real backend data if pajara source is selected
      if (getDataSource() === 'pajara') {
        try {
          // First, get all products and find the one with matching ID
          const res = await apiFetch('/products/')
          if (!res.ok) throw new Error('Failed to fetch products')
          const products: Product[] = await res.json()
          
          const foundProduct = products.find(p => p.id?.toString() === productId || p.sku === productId)
          
          if (!foundProduct) {
            throw new Error('Product not found')
          }
          
          productData = foundProduct
        } catch (backendError) {
          console.error('Backend fetch failed, using mock data:', backendError)
          // Fallback to mock data
          productData = generateMockProduct()
        }
      } else {
        // Generate mock product data
        productData = generateMockProduct()
      }
      
      setProduct(productData)
      
  // Fetch sales data for this product
  await fetchProductSales(productData.sku)
    } catch (err: any) {
      console.error('Error loading product:', err)
      setError(err.message || 'Failed to load product')
    } finally {
      setLoading(false)
    }
  }
  
  const generateMockProduct = (): Product => {
    const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
    const colors = ['Black', 'White', 'Navy', 'Gray', 'Red']
    const brands = ['StyleCo', 'TrendWear', 'UrbanFit', 'ClassicThread']
    const categories = ['T-Shirts', 'Jeans', 'Hoodies', 'Dresses', 'Jackets', 'Accessories']
    
    return {
      id: parseInt(productId),
      name: `Product ${productId}`,
      sku: `SKU-${productId.padStart(3, '0')}`,
      category_id: Math.floor(seededRandom(productId, 1) * 6) + 1,
      description: `High-quality product with excellent features. Perfect for everyday use.`,
      selling_price: Math.floor(seededRandom(productId, 2) * 200) + 20,
      quantity: Math.floor(seededRandom(productId, 3) * 100) + 10,
      stock_level: Math.floor(seededRandom(productId, 4) * 100) + 10,
      low_stock_threshold: 15,
      size: sizes[Math.floor(seededRandom(productId, 5) * sizes.length)],
      color: colors[Math.floor(seededRandom(productId, 6) * colors.length)],
      material: 'Cotton Blend',
      brand: brands[Math.floor(seededRandom(productId, 7) * brands.length)],
      user_id: 1,
      last_updated: new Date().toISOString().split('T')[0],
      category: {
        id: Math.floor(seededRandom(productId, 8) * 6) + 1,
        name: categories[Math.floor(seededRandom(productId, 9) * categories.length)]
      }
    }
  }

  useEffect(() => {
    if (productId) {
      fetchProduct()
    }
  }, [productId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground dark:text-gray-300">Loading product...</p>
      </div>
    )
  }

  const safeBack = () => {
    try {
      // If there is navigation history, go back. Otherwise, push to the stock list.
      if (typeof window !== 'undefined' && window.history && window.history.length > 1) {
        router.back()
      } else {
        router.push('/dashboard/stock')
      }
    } catch (err) {
      // Fallback to push in case router.back() fails
      router.push('/dashboard/stock')
    }
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-destructive mb-2">Error loading product</p>
          <p className="text-muted-foreground text-sm dark:text-gray-300">{error}</p>
          <Button variant="outline" onClick={safeBack} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-muted-foreground mb-2 dark:text-gray-300">Product not found</p>
          <Button variant="outline" onClick={safeBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  const getStockLevel = (product: Product) => {
    return product.stock_level ?? product.quantity ?? 0
  }

  const getStockStatus = (product: Product) => {
    const quantity = getStockLevel(product)
    const threshold = product.low_stock_threshold
    if (quantity === 0) return { label: "Out of Stock", variant: "destructive" as const }
    if (quantity <= threshold) return { label: "Low Stock", variant: "secondary" as const }
    return { label: "In Stock", variant: "default" as const }
  }

  const status = getStockStatus(product)
  const currentStock = getStockLevel(product)
  
  // Calculate sales analytics
  const totalSales = sales.reduce((sum, sale) => sum + sale.quantity, 0)
  const channelBreakdown = sales.reduce((acc, sale) => {
    acc[sale.channel] = (acc[sale.channel] || 0) + sale.quantity
    return acc
  }, {} as Record<string, number>)
  
  const topChannel = Object.entries(channelBreakdown)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'
    
  const recentSales = sales.filter(sale => {
    const saleDate = new Date(sale.date)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    return saleDate >= sevenDaysAgo
  })
  
  const chartData = prepareSalesChartData()
  const uniqueChannels = Array.from(new Set(sales.map(sale => sale.channel)))
  
  // Debug logging
  console.log('Sales data:', sales.length, 'sales')
  console.log('Chart data:', chartData.length, 'months')
  console.log('Unique channels:', uniqueChannels)









  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={safeBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
            <div>
              <h1 className="text-3xl font-bold">{product.name}</h1>
              <p className="text-muted-foreground dark:text-gray-300">SKU: {product.sku}</p>
            </div>
        </div>
      </div>

      {/* Product Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Stock</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground dark:text-gray-300" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentStock}</div>
            <Badge variant={status.variant} className="mt-2">
              {status.label}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unit Price</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground dark:text-gray-300" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${product.selling_price || 0}</div>
            <p className="text-xs text-muted-foreground dark:text-gray-300 mt-2">Per unit</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground dark:text-gray-300" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(currentStock * (product.selling_price || 0)).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground dark:text-gray-300 mt-2">Current inventory value</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alert</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground dark:text-gray-300" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{product.low_stock_threshold}</div>
            <p className="text-xs text-muted-foreground dark:text-gray-300 mt-2">Threshold level</p>
          </CardContent>
        </Card>
      </div>

      {/* Product Details and Analytics */}
      <div className="space-y-6">
        {/* Product Information */}
        <Card>
          <CardHeader>
            <CardTitle>Product Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground dark:text-gray-300">Name</p>
                <p className="text-sm">{product.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground dark:text-gray-300">SKU</p>
                <p className="text-sm font-mono">{product.sku}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground dark:text-gray-300">Category</p>
                <p className="text-sm">{product.category && typeof product.category === 'object' ? product.category.name : (product.category || 'Uncategorized')}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground dark:text-gray-300">Brand</p>
                <p className="text-sm">{product.brand}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground dark:text-gray-300">Last Updated</p>
                <p className="text-sm">{product.last_updated}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground dark:text-gray-300">Status</p>
                <Badge variant={status.variant}>{status.label}</Badge>
              </div>
            </div>
            {product.description && (
              <div className="mt-6 pt-4 border-t">
                <p className="text-sm font-medium text-muted-foreground dark:text-gray-300">Description</p>
                <p className="text-sm">{product.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sales performance chart removed per request */}

        {/* Sales History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Monthly Sales Overview
            </CardTitle>
            <CardDescription>Track monthly sales performance and trends by channel</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingSales ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-muted-foreground dark:text-gray-300">Loading sales data...</div>
              </div>
            ) : chartData.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-muted-foreground dark:text-gray-300">No sales data available</div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Chart Legend */}
                <div className="flex flex-wrap gap-4">
                  {uniqueChannels.map(channel => (
                    <div key={channel} className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getChannelColor(channel)}`}></div>
                      <span className="text-sm font-medium">{channel}</span>
                    </div>
                  ))}
                </div>
                
                {/* Sales Chart */}
                <div className="h-80 w-full border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 p-6">
                  <div className="h-full flex flex-col">
                    {/* Chart container with proper spacing */}
                    <div className="flex-1 relative pl-12 pr-4 pb-8">
                      {/* Horizontal grid lines */}
                      <div className="absolute left-12 right-4 top-0 bottom-8">
                        {[...Array(6)].map((_, i) => (
                          <div
                            key={i}
                            className="absolute w-full border-t border-gray-100 dark:border-gray-800"
                            style={{ top: `${(i * 100) / 5}%` }}
                          />
                        ))}
                      </div>
                      
                      {/* Y-axis labels */}
                      <div className="absolute left-0 top-0 bottom-8 w-10 flex flex-col justify-between text-xs text-gray-500 dark:text-gray-400">
                        {[...Array(6)].map((_, i) => {
                          const maxTotal = Math.max(...chartData.map(d => d.total), 1)
                          const value = Math.round((maxTotal * (5 - i)) / 5)
                          return (
                            <div key={i} className="text-right pr-2">
                              {value}
                            </div>
                          )
                        })}
                      </div>
                      
                      {/* Chart bars */}
                      <div className="h-full flex items-end justify-between gap-3 relative z-10">
                        {chartData.map((dataPoint, index) => {
                          const maxTotal = Math.max(...chartData.map(d => d.total), 1)
                          const barHeight = (dataPoint.total / maxTotal) * 100
                          
                          return (
                            <div key={index} className="flex flex-col items-center flex-1 max-w-20 h-full group">
                              {/* Total label above bar */}
                              <div className="text-xs font-semibold text-gray-700 dark:text-gray-100 mb-2 h-5 flex items-end">
                                {dataPoint.total > 0 ? (
                                  <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded shadow-sm">
                                    {dataPoint.total}
                                  </span>
                                ) : ''}
                              </div>
                              
                              {/* Stacked bar - removed gray background */}
                              <div className="w-full flex flex-col justify-end flex-1 relative">
                                {/* Shadow/border effect */}
                                <div
                                  className="w-full rounded-t-sm border border-gray-200 dark:border-gray-600 bg-transparent overflow-hidden shadow-sm group-hover:shadow-md transition-shadow"
                                  style={{ height: `${Math.max(barHeight, 2)}%` }}
                                >
                                  {/* Inner colored stack */}
                                  <div className="w-full h-full flex flex-col-reverse">
                                    {uniqueChannels.map((channel) => {
                                      const channelValue = (dataPoint as any)[channel] || 0
                                      if (channelValue === 0) return null

                                      const segmentHeight = dataPoint.total > 0 ? (channelValue / dataPoint.total) * 100 : 0

                                      return (
                                        <div
                                          key={channel}
                                          className={`w-full ${getChannelColor(channel)} hover:opacity-90 transition-all duration-200 cursor-pointer border-b border-white dark:border-gray-800 last:border-b-0 first:rounded-t-sm last:rounded-b-sm`}
                                          style={{ height: `${segmentHeight}%` }}
                                          title={`${channel}: ${channelValue} units`}
                                        />
                                      )
                                    })}
                                  </div>
                                </div>
                                
                                {/* Hover tooltip */}
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block">
                                  <div className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg">
                                    {dataPoint.date}: {dataPoint.total} units
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                    
                    {/* X-axis labels */}
                    <div className="flex justify-between pl-12 pr-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                      {chartData.map((dataPoint, index) => (
                        <div key={index} className="text-xs text-gray-600 dark:text-gray-300 text-center flex-1 max-w-20 font-medium">
                          <div className="truncate">{dataPoint.date}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Chart Summary */}
                {chartData.length > 0 && (
                  <div className="bg-muted p-4 rounded-lg mt-4">
                    <h4 className="font-semibold mb-3">Sales Summary</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-muted-foreground dark:text-gray-300">Total Period Sales:</span>
                        <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{chartData.reduce((sum, d) => sum + d.total, 0)} units</div>
                      </div>
                      <div>
                        <span className="font-medium text-muted-foreground dark:text-gray-300">Average Monthly Sales:</span>
                        <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{Math.round(chartData.reduce((sum, d) => sum + d.total, 0) / chartData.length)} units</div>
                      </div>
                      <div>
                        <span className="font-medium text-muted-foreground dark:text-gray-300">Best Month:</span>
                        <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          {chartData.length > 0 ? chartData.reduce((max, current) => current.total > max.total ? current : max, chartData[0]).date : 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sales Analytics */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Analytics</CardTitle>
            <CardDescription>View sales performance by channel</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Sales Summary */}
              <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-muted rounded-lg">
                          <div className="text-2xl font-bold text-primary">{totalSales}</div>
                          <div className="text-sm text-muted-foreground dark:text-gray-300">Total Sales</div>
                        </div>
                        <div className="text-center p-4 bg-muted rounded-lg">
                          <div className="text-2xl font-bold text-green-600">{recentSales.reduce((sum, sale) => sum + sale.quantity, 0)}</div>
                          <div className="text-sm text-muted-foreground dark:text-gray-300">Last 7 Days</div>
                        </div>
                        <div className="text-center p-4 bg-muted rounded-lg">
                          <div className="text-lg font-semibold text-blue-600">{topChannel}</div>
                          <div className="text-sm text-muted-foreground dark:text-gray-300">Top Channel</div>
                        </div>
              </div>
              
              {/* Channel Breakdown */}
              <div className="space-y-3">
                <h4 className="font-semibold">Sales by Channel</h4>
                {Object.entries(channelBreakdown)
                  .sort(([,a], [,b]) => b - a)
                  .map(([channel, quantity]) => {
                    const percentage = totalSales > 0 ? (quantity / totalSales * 100).toFixed(1) : '0'
                    return (
                      <div key={channel} className="flex items-center space-x-3">
                        <div className={`w-4 h-4 rounded-full ${getChannelColor(channel)}`}></div>
                        <div className="flex-1">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">{channel}</span>
                            <span className="text-sm text-muted-foreground dark:text-gray-300">{quantity} units ({percentage}%)</span>
                          </div>
                          <div className="w-full bg-muted h-2 rounded-full mt-1">
                            <div 
                              className={`h-2 rounded-full ${getChannelColor(channel)}`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                }
              </div>
              
              {/* Recent Sales List */}
              <div className="space-y-3">
                <h4 className="font-semibold">Recent Sales</h4>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {loadingSales ? (
                    <div className="text-center py-4 text-muted-foreground dark:text-gray-300">Loading sales...</div>
                  ) : sales.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground dark:text-gray-300">No sales found</div>
                  ) : (
                    sales.slice(0, 10).map((sale) => (
                      <div key={sale.sale_id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${getChannelColor(sale.channel)}`}></div>
                          <div>
                            <div className="text-sm font-medium">{sale.channel}</div>
                            <div className="text-xs text-muted-foreground dark:text-gray-300">{sale.date}</div>
                          </div>
                        </div>
                        <div className="text-sm font-semibold">{sale.quantity} units</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>





    </div>
  )
}
