"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

import { ArrowLeft, TrendingUp, TrendingDown, Package, DollarSign } from "lucide-react"
import { SalesChart } from "./sales-chart"
import { StockMovementChart } from "./stock-movement-chart"


import { apiFetch } from '@/lib/api'
import { useAppToast } from '@/lib/use-toast'
import type { Product } from "@/components/stock/stock-management"

interface ProductDetailsProps {
  productId: string
}

export function ProductDetails({ productId }: ProductDetailsProps) {
  const router = useRouter()
  const { push: pushToast } = useAppToast()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)




  const [stockMovements, setStockMovements] = useState<any[]>([])


  // Mock data for product details
  const generateMockStockMovements = (productId: string) => {
    const movementTypes = ['sale', 'restock', 'adjustment', 'initial']
    const movements = []
    let currentStock = 150
    
    // Generate last 30 days of movements
    for (let i = 30; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      
      // Random number of movements per day (0-3)
      const dailyMovements = Math.floor(Math.random() * 4)
      
      for (let j = 0; j < dailyMovements; j++) {
        const type = movementTypes[Math.floor(Math.random() * movementTypes.length)]
        let change = 0
        
        switch (type) {
          case 'sale':
            change = -Math.floor(Math.random() * 10) - 1 // -1 to -10
            break
          case 'restock':
            change = Math.floor(Math.random() * 50) + 10 // +10 to +60
            break
          case 'adjustment':
            change = Math.floor(Math.random() * 21) - 10 // -10 to +10
            break
          case 'initial':
            change = 0
            break
        }
        
        const quantityBefore = currentStock
        currentStock = Math.max(0, currentStock + change)
        
        movements.push({
          id: movements.length + 1,
          product_id: parseInt(productId),
          movement_type: type,
          quantity_change: change,
          quantity_before: quantityBefore,
          quantity_after: currentStock,
          transaction_date: date.toISOString(),
          created_at: date.toISOString(),
          notes: type === 'sale' ? 'Online sale' : type === 'restock' ? 'Supplier delivery' : 'Stock adjustment'
        })
      }
    }
    
    return movements.reverse() // Most recent first
  }

  const fetchStockMovements = async (productId: string) => {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 200))
      const movements = generateMockStockMovements(productId)
      setStockMovements(movements)
    } catch (err) {
      console.error('Error generating mock stock movements:', err)
      setStockMovements([])
    }
  }

  const fetchProduct = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // Generate mock product data based on productId
      const mockProduct: Product = {
        id: parseInt(productId),
        name: `Product ${productId}`,
        sku: `SKU-${productId.padStart(3, '0')}`,
        category_id: Math.floor(Math.random() * 6) + 1,
        description: `High-quality product with excellent features. Perfect for everyday use.`,
        price: Math.floor(Math.random() * 200) + 20,
        quantity: Math.floor(Math.random() * 100) + 10,
        low_stock_threshold: 15,
        size: ['XS', 'S', 'M', 'L', 'XL', 'XXL'][Math.floor(Math.random() * 6)],
        color: ['Black', 'White', 'Navy', 'Gray', 'Red'][Math.floor(Math.random() * 5)],
        material: 'Cotton Blend',
        brand: ['StyleCo', 'TrendWear', 'UrbanFit', 'ClassicThread'][Math.floor(Math.random() * 4)],
        user_id: 1,
        last_updated: new Date().toISOString().split('T')[0],
        category: {
          id: Math.floor(Math.random() * 6) + 1,
          name: ['T-Shirts', 'Jeans', 'Hoodies', 'Dresses', 'Jackets', 'Accessories'][Math.floor(Math.random() * 6)]
        }
      }
      
      setProduct(mockProduct)
      
      // Fetch stock movements for this product
      await fetchStockMovements(productId)
    } catch (err: any) {
      console.error('Error generating mock product:', err)
      setError(err.message || 'Failed to load product')
    } finally {
      setLoading(false)
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
        <p className="text-muted-foreground">Loading product...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-destructive mb-2">Error loading product</p>
          <p className="text-muted-foreground text-sm">{error}</p>
          <Button variant="outline" onClick={() => router.back()} className="mt-4">
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
          <p className="text-muted-foreground mb-2">Product not found</p>
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  const getStockStatus = (quantity: number, threshold: number) => {
    if (quantity === 0) return { label: "Out of Stock", variant: "destructive" as const }
    if (quantity <= threshold) return { label: "Low Stock", variant: "secondary" as const }
    return { label: "In Stock", variant: "default" as const }
  }

  const status = getStockStatus(product.quantity, product.low_stock_threshold)









  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{product.name}</h1>
            <p className="text-muted-foreground">SKU: {product.sku}</p>
          </div>
        </div>
      </div>

      {/* Product Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Stock</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{product.quantity}</div>
            <Badge variant={status.variant} className="mt-2">
              {status.label}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unit Price</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${product.price}</div>
            <p className="text-xs text-muted-foreground mt-2">Per unit</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(product.quantity * product.price).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-2">Current inventory value</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alert</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{product.low_stock_threshold}</div>
            <p className="text-xs text-muted-foreground mt-2">Threshold level</p>
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
                <p className="text-sm font-medium text-muted-foreground">Name</p>
                <p className="text-sm">{product.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">SKU</p>
                <p className="text-sm font-mono">{product.sku}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Category</p>
                <p className="text-sm">{product.category && typeof product.category === 'object' ? product.category.name : (product.category || 'Uncategorized')}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Brand</p>
                <p className="text-sm">{product.brand}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                <p className="text-sm">{product.last_updated}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <Badge variant={status.variant}>{status.label}</Badge>
              </div>
            </div>
            {product.description && (
              <div className="mt-6 pt-4 border-t">
                <p className="text-sm font-medium text-muted-foreground">Description</p>
                <p className="text-sm">{product.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sales History */}
        <Card>
          <CardHeader>
              <CardTitle>Sales History</CardTitle>
              <CardDescription>View sales performance over time</CardDescription>
          </CardHeader>
          <CardContent>
            <SalesChart productId={productId} />
          </CardContent>
        </Card>

        {/* Stock Movement */}
        <Card>
          <CardHeader>
            <CardTitle>Stock Movement</CardTitle>
            <CardDescription>Monitor inventory changes and trends</CardDescription>
          </CardHeader>
          <CardContent>
            <StockMovementChart productId={productId} stockMovements={stockMovements} />
          </CardContent>
        </Card>
      </div>





    </div>
  )
}
