"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProductTable } from "./product-table"
import { CategoryTable } from "./category-table"
import { SupplierTable } from "./supplier-table"
import { AddProductDialog } from "./add-product-dialog"
import { EditProductDialog } from "./edit-product-dialog"
import { SupplierForm, CategoryForm } from "./forms"
import { Plus, Search, Package, AlertTriangle, DollarSign, Eye, Edit, Trash2, Users, Tag, Upload } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { apiFetch } from '@/lib/api'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useAppToast } from '@/lib/use-toast'

export interface Product {
  id: string
  name: string
  sku: string
  category: string
  description: string
  quantity: number
  price: number
  lowStockThreshold: number
  supplier: string
  lastUpdated: string
  // Optional server-provided status/warning fields
  statusLabel?: string
  statusVariant?: string
  isLowStockFlag?: boolean
}

export function StockManagement() {
  const { push: pushToast } = useAppToast()
  const [products, setProducts] = useState<Product[] | undefined>(undefined)
  const [categories, setCategories] = useState<string[]>([])
  const [suppliers, setSuppliers] = useState<string[]>([])
  const [fullCategories, setFullCategories] = useState<{ id: number; name: string; description?: string }[]>([])
  const [fullSuppliers, setFullSuppliers] = useState<{ id: number; name: string; email?: string; phone?: string; address?: string }[]>([])
  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'suppliers'>('products')
  const [editingCategory, setEditingCategory] = useState<any | null>(null)
  const [editingSupplier, setEditingSupplier] = useState<any | null>(null)
  const [confirmDeleteCategory, setConfirmDeleteCategory] = useState<{ id: number; name?: string } | null>(null)
  const [confirmDeleteSupplier, setConfirmDeleteSupplier] = useState<{ id: number; name?: string } | null>(null)
  const [confirmCategoryError, setConfirmCategoryError] = useState<string | null>(null)
  const [confirmSupplierError, setConfirmSupplierError] = useState<string | null>(null)
  const [viewCategory, setViewCategory] = useState<any | null>(null)
  const [viewSupplier, setViewSupplier] = useState<any | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false)
  const [isCreateCategoryOpen, setIsCreateCategoryOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  // Fetch suppliers and categories from backend on mount
  // Extracted data loader so we can call it after edits to refresh the table
  async function loadData() {
    try {
      const [prodsRes, catsRes, supsRes] = await Promise.all([
        apiFetch('/products/'),
        apiFetch('/categories/'),
        apiFetch('/suppliers/'),
      ])
      // Basic parse for categories and suppliers (no longer need lookup indirection)
      const catsData = catsRes.ok ? await catsRes.json().catch(() => []) : []
      const supsData = supsRes.ok ? await supsRes.json().catch(() => []) : []

      if (prodsRes.ok) {
        const prodsData = await prodsRes.json()
        const mapped = Array.isArray(prodsData)
          ? prodsData.map((p: any) => ({
              id: String(p.id ?? ""),
              name: p.name ?? "",
              sku: p.sku ?? "",
              category: p.category?.name ?? (typeof p.category === 'string' ? p.category : '') ?? '',
              description: p.description ?? "",
              quantity: Number(p.quantity ?? 0),
              price: Number(p.price ?? 0),
              lowStockThreshold: Number(p.low_stock_threshold ?? p.lowStockThreshold ?? 0),
              statusLabel: p.status ?? p.quantity_warning_label ?? undefined,
              statusVariant: p.quantity_warning_variant ?? undefined,
              isLowStockFlag: typeof p.is_low_stock === 'boolean' ? p.is_low_stock : undefined,
              supplier: p.supplier?.name ?? (typeof p.supplier === 'string' ? p.supplier : '') ?? '',
              lastUpdated: p.last_updated ?? p.lastUpdated ?? "",
            }))
          : []
      // always set products to the mapped array (may be empty) so child knows parent loaded
      setProducts(mapped)
      }

      // Use the already-parsed catsData and supsData to populate names lists and full objects
      const categoryNames = Array.isArray(catsData) ? catsData.map((c: any) => (typeof c === "string" ? c : c.name ?? String(c))) : []
      if (categoryNames.length) setCategories(categoryNames)
      const catObjects = Array.isArray(catsData) ? catsData.map((c: any) => (typeof c === 'string' ? { id: 0, name: c } : { id: c.id ?? 0, name: c.name ?? String(c), description: c.description })) : []
      setFullCategories(catObjects)

      const supplierNames = Array.isArray(supsData) ? supsData.map((s: any) => (typeof s === "string" ? s : s.name ?? String(s))) : []
      if (supplierNames.length) setSuppliers(supplierNames)
      const supObjects = Array.isArray(supsData) ? supsData.map((s: any) => (typeof s === 'string' ? { id: 0, name: s } : { id: s.id ?? 0, name: s.name ?? String(s), email: s.email, phone: s.phone, address: s.address })) : []
      setFullSuppliers(supObjects)
    } catch (err) {
      console.error("Error fetching products, categories or suppliers", err)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  async function refreshCategoriesAndSuppliers() {
    try {
      const cats = await apiFetch('/categories/')
      const sups = await apiFetch('/suppliers/')
      const catObjects = Array.isArray(cats) ? cats.map((c: any) => ({ id: c.id ?? 0, name: c.name ?? String(c), description: c.description })) : []
      const supObjects = Array.isArray(sups) ? sups.map((s: any) => ({ id: s.id ?? 0, name: s.name ?? String(s), email: s.email, phone: s.phone, address: s.address })) : []
      setFullCategories(catObjects)
      setFullSuppliers(supObjects)
    } catch (err) {
      console.error('Error refreshing categories/suppliers', err)
    }
  }

  const outOfStockCount = (products ?? []).filter((product) => {
    const qty = Number(product.quantity ?? 0)
    const th = Number(product.lowStockThreshold ?? 0)
    if (!th || th <= 0) {
      return qty === 0
    }
    return qty <= th
  }).length

  const lowStockCountUsingLogic = (products ?? []).filter((product) => {
    const qty = Number(product.quantity ?? 0)
    const th = Number(product.lowStockThreshold ?? 0)
    const margin = Math.ceil(product.lowStockThreshold * 0.2)
    if (!th || th <= 0) return false
    return qty > 0 && (Math.abs(th - qty) <= margin)
  }).length

  const totalProducts = (products ?? []).length
  const totalValue = (products ?? []).reduce((sum, product) => sum + product.quantity * product.price, 0)

  const handleAddProduct = async (newProduct: Omit<Product, "id" | "lastUpdated">) => {
    const tempId = Date.now().toString()
    const optimistic: Product = {
      ...newProduct,
      id: tempId,
      category: newProduct.category || '',
      lastUpdated: new Date().toISOString().split('T')[0],
    }
    setProducts((prev) => ([...(prev ?? []), optimistic]))
    pushToast({ title: 'Success', description: `Product "${newProduct.name}" added successfully`, variant: 'success' })
    // Reload authoritative list (will include nested objects)
    void loadData()
  }

  // Persist a new supplier to the backend
  const handleAddSupplier = async (supplier: { name: string; email?: string; phone?: string; address?: string }) => {
    try {
      const res = await apiFetch('/suppliers/', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: supplier.name, email: supplier.email, phone: supplier.phone, address: supplier.address }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        console.error("Failed to create supplier", err)
        const message = err?.detail || err?.message || JSON.stringify(err) || `Failed to create supplier (status ${res.status})`
        pushToast({
          title: "Error",
          description: `Failed to create supplier: ${message}`,
          variant: "error"
        })
        return
      }
      const created = await res.json()
      console.log("Supplier created", created)
      pushToast({
        title: "Success",
        description: `Supplier "${supplier.name}" created successfully`,
        variant: "success"
      })
    } catch (err) {
      console.error("Error creating supplier", err)
      pushToast({
        title: "Error",
        description: `Error creating supplier: ${String(err ?? 'Unknown error')}`,
        variant: "error"
      })
    }
  }

  // Persist a new category to the backend
  const handleCreateCategory = async (category: { name: string; description?: string }) => {
    try {
      const res = await apiFetch('/categories/', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: category.name, description: category.description }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        console.error("Failed to create category", err)
        const message = err?.detail || err?.message || JSON.stringify(err) || `Failed to create category (status ${res.status})`
        pushToast({
          title: "Error",
          description: `Failed to create category: ${message}`,
          variant: "error"
        })
        return
      }
      const created = await res.json()
      console.log("Category created", created)
      pushToast({
        title: "Success",
        description: `Category "${category.name}" created successfully`,
        variant: "success"
      })
    } catch (err) {
      console.error("Error creating category", err)
      pushToast({
        title: "Error",
        description: `Error creating category: ${String(err ?? 'Unknown error')}`,
        variant: "error"
      })
    }
  }

  const handleEditProduct = (updatedProduct: Product) => {
    setProducts((prev) => (prev ? prev.map((p) => (p.id === updatedProduct.id ? { ...updatedProduct, lastUpdated: new Date().toISOString().split("T")[0] } : p)) : [updatedProduct]))
    setEditingProduct(null)
    pushToast({
      title: "Success",
      description: `Product "${updatedProduct.name}" updated successfully`,
      variant: "success"
    })
    // Refresh authoritative data from backend after an edit
    void loadData()
  }

  const handleDeleteProduct = (id: string) => {
    // open confirmation dialog and perform deletion on confirm
    setPendingDelete({ id, name: undefined })
    setConfirmOpen(true)
  }

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name?: string } | null>(null)
  const [confirmProductError, setConfirmProductError] = useState<string | null>(null)

  async function performDeleteProduct(id: string) {
    try {
      const url = `/products/${id}`
  // Request details: API base + path
      setConfirmProductError(null)
      const res = await apiFetch(url, { method: 'DELETE' })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        const message = text || 'Failed to delete product'
        console.error('Failed to delete product', { status: res.status, body: text })
        setConfirmProductError(message)
        throw new Error(message)
      }
      // Remove from local state after successful deletion
      setProducts((prev) => (prev ? prev.filter((p) => p.id !== id) : []))
      pushToast({
        title: "Success",
        description: "Product deleted successfully",
        variant: "success"
      })
    } catch (err: any) {
      console.error('Error deleting product', err)
      const message = err?.message ?? String(err ?? 'Error deleting product')
      setConfirmProductError(String(message))
      throw err
    }
  }

  // Handlers for supplier/category dialogs
  const handleSaveSupplier = async (s: { name: string; email?: string; phone?: string; address?: string }) => {
    try {
      const res = await apiFetch('/suppliers/', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: s.name, email: s.email, phone: s.phone, address: s.address }),
      })
      if (res.ok) {
        const created = await res.json().catch(() => null)
        if (created && created.name) {
          setSuppliers((prev) => (prev && prev.includes(created.name) ? prev : [...(prev ?? []), created.name]))
        }
        setIsAddSupplierOpen(false)
        pushToast({
          title: "Success",
          description: `Supplier "${s.name}" created successfully`,
          variant: "success"
        })
      } else {
        const err = await res.text().catch(() => '')
        console.error("Failed to create supplier", err)
        pushToast({
          title: "Error",
          description: `Failed to create supplier: ${err || `Status ${res.status}`}`,
          variant: "error"
        })
      }
    } catch (err) {
      console.error(err)
      pushToast({
        title: "Error",
        description: `Error creating supplier: ${String(err ?? 'Unknown error')}`,
        variant: "error"
      })
    }
  }

  const handleSaveCategory = async (c: { name: string; description?: string }) => {
    try {
      const res = await apiFetch('/categories/', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: c.name, description: c.description }),
      })
      if (res.ok) {
        const created = await res.json().catch(() => null)
        if (created && created.name) {
          setCategories((prev) => (prev && prev.includes(created.name) ? prev : [...(prev ?? []), created.name]))
        }
        setIsCreateCategoryOpen(false)
        pushToast({
          title: "Success",
          description: `Category "${c.name}" created successfully`,
          variant: "success"
        })
      } else {
        const err = await res.text().catch(() => '')
        console.error("Failed to create category", err)
        pushToast({
          title: "Error",
          description: `Failed to create category: ${err || `Status ${res.status}`}`,
          variant: "error"
        })
      }
    } catch (err) {
      console.error(err)
      pushToast({
        title: "Error",
        description: `Error creating category: ${String(err ?? 'Unknown error')}`,
        variant: "error"
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">Stock Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your inventory and track stock levels</p>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <Button onClick={() => setIsAddSupplierOpen(true)}>
            <Users className="h-4 w-4 mr-2" />
            <span>Add Suppliers</span>
          </Button>

          <Button onClick={() => setIsCreateCategoryOpen(true)}>
            <Tag className="h-4 w-4 mr-2" />
            <span>Add Categories</span>
          </Button>

          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            <span>Add Product</span>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center space-x-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
            <p className="text-xs text-muted-foreground">Active inventory items</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{outOfStockCount}</div>
            <p className="text-xs text-muted-foreground">Items below threshold</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-700">{lowStockCountUsingLogic}</div>
            <p className="text-xs text-muted-foreground">Items low in stock</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Current inventory value</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory</CardTitle>
          <CardDescription>Search and manage your product inventory</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products, SKU, categories, suppliers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'products' | 'categories' | 'suppliers')}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="products" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Products
              </TabsTrigger>
              <TabsTrigger value="categories" className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Categories
              </TabsTrigger>
              <TabsTrigger value="suppliers" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Suppliers
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="products" className="mt-6">
              <ProductTable 
                products={products} 
                onEdit={setEditingProduct} 
                onDelete={handleDeleteProduct} 
                categories={categories}
                searchTerm={searchTerm}
              />
            </TabsContent>
            
            <TabsContent value="categories" className="mt-6">
              <CategoryTable 
                categories={fullCategories}
                onEdit={setEditingCategory}
                onDelete={async (id, name) => {
                  setConfirmDeleteCategory({ id: Number(id), name })
                }}
                onView={setViewCategory}
                searchTerm={searchTerm}
              />
            </TabsContent>
            
            <TabsContent value="suppliers" className="mt-6">
              <SupplierTable 
                suppliers={fullSuppliers}
                onEdit={setEditingSupplier}
                onDelete={async (id, name) => {
                  setConfirmDeleteSupplier({ id: Number(id), name })
                }}
                onView={setViewSupplier}
                searchTerm={searchTerm}
              />
            </TabsContent>
          </Tabs>

          {/* Edit Category Modal */}
          {editingCategory && (
            <CategoryForm
              initial={editingCategory}
              open={true}
              onOpenChange={(open) => { if (!open) setEditingCategory(null) }}
              onSave={() => { /* not used for edit */ }}
              onCancel={() => setEditingCategory(null)}
              onUpdate={async (updated) => {
                setEditingCategory(null)
                await refreshCategoriesAndSuppliers()
                await loadData() // Refresh all data to update product categories
              }}
            />
          )}

          {/* Edit Supplier Modal */}
          {editingSupplier && (
            <SupplierForm
              initial={editingSupplier}
              open={true}
              onOpenChange={(open) => { if (!open) setEditingSupplier(null) }}
              onSave={() => { /* not used for edit */ }}
              onCancel={() => setEditingSupplier(null)}
              onUpdate={async (updated) => {
                setEditingSupplier(null)
                await refreshCategoriesAndSuppliers()
                await loadData() // Refresh all data to update product suppliers
              }}
            />
          )}

          {/* Confirm Delete Category */}
          {confirmDeleteCategory && (
            <ConfirmDialog
              open={true}
              onOpenChange={(open) => { if (!open) { setConfirmDeleteCategory(null); setConfirmCategoryError(null) } }}
              title={`Delete category "${confirmDeleteCategory.name ?? ''}"?`}
              description="This will remove the category permanently. Note: Categories that are currently used by products cannot be deleted."
              error={confirmCategoryError}
              onConfirm={async () => {
                try {
                  console.log('Attempting to delete category:', confirmDeleteCategory)
                  setConfirmCategoryError(null)
                  const res = await apiFetch(`/categories/${confirmDeleteCategory.id}`, { method: 'DELETE' })
                  console.log('Delete category response:', { status: res.status, ok: res.ok })
                  if (!res.ok) {
                    // Enhanced error parsing
                    let errorMessage = `Failed to delete category (status ${res.status})`
                    try {
                      const errorText = await res.text()
                      if (errorText) {
                        try {
                          const errorData = JSON.parse(errorText)
                          errorMessage = errorData?.detail || errorData?.message || errorText
                        } catch {
                          errorMessage = errorText
                        }
                      }
                    } catch {
                      // Keep default message if parsing fails
                    }
                    
                    // Make error message more user-friendly
                    if (errorMessage.toLowerCase().includes('foreign key') || 
                        errorMessage.toLowerCase().includes('constraint') ||
                        errorMessage.toLowerCase().includes('referenced') ||
                        errorMessage.toLowerCase().includes('used by')) {
                      errorMessage = `Cannot delete category "${confirmDeleteCategory.name}". This category is still being used by one or more products. Please remove or reassign those products first.`
                    } else if (res.status === 409) {
                      errorMessage = `Cannot delete category "${confirmDeleteCategory.name}". This category is still in use.`
                    }
                    
                    setConfirmCategoryError(errorMessage)
                    
                    // Also show error toast as fallback to ensure user sees the error
                    pushToast({
                      title: "Cannot Delete Category",
                      description: errorMessage,
                      variant: "error"
                    })
                    return
                  }
                  setConfirmDeleteCategory(null)
                  pushToast({
                    title: "Success",
                    description: `Category "${confirmDeleteCategory.name}" deleted successfully`,
                    variant: "success"
                  })
                  await refreshCategoriesAndSuppliers()
                } catch (err: any) {
                  const message = err?.message ?? String(err ?? 'Error deleting category')
                  console.error('Category deletion error:', err)
                  setConfirmCategoryError(`Error deleting category: ${message}`)
                }
              }}
            />
          )}

          {/* Confirm Delete Supplier */}
          {confirmDeleteSupplier && (
            <ConfirmDialog
              open={true}
              onOpenChange={(open) => { if (!open) { setConfirmDeleteSupplier(null); setConfirmSupplierError(null) } }}
              title={`Delete supplier "${confirmDeleteSupplier.name ?? ''}"?`}
              description="This will remove the supplier permanently. Note: Suppliers that are currently used by products cannot be deleted."
              error={confirmSupplierError}
              onConfirm={async () => {
                try {
                  console.log('Attempting to delete supplier:', confirmDeleteSupplier)
                  setConfirmSupplierError(null)
                  const res = await apiFetch(`/suppliers/${confirmDeleteSupplier.id}`, { method: 'DELETE' })
                  console.log('Delete supplier response:', { status: res.status, ok: res.ok })
                  if (!res.ok) {
                    // Enhanced error parsing
                    let errorMessage = `Failed to delete supplier (status ${res.status})`
                    try {
                      const errorText = await res.text()
                      if (errorText) {
                        try {
                          const errorData = JSON.parse(errorText)
                          errorMessage = errorData?.detail || errorData?.message || errorText
                        } catch {
                          errorMessage = errorText
                        }
                      }
                    } catch {
                      // Keep default message if parsing fails
                    }
                    
                    // Make error message more user-friendly
                    if (errorMessage.toLowerCase().includes('foreign key') || 
                        errorMessage.toLowerCase().includes('constraint') ||
                        errorMessage.toLowerCase().includes('referenced') ||
                        errorMessage.toLowerCase().includes('used by')) {
                      errorMessage = `Cannot delete supplier "${confirmDeleteSupplier.name}". This supplier is still being used by one or more products. Please remove or reassign those products first.`
                    } else if (res.status === 409) {
                      errorMessage = `Cannot delete supplier "${confirmDeleteSupplier.name}". This supplier is still in use.`
                    }
                    
                    console.error('Supplier deletion failed:', { status: res.status, message: errorMessage })
                    setConfirmSupplierError(errorMessage)
                    
                    // Also show error toast as fallback to ensure user sees the error
                    pushToast({
                      title: "Cannot Delete Supplier",
                      description: errorMessage,
                      variant: "error"
                    })
                    return
                  }
                  setConfirmDeleteSupplier(null)
                  pushToast({
                    title: "Success",
                    description: `Supplier "${confirmDeleteSupplier.name}" deleted successfully`,
                    variant: "success"
                  })
                  await refreshCategoriesAndSuppliers()
                } catch (err: any) {
                  const message = err?.message ?? String(err ?? 'Error deleting supplier')
                  console.error('Supplier deletion error:', err)
                  setConfirmSupplierError(`Error deleting supplier: ${message}`)
                }
              }}
            />
          )}

          {/* View Category Dialog */}
          {viewCategory && (
            <Dialog open={true} onOpenChange={(open) => { if (!open) setViewCategory(null) }}>
              <DialogContent className="sm:max-w-[520px]">
                  <DialogHeader className="sr-only">
                    <DialogTitle>{viewCategory.name}</DialogTitle>
                    <DialogDescription>{viewCategory.description}</DialogDescription>
                  </DialogHeader>
                  <Card>
                    <CardHeader>
                      <CardTitle>{viewCategory.name}</CardTitle>
                      <CardDescription>{viewCategory.description}</CardDescription>
                    </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">Name</div>
                      <div className="font-medium">{viewCategory.name}</div>
                      <div className="text-sm text-muted-foreground">Description</div>
                      <div className="text-sm">{viewCategory.description ?? '—'}</div>
                    </div>
                  </CardContent>
                </Card>
              </DialogContent>
            </Dialog>
          )}

          {/* View Supplier Dialog */}
          {viewSupplier && (
            <Dialog open={true} onOpenChange={(open) => { if (!open) setViewSupplier(null) }}>
              <DialogContent className="sm:max-w-[520px]">
                {/* keep title/description for screen readers but hide visually */}
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
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AddProductDialog 
        open={isAddDialogOpen} 
        onOpenChange={setIsAddDialogOpen} 
        onAdd={handleAddProduct} 
        suppliers={suppliers} 
        categories={categories}
        onRefresh={loadData}
      />

      {/* Controlled dialogs for supplier and category (use Dialog UI from forms) */}
      <SupplierForm
        open={isAddSupplierOpen}
        onOpenChange={setIsAddSupplierOpen}
        onCancel={() => setIsAddSupplierOpen(false)}
        onSave={(s) => handleSaveSupplier(s)}
        suppliers={suppliers}
        onUpdate={async () => {
          await refreshCategoriesAndSuppliers()
          await loadData() // Refresh all data to update product suppliers
        }}
      />

      <CategoryForm
        open={isCreateCategoryOpen}
        onOpenChange={setIsCreateCategoryOpen}
        onCancel={() => setIsCreateCategoryOpen(false)}
        onSave={(c) => handleSaveCategory(c)}
        categories={categories}
        onUpdate={async () => {
          await refreshCategoriesAndSuppliers()
          await loadData() // Refresh all data to update product categories
        }}
      />

      {editingProduct && (
        <EditProductDialog
          open={!!editingProduct}
          onOpenChange={() => setEditingProduct(null)}
          product={editingProduct}
          onEdit={handleEditProduct}
        />
      )}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(v) => {
          setConfirmOpen(v)
          if (!v) { setPendingDelete(null); setConfirmProductError(null) }
        }}
        title="Delete product"
        description={pendingDelete && pendingDelete.name ? `Delete '${pendingDelete.name}'? This action cannot be undone.` : "Are you sure you want to delete this product? This action cannot be undone."}
        error={confirmProductError}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={async () => {
          if (!pendingDelete) return
          await performDeleteProduct(pendingDelete.id)
        }}
      />
    </div>
  )
}
