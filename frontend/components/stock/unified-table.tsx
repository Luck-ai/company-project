"use client"

import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Edit, Trash2, AlertTriangle, Eye, Package, DollarSign } from "lucide-react"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

export interface TableColumn {
  key: string
  label: string
  className?: string
  render?: (value: any, item: any) => React.ReactNode
}

export interface TableAction {
  icon: React.ReactNode
  label: string
  onClick: (item: any) => void
  variant?: "ghost" | "default" | "destructive" | "outline" | "secondary"
  href?: string
}

export interface UnifiedTableProps {
  data: any[]
  columns: TableColumn[]
  actions?: TableAction[]
  loading?: boolean
  error?: string | null
  emptyMessage?: string
  onDelete?: (id: string, name?: string) => void
  getItemId?: (item: any) => string
  getItemName?: (item: any) => string
}

export function UnifiedTable({
  data,
  columns,
  actions = [],
  loading = false,
  error = null,
  emptyMessage = "No items found",
  onDelete,
  getItemId = (item) => item.id,
  getItemName = (item) => item.name
}: UnifiedTableProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name?: string } | null>(null)
  const [confirmError, setConfirmError] = useState<string | null>(null)

  const handleDelete = (item: any) => {
    const id = getItemId(item)
    const name = getItemName(item)
    setPendingDelete({ id, name })
    setConfirmOpen(true)
  }

  const performDelete = async () => {
    if (!pendingDelete || !onDelete) return
    try {
      setConfirmError(null)
      await onDelete(pendingDelete.id, pendingDelete.name)
      setConfirmOpen(false)
      setPendingDelete(null)
    } catch (err: any) {
      setConfirmError(err?.message || 'Error deleting item')
    }
  }

  if (loading) {
    return (
      <div className="rounded-md border">
        <div className="p-8 text-center text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md border">
        <div className="p-8 text-center text-destructive">Error: {error}</div>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader className="bg-transparent">
            <TableRow className="border-b-2" style={{ borderColor: 'var(--ui-table-header-border)' }}>
              <TableHead className="w-12">#</TableHead>
              {columns.map((column) => (
                <TableHead key={column.key} className={column.className}>
                  {column.label}
                </TableHead>
              ))}
              {actions.length > 0 && (
                <TableHead className="text-right">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + (actions.length > 0 ? 2 : 1)} className="text-center py-8 text-sm text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((item, index) => (
                <TableRow 
                  key={getItemId(item)} 
                  style={{ 
                    backgroundColor: 'var(--ui-table-row-bg)', 
                    borderTop: '2px solid var(--ui-table-row-border)' 
                  }}
                >
                  <TableCell className="w-12 py-4">
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" className="accent-purple-600" />
                    </div>
                  </TableCell>
                  {columns.map((column) => (
                    <TableCell key={column.key} className={column.className}>
                      {column.render ? column.render(item[column.key], item) : item[column.key]}
                    </TableCell>
                  ))}
                  {actions.length > 0 && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {actions.map((action, actionIndex) => {
                          if (action.href) {
                            return (
                              <Button 
                                key={actionIndex}
                                variant={action.variant || "ghost"} 
                                size="sm" 
                                asChild
                              >
                                <Link href={action.href.replace(':id', getItemId(item))}>
                                  {action.icon}
                                </Link>
                              </Button>
                            )
                          }
                          
                          return (
                            <Button
                              key={actionIndex}
                              variant={action.variant || "ghost"}
                              size="sm"
                              onClick={() => {
                                if (action.label === 'Delete' && onDelete) {
                                  handleDelete(item)
                                } else {
                                  action.onClick(item)
                                }
                              }}
                            >
                              {action.icon}
                            </Button>
                          )
                        })}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open)
          if (!open) {
            setPendingDelete(null)
            setConfirmError(null)
          }
        }}
        title="Delete item"
        description={
          pendingDelete?.name 
            ? `Delete '${pendingDelete.name}'? This action cannot be undone.`
            : "Are you sure you want to delete this item? This action cannot be undone."
        }
        error={confirmError}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={performDelete}
      />
    </>
  )
}