"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { apiFetch } from '@/lib/api'
import { useAppToast } from '@/lib/use-toast'

interface AddSaleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  productId: string
  productName: string
  productPrice: number  // Keep for display purposes only
  onSaleAdded: () => void
}

export function AddSaleDialog({ open, onOpenChange, productId, productName, productPrice, onSaleAdded }: AddSaleDialogProps) {
  const { push: pushToast } = useAppToast()
  const [formData, setFormData] = useState({
    quantity: "",
    sale_date: new Date().toISOString().split('T')[0] // Today's date in YYYY-MM-DD format
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const saleData = {
        quantity: parseInt(formData.quantity),
        sale_date: formData.sale_date ? new Date(formData.sale_date).toISOString() : undefined
      }

      const res = await apiFetch(`/sales/?product_id=${productId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(saleData)
      })

      if (res.ok) {
        // Reset form
        setFormData({
          quantity: "",
          sale_date: new Date().toISOString().split('T')[0]
        })
        onSaleAdded()
        onOpenChange(false)
        pushToast({
          title: "Success",
          description: "Sale recorded successfully!",
          variant: "success"
        })
      } else {
        const errorData = await res.json().catch(() => ({ detail: 'Unknown error' }))
        pushToast({
          title: "Error",
          description: errorData.detail || 'Failed to record sale',
          variant: "error"
        })
      }
    } catch (err) {
      console.error('Error recording sale:', err)
      pushToast({
        title: "Error",
        description: "Failed to record sale",
        variant: "error"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Record Sale</DialogTitle>
          <DialogDescription>
            Record a new sale for {productName}. The current product price (${productPrice.toFixed(2)}) will be used automatically.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quantity" className="text-right">
                Quantity
              </Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">
                Unit Price
              </Label>
              <div className="col-span-3 flex items-center h-10 px-3 py-2 border border-input bg-muted rounded-md text-sm">
                ${productPrice.toFixed(2)}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="sale_date" className="text-right">
                Sale Date
              </Label>
              <Input
                id="sale_date"
                type="date"
                value={formData.sale_date}
                onChange={(e) => setFormData(prev => ({ ...prev, sale_date: e.target.value }))}
                className="col-span-3"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Recording...' : 'Record Sale'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}