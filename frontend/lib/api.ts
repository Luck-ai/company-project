export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'

export async function apiFetch(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = { ...(options.headers as Record<string, string> || {}) }
  const body = (options as any).body
  if (!headers['Content-Type'] && body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  
  console.log(`API Request: ${options.method || 'GET'} ${API_BASE}${path}`)
  if (body instanceof FormData) {
    console.log('FormData upload detected')
  }
  
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  console.log(`API Response: ${res.status} ${res.statusText}`)
  return res
}

// Types used by the frontend
export interface Product {
  id: number
  name: string
  sku: string
  category_id: number | null
  description: string | null
  price: number
  // legacy mock field
  quantity: number
  // backend authoritative stock field
  stock_level?: number
  low_stock_threshold: number
  size: string
  // color as stored in the backend product table
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

export interface Sale {
  sale_id: number
  channel: string
  date: string
  sku: string
  quantity: number
  created_at?: string
}

export interface SalesAnalysis {
  totalSales: number
  lastSaleDate: string | null
  daysSinceLastSale: number
  averageDailySales: number
  isActive: boolean
}

export interface FileUploadData {
  sales_file?: File
  stock_file?: File
}

// -----------------------------
// Mock data & simple helpers
// -----------------------------
const mockCategories: ProductCategory[] = [
  { id: 1, name: 'T-Shirts', description: 'Basic and graphic t-shirts', user_id: 1 },
  { id: 2, name: 'Jeans', description: 'Denim jeans and pants', user_id: 1 },
  { id: 3, name: 'Hoodies', description: 'Hooded sweatshirts and pullovers', user_id: 1 },
  { id: 4, name: 'Dresses', description: 'Casual and formal dresses', user_id: 1 },
  { id: 5, name: 'Jackets', description: 'Outerwear and jackets', user_id: 1 },
  { id: 6, name: 'Accessories', description: 'Belts, hats, and other accessories', user_id: 1 }
]

const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL']
const brands = ['StyleCo', 'TrendWear', 'UrbanFit', 'ClassicThread', 'ModernLook']

const generateSKU = (productType: string, size: string, id: number) => {
  const typeCode = productType.slice(0, 2).toUpperCase()
  return `${typeCode}-${size}-${id.toString().padStart(3, '0')}`
}

const mockProducts: Product[] = []
const baseProducts = [
  { name: 'Classic Cotton T-Shirt', category_id: 1, price: 19.99, description: '100% cotton basic tee' },
  { name: 'Graphic Print Tee', category_id: 1, price: 24.99, description: 'Trendy graphic design t-shirt' },
  { name: 'Slim Fit Jeans', category_id: 2, price: 79.99, description: 'Modern slim fit denim' },
  { name: 'Vintage Wash Jeans', category_id: 2, price: 89.99, description: 'Distressed vintage style' },
  { name: 'Pullover Hoodie', category_id: 3, price: 49.99, description: 'Comfortable cotton hoodie' },
  { name: 'Zip-Up Hoodie', category_id: 3, price: 54.99, description: 'Full zip hooded sweatshirt' },
  { name: 'Summer Dress', category_id: 4, price: 69.99, description: 'Light floral summer dress' },
  { name: 'Evening Dress', category_id: 4, price: 129.99, description: 'Elegant evening wear' },
  { name: 'Denim Jacket', category_id: 5, price: 79.99, description: 'Classic denim jacket' },
  { name: 'Bomber Jacket', category_id: 5, price: 99.99, description: 'Modern bomber style jacket' }
]

let productId = 1
for (const baseProduct of baseProducts) {
  for (const size of sizes) {
    const sku = generateSKU(baseProduct.name, size, productId)
    let quantity = 0
    let lowStockThreshold = 10
    const stockVariation = Math.random()
    if (stockVariation < 0.1) {
      quantity = 0
    } else if (stockVariation < 0.25) {
      quantity = Math.floor(Math.random() * 5) + 1
      lowStockThreshold = 10
    } else {
      quantity = Math.floor(Math.random() * 200) + 20
      lowStockThreshold = 15
    }

    mockProducts.push({
      id: productId,
      name: baseProduct.name,
      sku,
      category_id: baseProduct.category_id,
      description: baseProduct.description || null,
      price: (baseProduct as any).price || 0,
      quantity,
      low_stock_threshold: lowStockThreshold,
      size,
      material: 'Cotton Blend',
      brand: brands[Math.floor(Math.random() * brands.length)],
      user_id: 1,
      last_updated: '2024-01-15',
      category: mockCategories.find(c => c.id === baseProduct.category_id) || null
    })
    productId++
  }
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

type DataSourceKey = 'mock' | 'company1' | 'company2' | 'pajara'

const createVariantProducts = (base: Product[], companyTag: string, qtyOffset = 0) => {
  return base.map(p => ({
    ...p,
    id: Number(String(p.id) + (companyTag === 'company1' ? '1' : '2')),
    sku: `${p.sku}-${companyTag.slice(-1).toUpperCase()}`,
    name: `${p.name} (${companyTag})`,
    brand: p.brand ? `${companyTag}-${p.brand}` : companyTag,
    quantity: Math.max(0, p.quantity + qtyOffset + (companyTag === 'company1' ? -5 : 10)),
    category: p.category ? { ...p.category, name: `${p.category.name}` } : p.category
  }))
}

const company1Products = createVariantProducts(mockProducts, 'company1', -3)
const company2Products = createVariantProducts(mockProducts, 'company2', 5)

const dataSources: Record<DataSourceKey, Product[]> = {
  mock: mockProducts,
  company1: company1Products,
  company2: company2Products,
  pajara: []
}

// Initialize current data source. Preference order:
// 1. localStorage (if available and valid)
// 2. environment variable NEXT_PUBLIC_DATA_SOURCE (set at build/runtime)
// 3. fallback to 'mock'
let currentDataSource: DataSourceKey = 'mock'
try {
  if (typeof window !== 'undefined') {
    const saved = window.localStorage.getItem('inventoryDataSource')
    if (saved === 'company1' || saved === 'company2' || saved === 'mock' || saved === 'pajara') {
      currentDataSource = saved as DataSourceKey
    } else {
      const envDefault = (process.env.NEXT_PUBLIC_DATA_SOURCE as DataSourceKey) || undefined
      if (envDefault === 'company1' || envDefault === 'company2' || envDefault === 'mock' || envDefault === 'pajara') {
        currentDataSource = envDefault
      }
    }
  } else {
    // On server, prefer build-time env variable if present
    const envDefault = (process.env.NEXT_PUBLIC_DATA_SOURCE as DataSourceKey) || undefined
    if (envDefault === 'company1' || envDefault === 'company2' || envDefault === 'mock' || envDefault === 'pajara') {
      currentDataSource = envDefault
    }
  }
} catch (e) {
  // If anything fails (e.g. localStorage disabled), fall back to default
  currentDataSource = 'mock'
}

export function setDataSource(source: DataSourceKey) {
  if (source === 'pajara' || dataSources[source]) {
    currentDataSource = source as any
    console.log(`Data source changed to: ${currentDataSource}`)
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('inventoryDataSource', currentDataSource)
      }
    } catch (e) {
      // ignore localStorage write failures
    }
  }
}

export function getDataSource(): DataSourceKey {
  return currentDataSource
}

// Debug function to check current state
export function debugDataSource() {
  console.log('Current data source:', currentDataSource)
  console.log('Available sources:', Object.keys(dataSources))
  console.log('API_BASE:', API_BASE)
  return { currentDataSource, API_BASE, availableSources: Object.keys(dataSources) }
}

// Mock helpers for restock/out-of-stock views (client-side only)
export async function getLowStockProducts(): Promise<Product[]> {
  await delay(200)
  const ds = dataSources[currentDataSource]
  return ds.filter(p => p.quantity <= p.low_stock_threshold && p.quantity > 0)
}

export async function getOutOfStockProducts(): Promise<Product[]> {
  await delay(200)
  const ds = dataSources[currentDataSource]
  return ds.filter(p => p.quantity === 0)
}

// Products/Categories - call backend only when using 'pajara'
export async function getProducts(filters?: { category_id?: number | null; size?: string | null; color?: string | null }): Promise<Product[]> {
  if (currentDataSource === 'pajara') {
    const params = new URLSearchParams()
    if (filters) {
      if (filters.category_id != null) params.set('category_id', String(filters.category_id))
      if (filters.size) params.set('size', filters.size)
      if (filters.color) params.set('color', filters.color)
    }
    const path = params.toString() ? `/products?${params.toString()}` : '/products'
    const res = await apiFetch(path)
    if (!res.ok) throw new Error('Failed to fetch products')
    return res.json()
  }
  await delay(200)
  return dataSources[currentDataSource]
}

// Fetch available sizes and colors from the backend (pajara). This will fetch
// products and derive distinct values. We intentionally keep this in the
// frontend so the client can populate filter dropdowns without requiring
// new backend endpoints.
export async function getAvailableSizesAndColors(): Promise<{ sizes: string[]; colors: string[] }> {
  if (currentDataSource === 'pajara') {
    // Prefer dedicated facets endpoint to avoid fetching all products
    const res = await apiFetch('/products/facets')
    if (!res.ok) throw new Error('Failed to fetch product facets')
    const json = await res.json()
    return { sizes: json.sizes || [], colors: json.colors || [] }
  }
  // For non-pajara data, return empty arrays so the caller can fall back to local values
  return { sizes: [], colors: [] }
}

export async function getCategories(): Promise<ProductCategory[]> {
  if (currentDataSource === 'pajara') {
    const res = await apiFetch('/categories')
    if (!res.ok) throw new Error('Failed to fetch categories')
    return res.json()
  }
  await delay(150)
  return mockCategories
}

// Sales API functions
export async function getAllSales(): Promise<Sale[]> {
  if (currentDataSource === 'pajara') {
    const res = await apiFetch('/sales/')
    if (!res.ok) throw new Error('Failed to fetch sales data')
    return res.json()
  }
  // For mock data, generate some sample sales
  await delay(200)
  return generateMockSales()
}

export async function getSalesBySku(sku: string): Promise<Sale[]> {
  if (currentDataSource === 'pajara') {
    const res = await apiFetch(`/sales/${encodeURIComponent(sku)}`)
    if (!res.ok) throw new Error('Failed to fetch sales data for SKU')
    return res.json()
  }
  // For mock data, generate sample sales for this SKU
  await delay(150)
  return generateMockSalesForSku(sku)
}

// Analyze sales data to determine if a product is active
export function analyzeSalesData(sales: Sale[]): SalesAnalysis {
  if (sales.length === 0) {
    return {
      totalSales: 0,
      lastSaleDate: null,
      daysSinceLastSale: Infinity,
      averageDailySales: 0,
      isActive: false
    }
  }

  const totalSales = sales.reduce((sum, sale) => sum + sale.quantity, 0)
  const sortedSales = [...sales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const lastSaleDate = sortedSales[0].date
  
  const daysSinceLastSale = Math.floor(
    (new Date().getTime() - new Date(lastSaleDate).getTime()) / (1000 * 60 * 60 * 24)
  )
  
  // Calculate average daily sales over the last 90 days
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
  
  const recentSales = sales.filter(sale => new Date(sale.date) >= ninetyDaysAgo)
  const averageDailySales = recentSales.length > 0 
    ? recentSales.reduce((sum, sale) => sum + sale.quantity, 0) / 90
    : 0
    
  // Consider active if has sales in last 30 days OR has decent average daily sales
  const isActive = daysSinceLastSale <= 30 || averageDailySales > 0.1
  
  return {
    totalSales,
    lastSaleDate,
    daysSinceLastSale,
    averageDailySales,
    isActive
  }
}

// Mock sales data generators for non-pajara sources
function generateMockSales(): Sale[] {
  const mockSales: Sale[] = []
  const channels = ['Shopee', 'Facebook', 'TikTok', 'Instagram', 'Lazada', 'LINE', 'Website', 'Store']
  const skus = mockProducts.map(p => p.sku).slice(0, 50) // Only generate sales for first 50 products
  
  let saleId = 1
  for (let i = 0; i < 200; i++) {
    const sku = skus[Math.floor(Math.random() * skus.length)]
    const channel = channels[Math.floor(Math.random() * channels.length)]
    const daysAgo = Math.floor(Math.random() * 180) // Random date in last 180 days
    const date = new Date()
    date.setDate(date.getDate() - daysAgo)
    
    mockSales.push({
      sale_id: saleId++,
      channel,
      date: date.toISOString().split('T')[0],
      sku,
      quantity: Math.floor(Math.random() * 5) + 1
    })
  }
  
  return mockSales
}

function generateMockSalesForSku(sku: string): Sale[] {
  const mockSales: Sale[] = []
  const channels = ['Shopee', 'Facebook', 'TikTok', 'Instagram', 'Lazada', 'LINE', 'Website', 'Store']
  
  // Generate 5-15 sales for this SKU
  const salesCount = Math.floor(Math.random() * 10) + 5
  let saleId = 1000 + Math.floor(Math.random() * 1000)
  
  for (let i = 0; i < salesCount; i++) {
    const channel = channels[Math.floor(Math.random() * channels.length)]
    const daysAgo = Math.floor(Math.random() * 90) // Random date in last 90 days
    const date = new Date()
    date.setDate(date.getDate() - daysAgo)
    
    mockSales.push({
      sale_id: saleId++,
      channel,
      date: date.toISOString().split('T')[0],
      sku,
      quantity: Math.floor(Math.random() * 3) + 1
    })
  }
  
  return mockSales
}

// File upload functions with proper query parameters
export async function uploadSalesData(
  file: File, 
  options: { dry_run?: boolean; create_missing?: boolean } = {}
): Promise<{ success: boolean; message: string }> {
  console.log('uploadSalesData called with:', { filename: file.name, options, currentDataSource })
  
  if (currentDataSource === 'pajara') {
    console.log('Using pajara backend for sales upload')
    const fd = new FormData()
    fd.append('file', file)
    
    const params = new URLSearchParams()
    if (options.dry_run) params.set('dry_run', 'true')
    if (options.create_missing) params.set('create_missing', 'true')
    
    const url = params.toString() ? `/sales/upload?${params.toString()}` : '/sales/upload'
    console.log('Sales upload URL:', url)
    
    const res = await apiFetch(url, { method: 'POST', body: fd })
    
    if (!res.ok) {
      const errorText = await res.text()
      console.error('Sales upload failed:', errorText)
      throw new Error(errorText || 'Failed to upload sales file')
    }
    const result = await res.json()
    console.log('Sales upload result:', result)
    return result
  }
  console.log('Using mock data for sales upload')
  await delay(2000)
  if (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
    throw new Error('Only CSV and Excel files are supported')
  }
  return {
    success: true,
    message: `Sales data uploaded successfully. Processed ${Math.floor(Math.random() * 1000)} records.`
  }
}

export async function uploadStockData(
  file: File, 
  options: { dry_run?: boolean } = {}
): Promise<{ success: boolean; message: string }> {
  console.log('uploadStockData called with:', { filename: file.name, options, currentDataSource })
  
  if (currentDataSource === 'pajara') {
    console.log('Using pajara backend for stock upload')
    const fd = new FormData()
    fd.append('file', file)
    
    const params = new URLSearchParams()
    if (options.dry_run) params.set('dry_run', 'true')
    
    const url = params.toString() ? `/products/upload?${params.toString()}` : '/products/upload'
    console.log('Stock upload URL:', url)
    
    const res = await apiFetch(url, { method: 'POST', body: fd })
    
    if (!res.ok) {
      const errorText = await res.text()
      console.error('Stock upload failed:', errorText)
      throw new Error(errorText || 'Failed to upload stock file')
    }
    const result = await res.json()
    console.log('Stock upload result:', result)
    return result
  }

  console.log('Using mock data for stock upload')
  await delay(2000)
  if (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
    throw new Error('Only CSV and Excel files are supported')
  }
  return {
    success: true,
    message: `Stock data uploaded successfully. Updated ${Math.floor(Math.random() * 5000)} SKUs.`
  }
}

// End of file
