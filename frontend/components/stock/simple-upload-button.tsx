"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Upload, FileText, AlertCircle, Loader2 } from "lucide-react"
import { uploadSalesData, uploadStockData } from "@/lib/api"
import { useAppToast } from "@/lib/use-toast"
import UploadOverlay from "@/components/ui/upload-overlay"

interface SimpleUploadButtonProps {
  onUploadComplete?: () => void
}

export function SimpleUploadButton({ onUploadComplete }: SimpleUploadButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isUploadingSales, setIsUploadingSales] = useState(false)
  const [isUploadingStock, setIsUploadingStock] = useState(false)
  const [salesDryRun, setSalesDryRun] = useState(false)
  const [salesCreateMissing, setSalesCreateMissing] = useState(false)
  const [stockDryRun, setStockDryRun] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const salesInputRef = useRef<HTMLInputElement>(null)
  const stockInputRef = useRef<HTMLInputElement>(null)
  const { push } = useAppToast()

  // Simulate progress for visual feedback
  const simulateProgress = (onComplete: () => void) => {
    setUploadProgress(0)
    const progressTimer = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressTimer)
          return 90 // Stop at 90% until actual completion
        }
        return prev + Math.random() * 15
      })
    }, 200)

    return () => {
      clearInterval(progressTimer)
      setUploadProgress(100)
      setTimeout(() => {
        setUploadProgress(0)
        onComplete()
      }, 500)
    }
  }

  const handleSalesUploadClick = () => {
    salesInputRef.current?.click()
  }

  const handleStockUploadClick = () => {
    stockInputRef.current?.click()
  }

  const handleSalesFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingSales(true)
    const completeProgress = simulateProgress(() => setIsUploadingSales(false))

    try {
      const result = await uploadSalesData(file, {
        dry_run: salesDryRun,
        create_missing: salesCreateMissing
      })
      
      completeProgress()
      
      const title = salesDryRun ? "Sales Data Validation Complete" : "Sales Data Upload Successful"
      const description = salesDryRun ? 
        `Validation completed: ${result.message}` : 
        result.message

      push({
        title,
        description,
        variant: "success"
      })

      if (onUploadComplete && !salesDryRun) {
        onUploadComplete()
      }

      // Reset the input
      if (salesInputRef.current) {
        salesInputRef.current.value = ''
      }

    } catch (error) {
      completeProgress()
      push({
        title: salesDryRun ? "Sales Data Validation Failed" : "Sales Data Upload Failed",
        description: error instanceof Error ? error.message : 'Upload failed. Please try again.',
        variant: "error"
      })
    }
  }

  const handleStockFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingStock(true)
    const completeProgress = simulateProgress(() => setIsUploadingStock(false))

    try {
      const result = await uploadStockData(file, {
        dry_run: stockDryRun
      })
      
      completeProgress()
      
      const title = stockDryRun ? "Stock Data Validation Complete" : "Stock Data Upload Successful"
      const description = stockDryRun ? 
        `Validation completed: ${result.message}` : 
        result.message

      push({
        title,
        description,
        variant: "success"
      })

      if (onUploadComplete && !stockDryRun) {
        onUploadComplete()
      }

      // Reset the input
      if (stockInputRef.current) {
        stockInputRef.current.value = ''
      }

    } catch (error) {
      completeProgress()
      push({
        title: stockDryRun ? "Stock Data Validation Failed" : "Stock Data Upload Failed",
        description: error instanceof Error ? error.message : 'Upload failed. Please try again.',
        variant: "error"
      })
    }
  }

  return (
    <>
      {(isUploadingSales || isUploadingStock) && (
        <UploadOverlay 
          message={isUploadingSales && !isUploadingStock ? 'Uploading sales data...' : isUploadingStock && !isUploadingSales ? 'Uploading stock data...' : 'Uploading data...'} 
          progress={uploadProgress}
          showProgress={true}
        />
      )}
      {/* Hidden file inputs */}
      <input
        ref={salesInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={handleSalesFileChange}
        style={{ display: 'none' }}
      />
      <input
        ref={stockInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={handleStockFileChange}
        style={{ display: 'none' }}
      />

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button className="btn-corporate shadow-lg">
            <Upload className="mr-2 h-4 w-4" />
            Upload Data
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px] professional-card">
          <DialogHeader className="professional-card-header p-6 -m-6 mb-4">
            <DialogTitle className="text-xl font-bold text-gray-900">Upload Data Files</DialogTitle>
            <DialogDescription className="text-gray-600 mt-2">
              Choose the type of data you want to upload. You can upload sales data, stock data, or both.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            {/* Sales Data Upload */}
            <div className="space-y-4 p-4 border border-blue-200 rounded-lg bg-blue-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Sales Data</h3>
                  <p className="text-sm text-gray-600">Upload sales transactions and performance data</p>
                </div>
              </div>
              
              {/* Sales Upload Options */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sales-dry-run"
                    checked={salesDryRun}
                    onCheckedChange={(checked) => setSalesDryRun(checked as boolean)}
                    disabled={isUploadingSales || isUploadingStock}
                  />
                  <label 
                    htmlFor="sales-dry-run" 
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Validate only (dry run)
                  </label>
                  <AlertCircle className="h-4 w-4 text-gray-400" />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sales-create-missing"
                    checked={salesCreateMissing}
                    onCheckedChange={(checked) => setSalesCreateMissing(checked as boolean)}
                    disabled={isUploadingSales || isUploadingStock}
                  />
                  <label 
                    htmlFor="sales-create-missing" 
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Create missing products automatically
                  </label>
                  <div className="group relative">
                    <AlertCircle className="h-4 w-4 text-amber-500 cursor-help" />
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                      If sales data references products that don't exist, create them automatically
                    </div>
                  </div>
                </div>
              </div>
              
              <Button 
                onClick={handleSalesUploadClick}
                disabled={isUploadingSales || isUploadingStock}
                className="w-full btn-corporate"
              >
                {isUploadingSales ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                {isUploadingSales ? 'Processing Sales Data...' : (salesDryRun ? 'Validate Sales File' : 'Upload Sales File')}
              </Button>
              <p className="text-xs text-gray-500 bg-white p-2 rounded border">
                Expected format: SKU, Date, Quantity Sold, Sale Price
              </p>
              {salesCreateMissing && (
                <div className="text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200 flex items-start gap-2">
                  <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Auto-create enabled:</strong> Products will be created automatically for any SKUs in your sales data that don't exist in the system.
                  </span>
                </div>
              )}
            </div>

            {/* Stock Data Upload */}
            <div className="space-y-4 p-4 border border-green-200 rounded-lg bg-green-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-600 rounded-lg">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Stock Data</h3>
                  <p className="text-sm text-gray-600">Upload inventory levels and stock information</p>
                </div>
              </div>
              
              {/* Stock Upload Options */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="stock-dry-run"
                    checked={stockDryRun}
                    onCheckedChange={(checked) => setStockDryRun(checked as boolean)}
                    disabled={isUploadingSales || isUploadingStock}
                  />
                  <label 
                    htmlFor="stock-dry-run" 
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Validate only (dry run)
                  </label>
                  <AlertCircle className="h-4 w-4 text-gray-400" />
                </div>
              </div>
              
              <Button 
                onClick={handleStockUploadClick}
                disabled={isUploadingSales || isUploadingStock}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
              >
                {isUploadingStock ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                {isUploadingStock ? 'Processing Stock Data...' : (stockDryRun ? 'Validate Stock File' : 'Upload Stock File')}
              </Button>
              <p className="text-xs text-gray-500 bg-white p-2 rounded border">
                Expected format: SKU, Current Stock, Low Stock Threshold, Price
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              disabled={isUploadingSales || isUploadingStock}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}