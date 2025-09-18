export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'

// Global token expiry handler - will be set by AuthProvider
let tokenExpiryHandler: (() => void) | null = null

export function setTokenExpiryHandler(handler: () => void) {
  tokenExpiryHandler = handler
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
  const headers: Record<string, string> = { ...(options.headers as Record<string, string> || {}) }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  // If the caller provided a body, don't overwrite Content-Type when the body is a FormData
  // The browser will set the correct multipart/form-data boundary header for FormData
  const body = (options as any).body
  if (!headers['Content-Type'] && body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  
  // Handle token expiration
  if (res.status === 401 && tokenExpiryHandler) {
    tokenExpiryHandler()
  }
  
  return res
}

// Types for restock functionality
export interface Product {
  id: number
  name: string
  sku: string | null
  category_id: number | null
  description: string | null
  price: number
  quantity: number
  low_stock_threshold: number
  supplier_id: number | null
  user_id: number | null
  last_updated: string | null
  supplier: Supplier | null
  category: ProductCategory | null
}

export interface Supplier {
  id: number
  name: string
  email: string | null
  phone: string | null
  address: string | null
  user_id: number | null
}

export interface ProductCategory {
  id: number
  name: string
  description: string | null
  user_id: number | null
}

export interface PurchaseOrder {
  id: number
  user_id: number
  supplier_id: number | null
  product_id: number
  quantity_ordered: number
  status: string
  order_date: string | null
  notes: string | null
  supplier: Supplier | null
  product: Product | null
}

export interface PurchaseOrderCreate {
  supplier_id?: number | null
  product_id: number
  quantity_ordered: number
  status?: string
  notes?: string | null
}

export interface RestockSummary {
  pending_orders: number
  low_stock_items: number
  out_of_stock_items: number
  total_pending_value: number
}

// Restock API functions
export async function getLowStockProducts(): Promise<Product[]> {
  const res = await apiFetch('/restock/low-stock')
  if (!res.ok) {
    throw new Error('Failed to fetch low stock products')
  }
  return res.json()
}

export async function getOutOfStockProducts(): Promise<Product[]> {
  const res = await apiFetch('/restock/out-of-stock')
  if (!res.ok) {
    throw new Error('Failed to fetch out of stock products')
  }
  return res.json()
}

export async function getRestockSummary(): Promise<RestockSummary> {
  const res = await apiFetch('/restock/summary')
  if (!res.ok) {
    throw new Error('Failed to fetch restock summary')
  }
  return res.json()
}

export async function createPurchaseOrder(order: PurchaseOrderCreate): Promise<PurchaseOrder> {
  const res = await apiFetch('/restock/orders', {
    method: 'POST',
    body: JSON.stringify(order),
  })
  if (!res.ok) {
    throw new Error('Failed to create purchase order')
  }
  return res.json()
}

export async function getPurchaseOrders(status?: string): Promise<PurchaseOrder[]> {
  const params = status ? `?status=${encodeURIComponent(status)}` : ''
  const res = await apiFetch(`/restock/orders${params}`)
  if (!res.ok) {
    throw new Error('Failed to fetch purchase orders')
  }
  return res.json()
}

export async function getPurchaseOrder(id: number): Promise<PurchaseOrder> {
  const res = await apiFetch(`/restock/orders/${id}`)
  if (!res.ok) {
    throw new Error('Failed to fetch purchase order')
  }
  return res.json()
}

export async function updatePurchaseOrder(id: number, updates: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
  const res = await apiFetch(`/restock/orders/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  })
  if (!res.ok) {
    throw new Error('Failed to update purchase order')
  }
  return res.json()
}

export async function deletePurchaseOrder(id: number): Promise<{ ok: boolean }> {
  const res = await apiFetch(`/restock/orders/${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    throw new Error('Failed to delete purchase order')
  }
  return res.json()
}

// Products API functions
export async function getProducts(): Promise<Product[]> {
  const res = await apiFetch('/products')
  if (!res.ok) {
    throw new Error('Failed to fetch products')
  }
  return res.json()
}

export async function getSuppliers(): Promise<Supplier[]> {
  const res = await apiFetch('/suppliers')
  if (!res.ok) {
    throw new Error('Failed to fetch suppliers')
  }
  return res.json()
}
