"use client"

import UploadCSV from "@/components/ui/upload-csv"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function CategoriesManager() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Categories</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-2">Import product categories with a CSV file (headers: name, description)</p>
  <UploadCSV url="/categories/upload" label="Upload Categories CSV" />
      </CardContent>
    </Card>
  )
}
