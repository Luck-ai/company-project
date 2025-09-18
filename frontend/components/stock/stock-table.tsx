"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Edit, Trash2, AlertTriangle, Eye, Grid, List, Filter, Package, DollarSign } from "lucide-react"
import { apiFetch } from '@/lib/api'
import type { Product } from "./stock-management"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

interface StockTableProps {
  products?: Product[]
  onEdit?: (product: Product) => void
  onDelete?: (id: string) => void
  categories?: string[]
}

export function StockTable({ products, onEdit, onDelete, categories }: StockTableProps) {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const getStockStatus = (quantity: number, threshold: number) => {
  
    if (!threshold || threshold <= 0) {
      if (quantity === 0) return { label: "Out of Stock", variant: "destructive" as const }
      return { label: "In Stock", variant: "default" as const }
    }

    const margin = Math.ceil(threshold * 0.2) 

    if (quantity < threshold) return { label: "Out of Stock", variant: "destructive" as const }
    if (Math.abs(threshold - quantity) <= margin) return { label: "Low Stock", variant: "secondary" as const }
    return { label: "In Stock", variant: "default" as const }
  }

  const [fetchedProducts, setFetchedProducts] = useState<Product[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Helper to show only the date portion of an ISO datetime or other date string
  const formatDateOnly = (val?: string) => {
    if (!val) return ''
    try {
      const d = new Date(val)
      if (isNaN(d.getTime())) return String(val)
      return d.toLocaleDateString()
    } catch (e) {
      return String(val)
    }
  }

  const handleDelete = async (id: string, name?: string) => {
    
    if (onDelete) {
      onDelete(id)
      return
    }

    setPendingDelete({ id, name })
    setConfirmOpen(true)
  }

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name?: string } | null>(null)
  const [confirmProductError, setConfirmProductError] = useState<string | null>(null)

  async function performDelete(id: string) {
    try {
      const url = `/products/${id}`

      const res = await apiFetch(url, { method: 'DELETE' })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        console.error('Failed to delete product', { status: res.status, body: text })
        const message = text || 'Failed to delete product'
        setConfirmProductError(message)
        throw new Error(message)
      }
      
      setFetchedProducts((prev) => (prev ? prev.filter((p) => p.id !== id) : prev))
      setConfirmOpen(false)
    } catch (err) {
      console.error('Error deleting product', err)
      const message = (err as any)?.message ?? 'Error deleting product'
      setConfirmProductError(String(message))
      throw err
    }
  }

  useEffect(() => {
    let active = true
    // If parent supplied products (even an empty array), don't fetch — parent is authoritative.
    if (products !== undefined) {
      // Ensure we are not left in a loading state if a previous fetch was in-flight.
      setFetchedProducts(null)
      setLoading(false)
      setError(null)
      return
    }
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
  const res = await apiFetch('/products/')
        if (!active) return
        if (!res.ok) {
          const text = await res.text()
          throw new Error(`Failed to fetch products: ${res.status} ${text}`)
        }
        const data = await res.json()
  // Raw response received from /products/
        if (!active) return
        const mapped: Product[] = Array.isArray(data)
          ? data.map((p: any) => ({
              id: String(p.id ?? ""),
              name: p.name ?? "",
              sku: p.sku ?? "",
              category: p.category?.name ?? p.category ?? "",
              description: p.description ?? "",
              quantity: Number(p.quantity ?? 0),
              price: Number(p.price ?? 0),
              
              lowStockThreshold: Number(p.low_stock_threshold ?? 0),
              
              statusLabel: p.status ?? p.quantity_warning_label ?? undefined,
              statusVariant: p.quantity_warning_variant ?? undefined,
              isLowStockFlag: typeof p.is_low_stock === 'boolean' ? p.is_low_stock : undefined,
              supplier: p.supplier?.name ?? p.supplier ?? "",
              lastUpdated: p.last_updated ?? p.lastUpdated ?? "",
            }))
          : []
        setFetchedProducts(mapped)
  // Mapped products ready for UI
      } catch (err: any) {
        console.error(err)
        if (active) setError(err.message || String(err))
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [products])

  // Listen for global CSV upload events and refresh data when products are uploaded
  useEffect(() => {
    let active = true
    const handler = (e: any) => {
      try {
        const url: string = e?.detail?.url
        if (url && url.includes('/products')) {
          // force a refetch by clearing fetchedProducts and letting effect run
          setFetchedProducts(null)
          // trigger the fetch effect by calling the inner fetch directly
          ;(async () => {
            setLoading(true)
            setError(null)
            try {
              const res = await apiFetch('/products/')
              if (!res.ok) throw new Error(`Failed to fetch products: ${res.status}`)
              const data = await res.json()
              const mapped: Product[] = Array.isArray(data)
                ? data.map((p: any) => ({
                    id: String(p.id ?? ""),
                    name: p.name ?? "",
                    sku: p.sku ?? "",
                    category: p.category?.name ?? p.category ?? "",
                    description: p.description ?? "",
                    quantity: Number(p.quantity ?? 0),
                    price: Number(p.price ?? 0),
                    lowStockThreshold: Number(p.low_stock_threshold ?? 0),
                    statusLabel: p.status ?? p.quantity_warning_label ?? undefined,
                    statusVariant: p.quantity_warning_variant ?? undefined,
                    isLowStockFlag: typeof p.is_low_stock === 'boolean' ? p.is_low_stock : undefined,
                    supplier: p.supplier?.name ?? p.supplier ?? "",
                    lastUpdated: p.last_updated ?? p.lastUpdated ?? "",
                  }))
                : []
              if (active) setFetchedProducts(mapped)
            } catch (err: any) {
              console.error(err)
              if (active) setError(err.message || String(err))
            } finally {
              if (active) setLoading(false)
            }
          })()
        }
      } catch (err) {
        // ignore
      }
    }
    window.addEventListener('csv:uploaded', handler)
    return () => {
      active = false
      window.removeEventListener('csv:uploaded', handler)
    }
  }, [])

  const sourceProducts = products && products.length ? products : fetchedProducts ?? []

  // Build a list of categories to show in the filter. Prefer explicit prop from parent,
  // otherwise derive from the current product set.
  const derivedCategories = Array.from(new Set(sourceProducts.map((p) => p.category).filter(Boolean)))
  const categoryOptions = (categories && categories.length ? categories : derivedCategories) || []

  const displayedProducts = selectedCategory && selectedCategory !== 'All'
    ? sourceProducts.filter((p) => p.category === selectedCategory)
    : sourceProducts

  if (loading) return <div className="rounded-md border p-4">Loading products...</div>
  if (error) return <div className="rounded-md border p-4 text-destructive">Error: {error}</div>

  return (
    <div className="rounded-md border">
      <div className="flex items-center justify-between p-4">
        <div className="text-sm font-medium">Inventory</div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filter</span>
            <Select defaultValue={selectedCategory} onValueChange={(v) => setSelectedCategory(v)}>
              <SelectTrigger size="sm">
                <SelectValue>{selectedCategory}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                {categoryOptions.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('list')}>
            <List className="mr-2 h-4 w-4" /> List
          </Button>
          <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('grid')}>
            <Grid className="mr-2 h-4 w-4" /> Grid
          </Button>
        </div>
      </div>
      {viewMode === 'grid' ? (
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedProducts.map((product) => {
              const serverLabel = (product as any).statusLabel as string | undefined
              const serverVariant = (product as any).statusVariant as 'destructive' | 'secondary' | 'default' | undefined
              const serverIsLow = (product as any).isLowStockFlag as boolean | undefined

              const computed = getStockStatus(product.quantity, product.lowStockThreshold)
              const label = serverLabel ?? computed.label
              const variant = serverVariant ?? computed.variant
              const isLowStockFlagForUI = typeof serverIsLow === 'boolean' ? serverIsLow : computed.label === 'Low Stock'
              const isOutOfStockFlagForUI = computed.label === 'Out of Stock'

              // Get status colors similar to products listing
              const getStatusColor = (status: string) => {
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

              const getStatusIcon = (status: string) => {
                switch (status) {
                  case "In Stock":
                    return <Package className="h-3 w-3" />
                  case "Low Stock":
                    return <AlertTriangle className="h-3 w-3" />
                  case "Out of Stock":
                    return <AlertTriangle className="h-3 w-3" />
                  default:
                    return <Package className="h-3 w-3" />
                }
              }

              return (
                <Card key={product.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                          <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{product.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">{product.sku}</p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(label)}>
                        {getStatusIcon(label)}
                        <span className="ml-1">{label}</span>
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">${Number(product.price).toFixed(2)}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span>{product.quantity} units</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm">{product.category || 'Uncategorized'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button size="sm" variant="ghost" onClick={() => onEdit && onEdit(product)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(product.id, product.name)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" asChild>
                          <Link href={`/dashboard/products/${product.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
          {displayedProducts.length === 0 && (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No products found</h3>
              <p className="text-muted-foreground">Try adjusting your search or category filter</p>
            </div>
          )}
        </div>
      ) : (
        <>
          <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(v) => {
          setConfirmOpen(v)
          if (!v) { setPendingDelete(null); setConfirmProductError(null) }
        }}
        title="Delete product"
        description={pendingDelete && pendingDelete.name ? `Delete '${pendingDelete.name}'? This action cannot be undone.` : "Are you sure you want to delete this product? This action cannot be undone."}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        error={confirmProductError}
        onConfirm={async () => {
          if (!pendingDelete) return
          await performDelete(pendingDelete.id)
        }}
      />
        <Table>
        <TableHeader className="bg-transparent">
          <TableRow className="border-b-2" style={{ borderColor: 'var(--ui-table-header-border)' }}>
            <TableHead className="w-12">#</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>Low Threshold</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Supplier</TableHead>
            <TableHead>Last Updated</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayedProducts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={11} className="text-center py-8 text-sm text-muted-foreground">
                No products found
              </TableCell>
            </TableRow>
          ) : (
            <>
              {displayedProducts.map((product) => {
                // Determine status label/variant using server-provided values when available.
                const serverLabel = (product as any).statusLabel as string | undefined
                const serverVariant = (product as any).statusVariant as string | undefined
                const serverIsLow = (product as any).isLowStockFlag as boolean | undefined

                const computed = getStockStatus(product.quantity, product.lowStockThreshold)
                const label = serverLabel ?? computed.label
                // Accept serverVariant values that match our Badge variants; fallback to computed mapping.
                const variant = (serverVariant as 'destructive' | 'secondary' | 'default') ?? computed.variant
                // Determine whether this product should be considered low stock or out of stock for styling
                const isLowStockFlagForUI = typeof serverIsLow === 'boolean' ? serverIsLow : computed.label === 'Low Stock'
                const isOutOfStockFlagForUI = computed.label === 'Out of Stock'

                return (
                  <TableRow key={product.id} style={{ backgroundColor: 'var(--ui-table-row-bg)', borderTop: '2px solid var(--ui-table-row-border)' }}>
                    <TableCell className="w-12 py-4">
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" className="accent-purple-600" />
                        {/* compact placeholder removed to simplify layout */}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span className={isOutOfStockFlagForUI ? 'text-red-700 font-semibold' : isLowStockFlagForUI ? 'text-yellow-700 font-semibold' : ''}>{product.quantity}</span>
                        {/* Show warning icon if server explicitly marks low stock/out-of-stock, else use computed status */}
                        {(() => {
                          // If server explicitly set a boolean flag, respect it
                          if (typeof serverIsLow === 'boolean') return serverIsLow
                          // Otherwise use computed status
                          const computedForIcon = getStockStatus(product.quantity, product.lowStockThreshold)
                          return computedForIcon.label !== 'In Stock'
                        })() && (
                          <AlertTriangle className={isOutOfStockFlagForUI ? 'h-4 w-4 text-red-600' : isLowStockFlagForUI ? 'h-4 w-4 text-yellow-600' : 'h-4 w-4 text-destructive'} />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{product.lowStockThreshold}</TableCell>
                    <TableCell>{Number(product.price).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={variant as any}>{label}</Badge>
                    </TableCell>
                    <TableCell>{product.supplier}</TableCell>
                    <TableCell>{formatDateOnly(product.lastUpdated)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/dashboard/products/${product.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => onEdit && onEdit(product)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(product.id, product.name)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </>
          )}
        </TableBody>
        </Table>
        </>
      )}
    </div>
  )
}
