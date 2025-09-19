"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, FileText, AlertCircle, CheckCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { uploadSalesData, uploadStockData } from "@/lib/api"

interface FileUploadDialogProps {
  onUploadComplete?: () => void
}

export function FileUploadDialog({ onUploadComplete }: FileUploadDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [salesFile, setSalesFile] = useState<File | null>(null)
  const [stockFile, setStockFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'success' | 'error' | null
    message: string
  }>({ type: null, message: '' })

  const handleSalesFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSalesFile(file)
      setUploadStatus({ type: null, message: '' })
    }
  }

  const handleStockFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setStockFile(file)
      setUploadStatus({ type: null, message: '' })
    }
  }

  const handleUpload = async () => {
    if (!salesFile && !stockFile) {
      setUploadStatus({
        type: 'error',
        message: 'Please select at least one file to upload.'
      })
      return
    }

    setIsUploading(true)
    setUploadStatus({ type: null, message: '' })

    try {
      const uploadPromises = []
      
      if (salesFile) {
        uploadPromises.push(uploadSalesData(salesFile))
      }
      
      if (stockFile) {
        uploadPromises.push(uploadStockData(stockFile))
      }

      const results = await Promise.all(uploadPromises)
      const messages = results.map(r => r.message).join(' ')
      
      setUploadStatus({
        type: 'success',
        message: messages
      })

      // Reset files after successful upload
      setSalesFile(null)
      setStockFile(null)
      
      // Reset file inputs
      const salesInput = document.getElementById('sales-file') as HTMLInputElement
      const stockInput = document.getElementById('stock-file') as HTMLInputElement
      if (salesInput) salesInput.value = ''
      if (stockInput) stockInput.value = ''

      if (onUploadComplete) {
        onUploadComplete()
      }

    } catch (error) {
      setUploadStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Upload failed. Please try again.'
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleClose = () => {
    if (!isUploading) {
      setIsOpen(false)
      setSalesFile(null)
      setStockFile(null)
      setUploadStatus({ type: null, message: '' })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Upload className="mr-2 h-4 w-4" />
          Upload Data
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload Sales & Stock Data</DialogTitle>
          <DialogDescription>
            Upload CSV or Excel files to update your inventory data. You can upload sales data, stock data, or both.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Sales File Upload */}
          <div className="space-y-2">
            <Label htmlFor="sales-file" className="text-sm font-medium">
              Sales Data File
            </Label>
            <div className="flex items-center space-x-2">
              <Input
                id="sales-file"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleSalesFileChange}
                disabled={isUploading}
                className="flex-1"
              />
              {salesFile && (
                <div className="flex items-center text-green-600">
                  <FileText className="h-4 w-4 mr-1" />
                  <span className="text-xs">{salesFile.name}</span>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Expected format: SKU, Date, Quantity Sold, Sale Price
            </p>
          </div>

          {/* Stock File Upload */}
          <div className="space-y-2">
            <Label htmlFor="stock-file" className="text-sm font-medium">
              Stock Data File
            </Label>
            <div className="flex items-center space-x-2">
              <Input
                id="stock-file"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleStockFileChange}
                disabled={isUploading}
                className="flex-1"
              />
              {stockFile && (
                <div className="flex items-center text-green-600">
                  <FileText className="h-4 w-4 mr-1" />
                  <span className="text-xs">{stockFile.name}</span>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Expected format: SKU, Current Stock, Low Stock Threshold, Price
            </p>
          </div>

          {/* Upload Status */}
          {uploadStatus.type && (
            <Alert variant={uploadStatus.type === 'error' ? 'destructive' : 'default'}>
              {uploadStatus.type === 'error' ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              <AlertDescription>{uploadStatus.message}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleUpload}
            disabled={isUploading || (!salesFile && !stockFile)}
          >
            {isUploading ? 'Uploading...' : 'Upload Files'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}