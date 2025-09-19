export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'

// ========================================
// ORIGINAL BACKEND INTEGRATION (COMMENTED OUT)
// ========================================
// Uncomment the functions below and comment out the mock functions to re-enable backend integration

/*
export async function apiFetch(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = { ...(options.headers as Record<string, string> || {}) }
  
  // If the caller provided a body, don't overwrite Content-Type when the body is a FormData
  // The browser will set the correct multipart/form-data boundary header for FormData
  const body = (options as any).body
  if (!headers['Content-Type'] && body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  
  return res
}

// Original Restock API functions
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

// Original Products API functions
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
*/

// ========================================
// MOCK DATA & FUNCTIONS (CURRENTLY ACTIVE)
// ========================================
// Comment out the functions below and uncomment the backend integration above to use real API

// Mock data for clothing company
const mockCategories: ProductCategory[] = [
  { id: 1, name: "T-Shirts", description: "Basic and graphic t-shirts", user_id: 1 },
  { id: 2, name: "Jeans", description: "Denim jeans and pants", user_id: 1 },
  { id: 3, name: "Hoodies", description: "Hooded sweatshirts and pullovers", user_id: 1 },
  { id: 4, name: "Dresses", description: "Casual and formal dresses", user_id: 1 },
  { id: 5, name: "Jackets", description: "Outerwear and jackets", user_id: 1 },
  { id: 6, name: "Accessories", description: "Belts, hats, and other accessories", user_id: 1 }
]

// Generate clothing products with various sizes and stock levels
const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL']
const colors = ['Black', 'White', 'Navy', 'Gray', 'Red', 'Blue', 'Green', 'Pink', 'Brown']
const brands = ['StyleCo', 'TrendWear', 'UrbanFit', 'ClassicThread', 'ModernLook']

const generateSKU = (productType: string, color: string, size: string, id: number) => {
  const typeCode = productType.slice(0, 2).toUpperCase()
  const colorCode = color.slice(0, 3).toUpperCase()
  const sizeCode = size
  return `${typeCode}-${colorCode}-${sizeCode}-${id.toString().padStart(3, '0')}`
}

const mockProducts: Product[] = []

// Generate sample clothing products
const baseProducts = [
  { name: "Classic Cotton T-Shirt", category_id: 1, price: 19.99, description: "100% cotton basic tee" },
  { name: "Graphic Print Tee", category_id: 1, price: 24.99, description: "Trendy graphic design t-shirt" },
  { name: "Slim Fit Jeans", category_id: 2, price: 79.99, description: "Modern slim fit denim" },
  { name: "Vintage Wash Jeans", category_id: 2, price: 89.99, description: "Distressed vintage style" },
  { name: "Pullover Hoodie", category_id: 3, price: 49.99, description: "Comfortable cotton hoodie" },
  { name: "Zip-Up Hoodie", category_id: 3, price: 54.99, description: "Full zip hooded sweatshirt" },
  { name: "Summer Dress", category_id: 4, price: 69.99, description: "Light floral summer dress" },
  { name: "Evening Dress", category_id: 4, price: 129.99, description: "Elegant evening wear" },
  { name: "Denim Jacket", category_id: 5, price: 79.99, description: "Classic denim jacket" },
  { name: "Bomber Jacket", category_id: 5, price: 99.99, description: "Modern bomber style jacket" }
]

let productId = 1
for (const baseProduct of baseProducts) {
  for (const size of sizes) {
    for (const color of colors.slice(0, 3)) { // Limit colors to keep dataset manageable for demo
      const sku = generateSKU(baseProduct.name, color, size, productId)
      // Vary stock levels to show different statuses
      let quantity = 0
      let lowStockThreshold = 10
      
      // Create varied stock levels for demonstration
      const stockVariation = Math.random()
      if (stockVariation < 0.1) {
        quantity = 0 // 10% out of stock
      } else if (stockVariation < 0.25) {
        quantity = Math.floor(Math.random() * 5) + 1 // 15% low stock (1-5 items)
        lowStockThreshold = 10
      } else {
        quantity = Math.floor(Math.random() * 200) + 20 // 75% normal stock (20-220 items)
        lowStockThreshold = 15
      }

      mockProducts.push({
        id: productId,
        name: `${baseProduct.name} - ${color}`,
        sku,
        category_id: baseProduct.category_id,
        description: baseProduct.description,
        price: baseProduct.price,
        quantity,
        low_stock_threshold: lowStockThreshold,
        size,
        color,
        material: "Cotton Blend",
        brand: brands[Math.floor(Math.random() * brands.length)],
        user_id: 1,
        last_updated: "2024-01-15",
        category: mockCategories.find(c => c.id === baseProduct.category_id) || null
      })
      productId++
    }
  }
}

const mockPurchaseOrders: PurchaseOrder[] = [
  { id: 1, user_id: 1, product_id: 2, quantity_ordered: 50, status: "pending", order_date: "2024-01-15", notes: "Urgent restock needed", product: mockProducts[1] },
  { id: 2, user_id: 1, product_id: 5, quantity_ordered: 25, status: "pending", order_date: "2024-01-14", notes: "Low stock alert", product: mockProducts[4] },
  { id: 3, user_id: 1, product_id: 8, quantity_ordered: 100, status: "completed", order_date: "2024-01-10", notes: "Regular restock", product: mockProducts[7] }
]

