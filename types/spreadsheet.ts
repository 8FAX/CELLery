export interface CellPosition {
  row: number
  col: number
}

export interface CellRange {
  start: CellPosition
  end: CellPosition
}

export interface CellFormat {
  bold?: boolean
  italic?: boolean
  underline?: boolean
  fontSize?: number
  color?: string
  backgroundColor?: string
  borderTop?: string
  borderRight?: string
  borderBottom?: string
  borderLeft?: string
  numberFormat?: "general" | "number" | "currency" | "percent" | "date"
}

export interface CellData {
  value?: string
  formula?: string
  format?: CellFormat
}

export interface SpreadsheetLabel {
  id: string
  name: string
  description: string
  type: "cells" | "columns" | "rows"
  startRow: number
  endRow: number
  startCol: number
  endCol: number
  color: string
  timestamp: Date
  linkedLabels?: string[] // IDs of linked labels
  data?: { [cellKey: string]: any } // Actual cell data within the label range
}

export interface Sheet {
  id: string
  name: string
  cells: { [key: string]: CellData }
  labels: SpreadsheetLabel[]
}

export interface ContextMenuData {
  x: number
  y: number
  type: "cell" | "range"
  position: CellPosition
  range?: CellRange
}
