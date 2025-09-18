"use client"

import { useState, useEffect } from "react"
import { Eye, Edit, Trash2, Package } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { UnifiedTable, TableColumn, TableAction } from "./unified-table"
import { apiFetch } from "@/lib/api"

export interface Category {
  id: number
  name: string
  description?: string
  productCount?: number
}

interface CategoryTableProps {
  categories?: Category[]
  onEdit?: (category: Category) => void
  onDelete?: (id: string, name?: string) => void
  onView?: (category: Category) => void
  searchTerm?: string
}

export function CategoryTable({ 
  categories, 
  onEdit, 
  onDelete, 
  onView,
  searchTerm = ""
}: CategoryTableProps) {
  const [fetchedCategories, setFetchedCategories] = useState<Category[] | null>(null)
  const [productCounts, setProductCounts] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch categories if not provided
  useEffect(() => {
    let active = true
    if (categories !== undefined) {
      setFetchedCategories(null)
      setLoading(false)
      setError(null)
      return
    }

    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await apiFetch('/categories/')
        if (!active) return
        if (!res.ok) {
          const text = await res.text()
          throw new Error(`Failed to fetch categories: ${res.status} ${text}`)
        }
        const data = await res.json()
        if (!active) return
        
        const mapped: Category[] = Array.isArray(data)
          ? data.map((c: any) => ({
              id: Number(c.id ?? 0),
              name: c.name ?? "",
              description: c.description ?? "",
            }))
          : []
        setFetchedCategories(mapped)
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
  }, [categories])

  // Fetch product counts for each category
  useEffect(() => {
    const sourceCategories = categories ?? fetchedCategories ?? []
    if (sourceCategories.length === 0) return

    ;(async () => {
      try {
        const res = await apiFetch('/products/')
        if (!res.ok) return
        const products = await res.json()
        
        const counts: Record<number, number> = {}
        sourceCategories.forEach(cat => {
          counts[cat.id] = Array.isArray(products) 
            ? products.filter((p: any) => 
                (p.category?.name === cat.name || p.category === cat.name)
              ).length 
            : 0
        })
        setProductCounts(counts)
      } catch (err) {
        console.error('Error fetching product counts:', err)
      }
    })()
  }, [categories, fetchedCategories])

  const sourceCategories = categories ?? fetchedCategories ?? []
  
  // Filter categories based on search term
  const filteredCategories = sourceCategories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (category.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const columns: TableColumn[] = [
    {
      key: 'name',
      label: 'Category Name',
      className: 'font-medium',
    },
    {
      key: 'description',
      label: 'Description',
      className: 'text-sm text-muted-foreground',
      render: (value) => value || '—'
    },
    {
      key: 'productCount',
      label: 'Products',
      render: (_, category) => (
        <div className="flex items-center space-x-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span>{productCounts[category.id] || 0} items</span>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (_, category) => {
        const count = productCounts[category.id] || 0
        return (
          <Badge variant={count > 0 ? "default" : "secondary"}>
            {count > 0 ? "Active" : "Unused"}
          </Badge>
        )
      }
    }
  ]

  const actions: TableAction[] = [
    {
      icon: <Eye className="h-4 w-4" />,
      label: 'View',
      onClick: (category) => onView?.(category),
    },
    {
      icon: <Edit className="h-4 w-4" />,
      label: 'Edit',
      onClick: (category) => onEdit?.(category),
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
    <UnifiedTable
      data={filteredCategories}
      columns={columns}
      actions={actions}
      loading={loading}
      error={error}
      emptyMessage="No categories found"
      onDelete={handleDelete}
      getItemId={(item) => String(item.id)}
      getItemName={(item) => item.name}
    />
  )
}