"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { apiFetch } from '@/lib/api'
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

interface EditProductDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: Product
  onEdit: (product: Product) => void
}


export function EditProductDialog({ open, onOpenChange, product, onEdit }: EditProductDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    category: "",
    quantity: "",
    price: "",
    lowStockThreshold: "",
    supplier: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([])
  const [suppliers, setSuppliers] = useState<{ id: number; name: string }[]>([])

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        sku: product.sku,
        category: product.category,
        quantity: product.quantity.toString(),
        price: product.price.toString(),
        lowStockThreshold: product.lowStockThreshold.toString(),
        supplier: product.supplier,
      })
    }
  }, [product])

  // Fetch categories and suppliers like AddProductDialog so we can present proper options and resolve ids
  useEffect(() => {
    let active = true

    ;(async () => {
      try {
        const [catsRes, supsRes] = await Promise.all([apiFetch('/categories/'), apiFetch('/suppliers/')])
        const catsData = catsRes.ok ? await catsRes.json().catch(() => []) : []
        const supsData = supsRes.ok ? await supsRes.json().catch(() => []) : []

  if (!active) return

        const catList = Array.isArray(catsData)
          ? catsData.map((c: any) => (typeof c === 'string' ? { id: 0, name: c } : { id: c.id ?? 0, name: c.name ?? String(c) }))
          : []
        const supList = Array.isArray(supsData)
          ? supsData.map((s: any) => (typeof s === 'string' ? { id: 0, name: s } : { id: s.id ?? 0, name: s.name ?? String(s) }))
          : []

  if (active) setCategories(catList)
  if (active) setSuppliers(supList)
      } catch (err) {
        console.error('Error fetching categories or suppliers', err)
      }
    })()

    return () => {
      active = false
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!product || !product.id) return

    setIsSubmitting(true)

    const payload: any = {
      name: formData.name,
      sku: formData.sku || undefined,
      category_id: undefined,
      description: undefined,
      price: Number.parseFloat(formData.price) || 0,
      quantity: Number.parseInt(formData.quantity) || 0,
      low_stock_threshold: Number.parseInt(formData.lowStockThreshold) || 0,
      supplier_id: undefined,
    }

    // try to parse supplier id if provided as an id string
    const asSupplierId = Number(formData.supplier)
    if (Number.isInteger(asSupplierId) && asSupplierId > 0) payload.supplier_id = asSupplierId

    // if supplier wasn't numeric, try to resolve from fetched suppliers list by id or name
    if (!payload.supplier_id && formData.supplier) {
      // check local list first
      const foundLocal = suppliers.find((s) => String(s.id) === String(formData.supplier) || s.name === formData.supplier)
      if (foundLocal && foundLocal.id && foundLocal.id > 0) {
        payload.supplier_id = foundLocal.id
      } else {
        // fallback: query server for suppliers and try to resolve by name
        try {
          const res = await apiFetch('/suppliers/')
          if (res.ok) {
            const data = await res.json()
            if (Array.isArray(data)) {
              const found = data.find((s: any) => (s.name ?? String(s)).toString() === formData.supplier)
              if (found && found.id) payload.supplier_id = Number(found.id)
            }
          }
        } catch (e) {
          // ignore resolution errors
        }
      }
    }

    const asCategoryId = Number(formData.category)
    if (Number.isInteger(asCategoryId) && asCategoryId > 0) payload.category_id = asCategoryId

    // if category wasn't numeric, try to resolve from fetched categories list by id or name
    if (!payload.category_id && formData.category) {
      const foundLocalCat = categories.find((c) => String(c.id) === String(formData.category) || c.name === formData.category)
      if (foundLocalCat && foundLocalCat.id && foundLocalCat.id > 0) {
        payload.category_id = foundLocalCat.id
      } else {
        try {
          const res = await apiFetch('/categories/')
          if (res.ok) {
            const data = await res.json()
            if (Array.isArray(data)) {
              const found = data.find((c: any) => (c.name ?? String(c)).toString() === formData.category)
              if (found && found.id) payload.category_id = Number(found.id)
            }
          }
        } catch (e) {
          // ignore
        }
      }
    }

    try {
      const res = await apiFetch(`/products/${product.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        console.error("Failed to update product", errBody)
        alert(`Failed to save changes: ${res.status}`)
        setIsSubmitting(false)
        return
      }

      const updated = await res.json()

      // Resolve supplier & category display names similar to add flow
      const supplierName = (updated.supplier && (updated.supplier.name ?? String(updated.supplier))) || formData.supplier || product.supplier || ""
      const categoryName = (updated.category && (updated.category.name ?? String(updated.category))) || formData.category || product.category || ""

      const updatedProduct: Product = {
        ...product,
        id: updated.id ?? product.id,
        name: updated.name ?? formData.name,
        sku: updated.sku ?? formData.sku ?? "",
        category: categoryName,
        description: updated.description ?? product.description ?? "",
  quantity: (updated.quantity ?? Number.parseInt(formData.quantity)) || 0,
  price: (updated.price ?? Number.parseFloat(formData.price)) || 0,
  lowStockThreshold: (updated.low_stock_threshold ?? Number.parseInt(formData.lowStockThreshold)) || 0,
        supplier: supplierName,
        lastUpdated: (updated.last_updated as string) ?? (updated.updated_at as string) ?? product.lastUpdated,
      }

      onEdit(updatedProduct)
      setIsSubmitting(false)
      onOpenChange(false)
    } catch (err) {
      console.error("Error updating product", err)
      alert("An error occurred saving the product. Please try again.")
      setIsSubmitting(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]" style={{ backgroundColor: 'var(--ui-card-bg)' }}>
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
          <DialogDescription>Update the product information. Changes will be saved immediately.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                Name
              </Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-sku" className="text-right">
                SKU
              </Label>
              <Input
                id="edit-sku"
                value={formData.sku}
                onChange={(e) => handleChange("sku", e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-category" className="text-right">
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
              <Label htmlFor="edit-quantity" className="text-right">
                Quantity
              </Label>
              <Input
                id="edit-quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) => handleChange("quantity", e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-price" className="text-right">
                Price
              </Label>
              <Input
                id="edit-price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => handleChange("price", e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-threshold" className="text-right">
                Low Stock
              </Label>
              <Input
                id="edit-threshold"
                type="number"
                value={formData.lowStockThreshold}
                onChange={(e) => handleChange("lowStockThreshold", e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-supplier" className="text-right">
                Supplier
              </Label>
              <Select value={formData.supplier} onValueChange={(value) => handleChange("supplier", value)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s, idx) => {
                    const useId = Boolean(s.id && s.id > 0)
                    const baseKey = useId ? `sup-${s.id}` : `sup-${s.name}`
                    const key = `${baseKey}-${idx}`
                    const value = useId ? String(s.id) : s.name
                    return (
                      <SelectItem key={key} value={value}>
                        {s.name}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Changes'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
