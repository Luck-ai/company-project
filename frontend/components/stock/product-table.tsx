"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { Eye, Edit, Trash2, AlertTriangle, Package, DollarSign, Filter } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UnifiedTable, TableColumn, TableAction } from "./unified-table"
import { apiFetch } from "@/lib/api"
import type { Product } from "./stock-management"

interface ProductTableProps {
  products?: Product[]
  onEdit?: (product: Product) => void
  onDelete?: (id: string, name?: string) => void
  categories?: string[]
  searchTerm?: string
}

export function ProductTable({ 
  products, 
  onEdit, 
  onDelete, 
  categories,
  searchTerm = ""
}: ProductTableProps) {
  const [fetchedProducts, setFetchedProducts] = useState<Product[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [selectedStockStatus, setSelectedStockStatus] = useState<string>('All')

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

  // Fetch products if not provided
  useEffect(() => {
    let active = true
    if (products !== undefined) {
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

  const sourceProducts = products ?? fetchedProducts ?? []
  
  // Build a list of categories to show in the filter
  const derivedCategories = Array.from(new Set(sourceProducts.map((p) => p.category).filter(Boolean)))
  const categoryOptions = (categories && categories.length ? categories : derivedCategories) || []
  
  // Filter products based on search term, category, and stock status
  const filteredProducts = sourceProducts.filter(product => {
    // Search term filter
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.supplier.toLowerCase().includes(searchTerm.toLowerCase())
    
    // Category filter
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory
    
    // Stock status filter
    let matchesStockStatus = true
    if (selectedStockStatus !== 'All') {
      const serverLabel = (product as any).statusLabel as string | undefined
      const computed = getStockStatus(product.quantity, product.lowStockThreshold)
      const currentStatus = serverLabel ?? computed.label
      matchesStockStatus = currentStatus === selectedStockStatus
    }
    
    return matchesSearch && matchesCategory && matchesStockStatus
  })

  const columns: TableColumn[] = [
    {
      key: 'name',
      label: 'Product',
      className: 'font-medium',
    },
    {
      key: 'sku',
      label: 'SKU',
      className: 'font-mono text-sm',
    },
    {
      key: 'category',
      label: 'Category',
    },
    {
      key: 'quantity',
      label: 'Quantity',
      render: (_, product) => {
        const serverLabel = (product as any).statusLabel as string | undefined
        const serverIsLow = (product as any).isLowStockFlag as boolean | undefined
        const computed = getStockStatus(product.quantity, product.lowStockThreshold)
        
        const isOutOfStockFlagForUI = computed.label === 'Out of Stock'
        const isLowStockFlagForUI = typeof serverIsLow === 'boolean' ? serverIsLow : computed.label === 'Low Stock'
        
        return (
          <div className="flex items-center space-x-2">
            <span className={
              isOutOfStockFlagForUI ? 'text-red-700 font-semibold' : 
              isLowStockFlagForUI ? 'text-yellow-700 font-semibold' : ''
            }>
              {product.quantity}
            </span>
            {(isLowStockFlagForUI || isOutOfStockFlagForUI) && (
              <AlertTriangle className={
                isOutOfStockFlagForUI ? 'h-4 w-4 text-red-600' : 
                'h-4 w-4 text-yellow-600'
              } />
            )}
          </div>
        )
      }
    },
    {
      key: 'lowStockThreshold',
      label: 'Low Threshold',
      className: 'text-sm',
    },
    {
      key: 'price',
      label: 'Price',
      render: (_, product) => (
        <div className="flex items-center space-x-1">
          <DollarSign className="h-3 w-3 text-muted-foreground" />
          <span>{Number(product.price).toFixed(2)}</span>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (_, product) => {
        const serverLabel = (product as any).statusLabel as string | undefined
        const serverVariant = (product as any).statusVariant as string | undefined
        const computed = getStockStatus(product.quantity, product.lowStockThreshold)
        
        const label = serverLabel ?? computed.label
        const variant = (serverVariant as 'destructive' | 'secondary' | 'default') ?? computed.variant
        
        return <Badge variant={variant}>{label}</Badge>
      }
    },
    {
      key: 'supplier',
      label: 'Supplier',
    },
    {
      key: 'lastUpdated',
      label: 'Last Updated',
      render: (_, product) => formatDateOnly(product.lastUpdated)
    }
  ]

  const actions: TableAction[] = [
    {
      icon: <Eye className="h-4 w-4" />,
      label: 'View',
      onClick: () => {},
      href: '/dashboard/products/:id'
    },
    {
      icon: <Edit className="h-4 w-4" />,
      label: 'Edit',
      onClick: (product) => onEdit?.(product),
    },
    {
      icon: <Trash2 className="h-4 w-4" />,
      label: 'Delete',
      onClick: () => {}, // Handled by UnifiedTable
    },
  ]

  const handleDelete = async (id: string, name?: string) => {
    if (onDelete) {
      await onDelete(id, name)
    }
  }

  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Products</div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Category</span>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Categories</SelectItem>
                {categoryOptions.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Stock Status</span>
            <Select value={selectedStockStatus} onValueChange={setSelectedStockStatus}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Status</SelectItem>
                <SelectItem value="In Stock">In Stock</SelectItem>
                <SelectItem value="Low Stock">Low Stock</SelectItem>
                <SelectItem value="Out of Stock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <UnifiedTable
        data={filteredProducts}
        columns={columns}
        actions={actions}
        loading={loading}
        error={error}
        emptyMessage="No products found"
        onDelete={handleDelete}
        getItemId={(item) => item.id}
        getItemName={(item) => item.name}
      />
    </div>
  )
}