"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Bar, BarChart } from "recharts"
import { apiFetch } from "@/lib/api"

interface SalesChartProps {
  productId: string
  salesData?: any[]
  refreshTrigger?: number // Add this to trigger re-fetching
}

interface SalesRecord {
  id: number
  product_id: number
  user_id: number
  quantity: number
  sale_price: number
  sale_date: string
}

export function SalesChart({ productId, salesData: propSalesData, refreshTrigger }: SalesChartProps) {
  const [salesData, setSalesData] = useState<SalesRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Generate mock sales data for frontend-only system
  const generateMockSalesData = (productId: string): SalesRecord[] => {
    const salesData: SalesRecord[] = []
    const currentDate = new Date()
    
    // Generate 3-6 months of sales data
    for (let monthsBack = 5; monthsBack >= 0; monthsBack--) {
      const salesDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - monthsBack, 1)
      
      // Generate 2-8 sales per month
      const salesCount = Math.floor(Math.random() * 7) + 2
      
      for (let i = 0; i < salesCount; i++) {
        const dayOffset = Math.floor(Math.random() * 28) + 1
        const saleDate = new Date(salesDate.getFullYear(), salesDate.getMonth(), dayOffset)
        
        salesData.push({
          id: Math.floor(Math.random() * 10000),
          product_id: parseInt(productId),
          user_id: 1,
          quantity: Math.floor(Math.random() * 5) + 1,
          sale_price: Math.floor(Math.random() * 100) + 20,
          sale_date: saleDate.toISOString().split('T')[0]
        })
      }
    }
    
    return salesData
  }

  // Fetch sales data (now uses mock data)
  useEffect(() => {
    if (!productId || propSalesData) return

    const fetchSalesData = async () => {
      setLoading(true)
      setError(null)
      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 300))
        
        // Generate mock sales data
        const mockData = generateMockSalesData(productId)
        setSalesData(mockData)
      } catch (err) {
        console.error('Error generating mock sales data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load sales data')
      } finally {
        setLoading(false)
      }
    }

    fetchSalesData()
  }, [productId, propSalesData, refreshTrigger])

  // Transform real sales data into chart format
  const transformSalesData = (sales: SalesRecord[]) => {
    // Add proper array validation
    if (!Array.isArray(sales) || sales.length === 0) return []
    
    // Group sales by month
    const monthlyData: { [key: string]: { sales: number, revenue: number, monthNumber: number } } = {}
    
    sales.forEach(sale => {
      const date = new Date(sale.sale_date)
      const monthKey = date.toLocaleDateString('en-US', { month: 'short' })
      const monthNumber = date.getMonth() // 0-11 for sorting
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { sales: 0, revenue: 0, monthNumber }
      }
      
      monthlyData[monthKey].sales += sale.quantity
      monthlyData[monthKey].revenue += sale.quantity * sale.sale_price
    })
    
    // Convert to chart format and sort by month order
    return Object.entries(monthlyData)
      .map(([month, data]) => ({
        month,
        sales: data.sales,
        revenue: Math.round(data.revenue * 100) / 100,
        monthNumber: data.monthNumber
      }))
      .sort((a, b) => a.monthNumber - b.monthNumber)
  }
  
  // Use provided salesData or fetched data, ensure it's always an array
  const safeData = Array.isArray(propSalesData) ? propSalesData : Array.isArray(salesData) ? salesData : []
  const displayData = transformSalesData(safeData)
  
  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[300px] text-center">
        <div>
          <div className="text-muted-foreground mb-2">Loading sales data...</div>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-[300px] text-center">
        <div>
          <div className="text-destructive mb-2">Error loading sales data</div>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }
  
  // Show empty state if no data
  if (!displayData || displayData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-center">
        <div>
          <div className="text-muted-foreground mb-2">No sales data available</div>
          <p className="text-sm text-muted-foreground">Record sales or upload CSV data to see charts</p>
        </div>
      </div>
    )
  }
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Sales Volume</CardTitle>
          <CardDescription>Monthly sales units over the past year</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              sales: {
                label: "Units Sold",
                color: "hsl(var(--chart-1))",
              },
            }}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={displayData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="sales" fill="var(--color-chart-1)" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
          <CardDescription>Monthly revenue generated from this product</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              revenue: {
                label: "Revenue ($)",
                color: "hsl(var(--chart-2))",
              },
            }}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={displayData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="revenue" stroke="var(--color-chart-2)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}