// Simulate API delay for realistic feel
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Mock apiFetch function
export async function apiFetch(path: string, options: RequestInit = {}) {
  await delay(100) // Simulate network delay
  return new Response(JSON.stringify({}), { status: 200 })
}

// Types for clothing inventory system
export interface Product {
  id: number
  name: string
  sku: string
  category_id: number | null
  description: string | null
  price: number
  quantity: number
  low_stock_threshold: number
  size: string // S, M, L, XL, XXL, 3XL, etc.
  color?: string
  material?: string
  brand?: string
  user_id: number | null
  last_updated: string | null
  category: ProductCategory | null
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
  product_id: number
  quantity_ordered: number
  status: string
  order_date: string | null
  notes: string | null
  product: Product | null
}

export interface PurchaseOrderCreate {
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

export interface FileUploadData {
  sales_file?: File
  stock_file?: File
}

// Mock API functions - return static data for UI development
export async function getLowStockProducts(): Promise<Product[]> {
  await delay(200)
  return mockProducts.filter(p => p.quantity <= p.low_stock_threshold && p.quantity > 0)
}

export async function getOutOfStockProducts(): Promise<Product[]> {
  await delay(200)
  return mockProducts.filter(p => p.quantity === 0)
}

export async function getRestockSummary(): Promise<RestockSummary> {
  await delay(150)
  const lowStock = mockProducts.filter(p => p.quantity <= p.low_stock_threshold && p.quantity > 0)
  const outOfStock = mockProducts.filter(p => p.quantity === 0)
  const pendingOrders = mockPurchaseOrders.filter(po => po.status === 'pending')
  
  return {
    pending_orders: pendingOrders.length,
    low_stock_items: lowStock.length,
    out_of_stock_items: outOfStock.length,
    total_pending_value: pendingOrders.reduce((sum, po) => {
      const product = mockProducts.find(p => p.id === po.product_id)
      return sum + (product ? product.price * po.quantity_ordered : 0)
    }, 0)
  }
}

export async function createPurchaseOrder(order: PurchaseOrderCreate): Promise<PurchaseOrder> {
  await delay(300)
  const newOrder: PurchaseOrder = {
    id: mockPurchaseOrders.length + 1,
    user_id: 1,
    product_id: order.product_id,
    quantity_ordered: order.quantity_ordered,
    status: order.status || 'pending',
    order_date: new Date().toISOString().split('T')[0],
    notes: order.notes || null,
    product: mockProducts.find(p => p.id === order.product_id) || null
  }
  mockPurchaseOrders.push(newOrder)
  return newOrder
}

export async function getPurchaseOrders(status?: string): Promise<PurchaseOrder[]> {
  await delay(200)
  if (status) {
    return mockPurchaseOrders.filter(po => po.status === status)
  }
  return mockPurchaseOrders
}

export async function getPurchaseOrder(id: number): Promise<PurchaseOrder> {
  await delay(150)
  const order = mockPurchaseOrders.find(po => po.id === id)
  if (!order) throw new Error('Purchase order not found')
  return order
}

export async function updatePurchaseOrder(id: number, updates: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
  await delay(250)
  const orderIndex = mockPurchaseOrders.findIndex(po => po.id === id)
  if (orderIndex === -1) throw new Error('Purchase order not found')
  
  mockPurchaseOrders[orderIndex] = { ...mockPurchaseOrders[orderIndex], ...updates }
  return mockPurchaseOrders[orderIndex]
}

export async function deletePurchaseOrder(id: number): Promise<{ ok: boolean }> {
  await delay(200)
  const orderIndex = mockPurchaseOrders.findIndex(po => po.id === id)
  if (orderIndex === -1) throw new Error('Purchase order not found')
  
  mockPurchaseOrders.splice(orderIndex, 1)
  return { ok: true }
}

// Products API functions
export async function getProducts(): Promise<Product[]> {
  await delay(200)
  return mockProducts
}

export async function getCategories(): Promise<ProductCategory[]> {
  await delay(150)
  return mockCategories
}

// File upload functions
export async function uploadSalesData(file: File): Promise<{ success: boolean; message: string }> {
  await delay(2000) // Simulate longer upload time
  
  // Mock validation
  if (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
    throw new Error('Only CSV and Excel files are supported')
  }
  
  return {
    success: true,
    message: `Sales data uploaded successfully. Processed ${Math.floor(Math.random() * 1000)} records.`
  }
}

export async function uploadStockData(file: File): Promise<{ success: boolean; message: string }> {
  await delay(2000) // Simulate longer upload time
  
  // Mock validation
  if (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
    throw new Error('Only CSV and Excel files are supported')
  }
  
  return {
    success: true,
    message: `Stock data uploaded successfully. Updated ${Math.floor(Math.random() * 5000)} SKUs.`
  }
}

// ========================================
// HOW TO SWITCH TO REAL BACKEND:
// ========================================
// 1. Comment out all the mock functions above
// 2. Uncomment the original backend functions in the /* */ block at the top
// 3. Uncomment the original useAuthenticatedApi hook if using authentication
// 4. Update layout.tsx to include AuthProvider if using authentication
// ========================================
