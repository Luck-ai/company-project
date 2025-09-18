"use client"

import { useState, useEffect } from "react"
import { Eye, Edit, Trash2, Mail, Phone, MapPin, Package } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { UnifiedTable, TableColumn, TableAction } from "./unified-table"
import { apiFetch } from "@/lib/api"

export interface Supplier {
  id: number
  name: string
  email?: string
  phone?: string
  address?: string
  productCount?: number
}

interface SupplierTableProps {
  suppliers?: Supplier[]
  onEdit?: (supplier: Supplier) => void
  onDelete?: (id: string, name?: string) => void
  onView?: (supplier: Supplier) => void
  searchTerm?: string
}

export function SupplierTable({ 
  suppliers, 
  onEdit, 
  onDelete, 
  onView,
  searchTerm = ""
}: SupplierTableProps) {
  const [fetchedSuppliers, setFetchedSuppliers] = useState<Supplier[] | null>(null)
  const [productCounts, setProductCounts] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch suppliers if not provided
  useEffect(() => {
    let active = true
    if (suppliers !== undefined) {
      setFetchedSuppliers(null)
      setLoading(false)
      setError(null)
      return
    }

    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await apiFetch('/suppliers/')
        if (!active) return
        if (!res.ok) {
          const text = await res.text()
          throw new Error(`Failed to fetch suppliers: ${res.status} ${text}`)
        }
        const data = await res.json()
        if (!active) return
        
        const mapped: Supplier[] = Array.isArray(data)
          ? data.map((s: any) => ({
              id: Number(s.id ?? 0),
              name: s.name ?? "",
              email: s.email ?? "",
              phone: s.phone ?? "",
              address: s.address ?? "",
            }))
          : []
        setFetchedSuppliers(mapped)
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
  }, [suppliers])

  // Fetch product counts for each supplier
  useEffect(() => {
    const sourceSuppliers = suppliers ?? fetchedSuppliers ?? []
    if (sourceSuppliers.length === 0) return

    ;(async () => {
      try {
        const res = await apiFetch('/products/')
        if (!res.ok) return
        const products = await res.json()
        
        const counts: Record<number, number> = {}
        sourceSuppliers.forEach(sup => {
          counts[sup.id] = Array.isArray(products) 
            ? products.filter((p: any) => 
                (p.supplier?.name === sup.name || p.supplier === sup.name)
              ).length 
            : 0
        })
        setProductCounts(counts)
      } catch (err) {
        console.error('Error fetching product counts:', err)
      }
    })()
  }, [suppliers, fetchedSuppliers])

  const sourceSuppliers = suppliers ?? fetchedSuppliers ?? []
  
  // Filter suppliers based on search term
  const filteredSuppliers = sourceSuppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (supplier.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (supplier.phone || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (supplier.address || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const columns: TableColumn[] = [
    {
      key: 'name',
      label: 'Supplier Name',
      className: 'font-medium',
    },
    {
      key: 'contact',
      label: 'Contact Information',
      render: (_, supplier) => (
        <div className="space-y-1">
          {supplier.email && (
            <div className="flex items-center space-x-2 text-sm">
              <Mail className="h-3 w-3 text-muted-foreground" />
              <span>{supplier.email}</span>
            </div>
          )}
          {supplier.phone && (
            <div className="flex items-center space-x-2 text-sm">
              <Phone className="h-3 w-3 text-muted-foreground" />
              <span>{supplier.phone}</span>
            </div>
          )}
          {!supplier.email && !supplier.phone && (
            <span className="text-sm text-muted-foreground">—</span>
          )}
        </div>
      )
    },
    {
      key: 'address',
      label: 'Address',
      className: 'text-sm text-muted-foreground max-w-[200px]',
      render: (_, supplier) => (
        <div className="flex items-start space-x-2">
          {supplier.address ? (
            <>
              <MapPin className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
              <span className="truncate">{supplier.address}</span>
            </>
          ) : (
            <span>—</span>
          )}
        </div>
      )
    },
    {
      key: 'productCount',
      label: 'Products Supplied',
      render: (_, supplier) => (
        <div className="flex items-center space-x-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span>{productCounts[supplier.id] || 0} items</span>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (_, supplier) => {
        const count = productCounts[supplier.id] || 0
        return (
          <Badge variant={count > 0 ? "default" : "secondary"}>
            {count > 0 ? "Active" : "Inactive"}
          </Badge>
        )
      }
    }
  ]

  const actions: TableAction[] = [
    {
      icon: <Eye className="h-4 w-4" />,
      label: 'View',
      onClick: (supplier) => onView?.(supplier),
    },
    {
      icon: <Edit className="h-4 w-4" />,
      label: 'Edit',
      onClick: (supplier) => onEdit?.(supplier),
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
      data={filteredSuppliers}
      columns={columns}
      actions={actions}
      loading={loading}
      error={error}
      emptyMessage="No suppliers found"
      onDelete={handleDelete}
      getItemId={(item) => String(item.id)}
      getItemName={(item) => item.name}
    />
  )
}