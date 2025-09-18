"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { apiFetch } from '@/lib/api'

interface StockMovementChartProps {
  productId: string
  stockMovements?: any[]
}

export function StockMovementChart({ productId, stockMovements: propStockMovements }: StockMovementChartProps) {
  const [movements, setMovements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (propStockMovements) {
      setMovements(propStockMovements)
      setLoading(false)
    } else {
      fetchStockMovements()
    }
  }, [propStockMovements, productId])

  const fetchStockMovements = async () => {
    try {
      const res = await apiFetch(`/products/${productId}/stock-movements`)
      if (res.ok) {
        const data = await res.json()
        setMovements(data)
      }
    } catch (err) {
      console.error('Error fetching stock movements:', err)
    } finally {
      setLoading(false)
    }
  }

  // Transform movements into chart data
  const transformToChartData = (movements: any[]) => {
    if (!movements || movements.length === 0) return []
    
    // Sort by transaction_date (actual transaction date) or fall back to created_at
    const sortedMovements = movements
      .slice()
      .sort((a, b) => {
        const dateA = new Date(a.transaction_date || a.created_at).getTime()
        const dateB = new Date(b.transaction_date || b.created_at).getTime()
        return dateA - dateB
      })
    
    // Debug: Log the movements to console for verification
    console.log('Stock movements (chronological order):', sortedMovements.map(m => ({
      transactionDate: m.transaction_date,
      createdAt: m.created_at,
      type: m.movement_type,
      change: m.quantity_change,
      before: m.quantity_before,
      after: m.quantity_after
    })))
    
    return sortedMovements.map(movement => {
      // Use transaction_date if available, otherwise fall back to created_at
      const displayDate = movement.transaction_date || movement.created_at
      return {
        date: new Date(displayDate).toLocaleDateString(),
        time: new Date(displayDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        stock: movement.quantity_after,
        change: movement.quantity_change,
        type: movement.movement_type,
        fullDate: displayDate
      }
    })
  }

  const getMovementBadgeProps = (type: string) => {
    switch (type) {
      case 'sale':
        // use Badge destructive variant to match Out of Stock
        return { variant: 'destructive' as const }
      case 'restock':
        // green look - Badge doesn't have a green variant by default, use classes
        return { className: 'bg-green-100 text-green-800' }
      case 'adjustment':
        // blue-ish informational
        return { className: 'bg-blue-100 text-blue-800' }
      case 'initial':
        return { className: 'bg-gray-100 text-gray-800' }
      default:
        return { className: 'bg-gray-100 text-gray-800' }
    }
  }

  const chartData = transformToChartData(movements)
  // For recent movements table, show newest first
  const recentMovements = movements.slice(0, 10) // Show last 10 movements (already in desc order from API)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <p className="text-muted-foreground">Loading stock movements...</p>
      </div>
    )
  }

  if (!movements || movements.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] text-center">
        <div>
          <div className="text-muted-foreground mb-2">No stock movement data available</div>
          <p className="text-sm text-muted-foreground">Stock movements will appear here as you make sales and adjustments</p>
        </div>
      </div>
    )
  }
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Stock Level History</CardTitle>
          <CardDescription>Stock quantity changes over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              stock: {
                label: "Stock Level",
                color: "hsl(var(--chart-3))",
              },
            }}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <ChartTooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                          <p className="font-medium">{label}</p>
                          <p className="text-sm text-muted-foreground">{data.time}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="w-3 h-3 rounded-full bg-chart-3" />
                            <span className="text-sm">Stock Level: {data.stock}</span>
                          </div>
                          <p className="text-sm mt-1">
                            <span className={`font-medium ${data.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {data.change > 0 ? '+' : ''}{data.change}
                            </span>
                            <span className="text-muted-foreground ml-1">({data.type})</span>
                          </p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="stock" 
                  stroke="var(--color-chart-3)" 
                  strokeWidth={2}
                  dot={{ fill: "var(--color-chart-3)", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: "var(--color-chart-3)", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Stock Movements</CardTitle>
          <CardDescription>Latest inventory changes and transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Change</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>New Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentMovements.map((movement, index) => {
                // Use transaction_date if available, otherwise fall back to created_at
                const displayDate = movement.transaction_date || movement.created_at
                return (
                  <TableRow key={movement.id || index}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{new Date(displayDate).toLocaleDateString()}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(displayDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {/* Use Badge variant to leverage centralized styling (destructive matches Out of Stock) */}
                      {
                        // Centralized props for Badge per movement type
                        (() => {
                          const props = getMovementBadgeProps(movement.movement_type)
                          return <Badge {...props}>{movement.movement_type}</Badge>
                        })()
                      }
                    </TableCell>
                    <TableCell className={movement.quantity_change > 0 ? "text-green-800 font-medium" : "text-red-800 font-medium"}>
                      {movement.quantity_change > 0 ? "+" : ""}{movement.quantity_change}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {movement.notes || `${movement.movement_type} transaction`}
                    </TableCell>
                    <TableCell className="font-medium">{movement.quantity_after}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
