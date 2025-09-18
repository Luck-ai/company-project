"use client"

import UploadCSV from "@/components/ui/upload-csv"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function SuppliersManager() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Suppliers</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-2">Import suppliers with a CSV file (headers: name, email, phone, address)</p>
  <UploadCSV url="/suppliers/upload" label="Upload Suppliers CSV" />
      </CardContent>
    </Card>
  )
}
