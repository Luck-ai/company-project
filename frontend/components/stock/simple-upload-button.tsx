"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Upload, FileText } from "lucide-react"
import { uploadSalesData, uploadStockData } from "@/lib/api"
import { useAppToast } from "@/lib/use-toast"

interface SimpleUploadButtonProps {
  onUploadComplete?: () => void
}

export function SimpleUploadButton({ onUploadComplete }: SimpleUploadButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isUploadingSales, setIsUploadingSales] = useState(false)
  const [isUploadingStock, setIsUploadingStock] = useState(false)
  const salesInputRef = useRef<HTMLInputElement>(null)
  const stockInputRef = useRef<HTMLInputElement>(null)
  const { push } = useAppToast()

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

    try {
      const result = await uploadSalesData(file)
      
      push({
        title: "Sales Data Upload Successful",
        description: result.message,
        variant: "success"
      })

      if (onUploadComplete) {
        onUploadComplete()
      }

      // Reset the input
      if (salesInputRef.current) {
        salesInputRef.current.value = ''
      }

    } catch (error) {
      push({
        title: "Sales Data Upload Failed",
        description: error instanceof Error ? error.message : 'Upload failed. Please try again.',
        variant: "error"
      })
    } finally {
      setIsUploadingSales(false)
    }
  }

  const handleStockFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingStock(true)

    try {
      const result = await uploadStockData(file)
      
      push({
        title: "Stock Data Upload Successful",
        description: result.message,
        variant: "success"
      })

      if (onUploadComplete) {
        onUploadComplete()
      }

      // Reset the input
      if (stockInputRef.current) {
        stockInputRef.current.value = ''
      }

    } catch (error) {
      push({
        title: "Stock Data Upload Failed",
        description: error instanceof Error ? error.message : 'Upload failed. Please try again.',
        variant: "error"
      })
    } finally {
      setIsUploadingStock(false)
    }
  }

  return (
    <>
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
              <Button 
                onClick={handleSalesUploadClick}
                disabled={isUploadingSales || isUploadingStock}
                className="w-full btn-corporate"
              >
                <Upload className="mr-2 h-4 w-4" />
                {isUploadingSales ? 'Uploading Sales Data...' : 'Choose Sales File'}
              </Button>
              <p className="text-xs text-gray-500 bg-white p-2 rounded border">
                Expected format: SKU, Date, Quantity Sold, Sale Price
              </p>
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
              <Button 
                onClick={handleStockUploadClick}
                disabled={isUploadingSales || isUploadingStock}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
              >
                <Upload className="mr-2 h-4 w-4" />
                {isUploadingStock ? 'Uploading Stock Data...' : 'Choose Stock File'}
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