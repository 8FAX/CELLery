import type { CellPosition } from "@/types/spreadsheet"

export function getColumnLabel(col: number): string {
  let result = ""
  while (col >= 0) {
    result = String.fromCharCode(65 + (col % 26)) + result
    col = Math.floor(col / 26) - 1
  }
  return result
}

export function getCellKey(position: CellPosition): string {
  return `${position.row}-${position.col}`
}

export function getCellReference(position: CellPosition): string {
  return `${getColumnLabel(position.col)}${position.row + 1}`
}

export function parseCellReference(ref: string): CellPosition | null {
  const match = ref.match(/^([A-Z]+)(\d+)$/)
  if (!match) return null

  const colStr = match[1]
  const rowStr = match[2]

  let col = 0
  for (let i = 0; i < colStr.length; i++) {
    col = col * 26 + (colStr.charCodeAt(i) - 64)
  }
  col -= 1

  const row = Number.parseInt(rowStr) - 1

  return { row, col }
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}
