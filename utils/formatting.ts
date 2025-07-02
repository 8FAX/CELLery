import type { CellFormat } from "@/types/spreadsheet"

export function formatCellValue(value: string, format?: CellFormat): string {
  if (!value || !format?.numberFormat) return value

  const numValue = Number.parseFloat(value)
  if (isNaN(numValue)) return value

  switch (format.numberFormat) {
    case "number":
      return numValue.toLocaleString()
    case "currency":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(numValue)
    case "percent":
      return new Intl.NumberFormat("en-US", {
        style: "percent",
        minimumFractionDigits: 2,
      }).format(numValue / 100)
    case "date":
      const date = new Date(numValue)
      return isNaN(date.getTime()) ? value : date.toLocaleDateString()
    default:
      return value
  }
}
