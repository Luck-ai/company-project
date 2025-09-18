"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ArrowLeft, Edit, TrendingUp, TrendingDown, Package, DollarSign, User, RefreshCw, Plus, Upload } from "lucide-react"
import { SalesChart } from "./sales-chart"
import { StockMovementChart } from "./stock-movement-chart"
import { EditProductDialog } from "@/components/stock/edit-product-dialog"
import { AddSaleDialog } from "./add-sale-dialog"
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
  const [viewSupplier, setViewSupplier] = useState<any | null>(null)
  const [supplierData, setSupplierData] = useState<any | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isUploadingSales, setIsUploadingSales] = useState(false)
  const [isAddSaleDialogOpen, setIsAddSaleDialogOpen] = useState(false)
  const [stockMovements, setStockMovements] = useState<any[]>([])
  const [salesRefreshTrigger, setSalesRefreshTrigger] = useState(0)

  const fetchStockMovements = async (productId: string) => {
    try {
      const res = await apiFetch(`/products/${productId}/stock-movements`)
      if (res.ok) {
        const movements = await res.json()
        setStockMovements(movements)
      } else {
        const errorText = await res.text()
        console.error('Stock movements fetch failed:', res.status, errorText)
        setStockMovements([])
      }
    } catch (err) {
      console.error('Error fetching stock movements:', err)
      setStockMovements([])
    }
  }

  const fetchProduct = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const res = await apiFetch(`/products/${productId}`)
      if (!res.ok) {
        throw new Error(`Failed to fetch product: ${res.status}`)
      }
      
      const data = await res.json()
      
      // Direct mapping now that backend returns nested category & supplier objects
      const categoryName = data.category?.name ?? (typeof data.category === 'string' ? data.category : '') ?? ''
      const mappedProduct: Product = {
        id: String(data.id ?? ""),
        name: data.name ?? "",
        sku: data.sku ?? "",
        category: categoryName,
        description: data.description ?? "",
        quantity: Number(data.quantity ?? 0),
        price: Number(data.price ?? 0),
        lowStockThreshold: Number(data.low_stock_threshold ?? data.lowStockThreshold ?? 0),
        supplier: data.supplier?.name ?? data.supplier ?? "",
        lastUpdated: data.last_updated ?? data.lastUpdated ?? "",
      }
      
      setProduct(mappedProduct)
      
      // Fetch sales data and stock movements for this product
      await Promise.all([

        fetchStockMovements(mappedProduct.id)
      ])
    } catch (err: any) {
      console.error('Error fetching product:', err)
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

  const status = getStockStatus(product.quantity, product.lowStockThreshold)

  const handleViewSupplier = async () => {
    try {
      const res = await apiFetch('/suppliers/')
      if (res.ok) {
        const suppliers = await res.json()
        const supplier = suppliers.find((s: any) => s.name === product.supplier || s.id === product.supplier)
        if (supplier) {
          setSupplierData(supplier)
          setViewSupplier(supplier)
        }
      }
    } catch (err) {
      console.error('Error fetching supplier:', err)
    }
  }

  const handleEditProduct = (updatedProduct: Product) => {
    setProduct(updatedProduct)
    setIsEditDialogOpen(false)
    // Refresh stock movements to show any manual quantity changes
    fetchStockMovements(updatedProduct.id)
    pushToast({
      title: "Product Updated",
      description: "Product details have been successfully updated.",
      variant: "success"
    })
  }

  const handleAddSales = () => {
    setIsAddSaleDialogOpen(true)
  }

  const handleUploadSales = () => {
    // Create a file input for CSV upload
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.csv'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      
      setIsUploadingSales(true)
      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('product_id', productId)
        
        const res = await apiFetch('/sales/upload', {
          method: 'POST',
          body: formData
        })
        
        if (res.ok) {
          const result = await res.json()
          console.log('CSV upload result:', result) // Debug logging
          // Refresh all data after upload (product data includes updated stock quantity)
          await Promise.all([
            fetchProduct(), // Refresh product data to show updated stock
            fetchStockMovements(productId)
          ])
          // Trigger sales chart refresh
          setSalesRefreshTrigger(prev => prev + 1)
          
          pushToast({
            title: "Success",
            description: `Successfully uploaded ${result.sales_created} of ${result.total_rows_processed || 'unknown'} sales records!`,
            variant: "success"
          })
          
          if (result.errors && result.errors.length > 0) {
            pushToast({
              title: "Warnings",
              description: `${result.errors.length} rows had issues. Check console for details.`,
              variant: "default"
            })
            console.warn('Upload warnings:', result.errors)
          }
        } else {
          const errorData = await res.json().catch(() => ({ detail: 'Unknown error' }))
          pushToast({
            title: "Upload Failed",
            description: errorData.detail || 'Unknown error occurred',
            variant: "error"
          })
        }
      } catch (err) {
        console.error('Error uploading sales:', err)
        pushToast({
          title: "Error",
          description: "Failed to upload sales data",
          variant: "error"
        })
      } finally {
        setIsUploadingSales(false)
      }
    }
    input.click()
  }

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
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleViewSupplier}>
            <User className="h-4 w-4 mr-2" />
            View Supplier
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/restock">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reorder Stock
            </Link>
          </Button>
          <Button onClick={() => setIsEditDialogOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Product
          </Button>
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
            <div className="text-2xl font-bold">{product.lowStockThreshold}</div>
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
                <p className="text-sm">{product.category || 'Uncategorized'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Supplier</p>
                <p className="text-sm">{product.supplier}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                <p className="text-sm">{product.lastUpdated}</p>
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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Sales History</CardTitle>
                <CardDescription>Track sales performance over time. CSV format: quantity,sale_date (YYYY-MM-DD)</CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={handleAddSales}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Sales
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleUploadSales}
                  disabled={isUploadingSales}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isUploadingSales ? 'Uploading...' : 'Upload CSV'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <SalesChart productId={productId} refreshTrigger={salesRefreshTrigger} />
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

      {/* View Supplier Dialog */}
      {viewSupplier && (
        <Dialog open={true} onOpenChange={(open) => { if (!open) setViewSupplier(null) }}>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader className="sr-only">
              <DialogTitle>{viewSupplier.name}</DialogTitle>
              <DialogDescription>{viewSupplier.email ?? ''}{viewSupplier.phone ? ` · ${viewSupplier.phone}` : ''}</DialogDescription>
            </DialogHeader>
            <Card>
              <CardHeader>
                <CardTitle>{viewSupplier.name}</CardTitle>
                <CardDescription>{viewSupplier.email ?? ''}{viewSupplier.phone ? ` · ${viewSupplier.phone}` : ''}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Name</div>
                  <div className="font-medium">{viewSupplier.name}</div>
                  <div className="text-sm text-muted-foreground">Email</div>
                  <div className="text-sm">{viewSupplier.email ?? '—'}</div>
                  <div className="text-sm text-muted-foreground">Phone</div>
                  <div className="text-sm">{viewSupplier.phone ?? '—'}</div>
                  <div className="text-sm text-muted-foreground">Address</div>
                  <div className="text-sm">{viewSupplier.address ?? '—'}</div>
                </div>
              </CardContent>
            </Card>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Product Dialog */}
      {product && (
        <EditProductDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          product={product}
          onEdit={handleEditProduct}
        />
      )}

      {/* Add Sale Dialog */}
      {product && (
        <AddSaleDialog
          open={isAddSaleDialogOpen}
          onOpenChange={setIsAddSaleDialogOpen}
          productId={product.id}
          productName={product.name}
          productPrice={product.price}
          onSaleAdded={async () => {
            // Refresh all data after manual sale (product data includes updated stock quantity)
            await Promise.all([
              fetchProduct(), // Refresh product data to show updated stock
              fetchStockMovements(product.id)
            ])
            // Trigger sales chart refresh
            setSalesRefreshTrigger(prev => prev + 1)
          }}
        />
      )}
    </div>
  )
}
