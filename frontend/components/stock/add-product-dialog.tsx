"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { apiFetch } from '@/lib/api'
import { Upload } from "lucide-react"
import { useAppToast } from '@/lib/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Product } from "./stock-management"

interface AddProductDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (product: Omit<Product, "id" | "lastUpdated">) => void
  suppliers?: string[]
  categories?: string[]
  onRefresh?: () => void
}

export function AddProductDialog({ open, onOpenChange, onAdd, suppliers: propSuppliers, categories: propCategories, onRefresh }: AddProductDialogProps) {
  const { push: pushToast } = useAppToast()
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    category: "",
    description: "",
    quantity: "",
    price: "",
    lowStockThreshold: "",
    supplierId: "",
  })
  // store full objects so we can map to ids
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([])
  const [suppliers, setSuppliers] = useState<{ id: number; name: string }[]>([])
  const [isUploadingProducts, setIsUploadingProducts] = useState(false)

  useEffect(() => {
    let active = true

    // If parent passed categories, prefer them
    if (propCategories && propCategories.length) {
      setCategories(propCategories.map((c) => ({ id: 0, name: c })))
    } else {
      ;(async () => {
        try {
          const res = await apiFetch('/categories/')
          if (!res.ok) throw new Error(`Failed to fetch categories: ${res.status}`)
          const data = await res.json()
          if (!active) return
          // Expecting array of objects with id & name OR plain strings
          const list = Array.isArray(data)
            ? data.map((c: any) =>
                typeof c === "string"
                  ? { id: 0, name: c }
                  : { id: c.id ?? 0, name: c.name ?? String(c) },
              )
            : []
          if (active) setCategories(list)
        } catch (err) {
          console.error("Error fetching categories", err)
          if (active) setCategories([])
        }
      })()
    }

    if (propSuppliers && propSuppliers.length) {
      setSuppliers(propSuppliers.map((s) => ({ id: 0, name: s })))
    } else {
      ;(async () => {
        try {
          const res = await apiFetch('/suppliers/')
          if (!res.ok) throw new Error(`Failed to fetch suppliers: ${res.status}`)
          const data = await res.json()
          if (!active) return
          const list = Array.isArray(data)
            ? data.map((s: any) => (typeof s === "string" ? { id: 0, name: s } : { id: s.id ?? 0, name: s.name ?? String(s) }))
            : []
          if (active) setSuppliers(list)
        } catch (err) {
          console.error("Error fetching suppliers", err)
          if (active) setSuppliers([])
        }
      })()
    }

    return () => {
      active = false
    }
  }, [propCategories, propSuppliers])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    let supplier_id: number | null = null
    if (formData.supplierId) {
      const asNum = Number(formData.supplierId)
      if (Number.isInteger(asNum) && asNum > 0) {
        supplier_id = asNum
      } else {
        const foundByIdString = suppliers.find((s) => String(s.id) === String(formData.supplierId))
        if (foundByIdString && foundByIdString.id && foundByIdString.id > 0) {
          supplier_id = foundByIdString.id
        } else {
          const foundByName = suppliers.find((s) => s.name === formData.supplierId)
          if (foundByName && foundByName.id && foundByName.id > 0) supplier_id = foundByName.id
        }
      }
    }

    let category_id: number | null = null
    if (formData.category) {
      const asNum = Number(formData.category)
      if (Number.isInteger(asNum) && asNum > 0) {
        category_id = asNum
      } else {
        const foundByIdString = categories.find((c) => String(c.id) === String(formData.category))
        if (foundByIdString && foundByIdString.id && foundByIdString.id > 0) {
          category_id = foundByIdString.id
        } else {
          const foundByName = categories.find((c) => c.name === formData.category)
          if (foundByName && foundByName.id && foundByName.id > 0) category_id = foundByName.id
        }
      }
    }

    if (!supplier_id && formData.supplierId) {
      try {
        const res = await apiFetch('/suppliers/')
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data)) {
            const found = data.find((s: any) => (s.name ?? String(s)).toString() === formData.supplierId)
            if (found && found.id) supplier_id = Number(found.id)
          }
        }
      } catch (e) {
        // Could not resolve supplier id by name
      }
    }

    if (!category_id && formData.category) {
      try {
        const res = await apiFetch('/categories/')
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data)) {
            const found = data.find((c: any) => (c.name ?? String(c)).toString() === formData.category)
            if (found && found.id) category_id = Number(found.id)
          }
        }
      } catch (e) {
        // Could not resolve category id by name
      }
    }

    const payload = {
      name: formData.name,
      sku: formData.sku || undefined,
      category_id: category_id ?? undefined,
      description: formData.description || undefined,
      price: Number.parseFloat(formData.price) || 0,
      quantity: Number.parseInt(formData.quantity) || 0,
      low_stock_threshold: Number.parseInt(formData.lowStockThreshold) || 0,
      supplier_id: supplier_id,
    }

    try {
      const res = await apiFetch('/products/', {
        method: "POST",
        // apiFetch will set Content-Type when body is present
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        console.error("Failed to create product", err)
        // still close dialog but do not add locally
        onOpenChange(false)
        return
      }

      const created = await res.json()
      // find supplier & category names for local UI shape
      // Determine supplier & category names for local UI shape.
      // Prefer the backend's returned nested object or value, then our resolved id lookups,
      // and finally fall back to the user's original form input (so UI shows what the user selected).
      const supplierName =
        (created.supplier && (created.supplier.name ?? String(created.supplier))) ||
        (supplier_id ? suppliers.find((s) => s.id === supplier_id)?.name ?? "" : formData.supplierId || "")
      const categoryName =
        (created.category && (created.category.name ?? String(created.category))) ||
        (category_id ? categories.find((c) => c.id === category_id)?.name ?? "" : formData.category || "")

      // call parent onAdd with the product data in the shape it expects
      onAdd({
        name: created.name ?? payload.name,
        sku: created.sku ?? payload.sku ?? "",
        category: categoryName || "",
        description: created.description ?? payload.description ?? "",
        quantity: created.quantity ?? payload.quantity,
        price: created.price ?? payload.price,
        lowStockThreshold: created.low_stock_threshold ?? payload.low_stock_threshold,
        supplier: supplierName || "",
      })

      // Reset form
      setFormData({
        name: "",
        sku: "",
        category: "",
        description: "",
        quantity: "",
        price: "",
        lowStockThreshold: "",
        supplierId: "",
      })

      onOpenChange(false)
    } catch (err) {
      console.error("Error creating product", err)
      onOpenChange(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // supplier/category creation moved to parent dashboard

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]" style={{ backgroundColor: 'var(--ui-card-bg)' }}>
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
          <DialogDescription>
            Add a new product to your inventory. Fill in all the required information.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="sku" className="text-right">
                SKU
              </Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => handleChange("sku", e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category" className="text-right">
                Category
              </Label>
              <Select value={formData.category} onValueChange={(value) => handleChange("category", value)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c, idx) => {
                    const useId = Boolean(c.id && c.id > 0)
                    const baseKey = useId ? `cat-${c.id}` : `cat-${c.name}`
                    const key = `${baseKey}-${idx}`
                    const value = useId ? String(c.id) : c.name
                    return (
                      <SelectItem key={key} value={value}>
                        {c.name}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                className="col-span-3"
                placeholder="Optional description"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quantity" className="text-right">
                Quantity
              </Label>
              <Input
                id="quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) => handleChange("quantity", e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="price" className="text-right">
                Price
              </Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => handleChange("price", e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="threshold" className="text-right">
                Low Stock
              </Label>
              <Input
                id="threshold"
                type="number"
                value={formData.lowStockThreshold}
                onChange={(e) => handleChange("lowStockThreshold", e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="supplier" className="text-right">
                Supplier
              </Label>
              <Select value={formData.supplierId} onValueChange={(value) => handleChange("supplierId", value)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier, idx) => {
                    const useId = Boolean(supplier.id && supplier.id > 0)
                    const baseKey = useId ? `supplier-${supplier.id}` : `supplier-${supplier.name}`
                    const key = `${baseKey}-${idx}`
                    const value = useId ? String(supplier.id) : supplier.name
                    return (
                      <SelectItem key={key} value={value}>
                        {supplier.name}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
            {/* supplier/category creation moved to dashboard */}
          </div>
          <div className="pt-2 mb-6">
            <h3 className="text-sm font-medium">Bulk import</h3>
            <p className="text-xs text-muted-foreground mb-2">Import multiple products via CSV (headers: name, sku, category_id, description, price, quantity, low_stock_threshold, supplier_id)</p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  const input = document.createElement('input')
                  input.type = 'file'
                  input.accept = '.csv'
                  input.onchange = async (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0]
                    if (!file) return
                    
                    setIsUploadingProducts(true)
                    try {
                      const formData = new FormData()
                      formData.append('file', file)
                      
                      const res = await apiFetch('/products/upload', {
                        method: 'POST',
                        body: formData
                      })
                      
                      if (res.ok) {
                        const result = await res.json()
                        pushToast({
                          title: "Success",
                          description: `Successfully uploaded products!`,
                          variant: "success"
                        })
                        
                        // Close dialog and refresh data
                        onOpenChange(false)
                        if (onRefresh) {
                          onRefresh()
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
                      console.error('Error uploading products:', err)
                      pushToast({
                        title: "Error",
                        description: "Failed to upload products",
                        variant: "error"
                      })
                    } finally {
                      setIsUploadingProducts(false)
                    }
                  }
                  input.click()
                }}
                disabled={isUploadingProducts}
              >
                <Upload className="h-4 w-4 mr-2" />
                {isUploadingProducts ? 'Uploading...' : 'Import CSV'}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">Add Product</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
