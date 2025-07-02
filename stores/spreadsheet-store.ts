"use client"

import { createWithEqualityFn } from "zustand/traditional"
import type {
  Sheet,
  CellData,
  CellPosition,
  CellRange,
  ContextMenuData,
  CellFormat,
  SpreadsheetLabel,
} from "@/types/spreadsheet"
import { getCellKey, generateId } from "@/utils/spreadsheet"
import { evaluateFormula } from "@/utils/formula"
import { shallow } from "zustand/shallow"
import * as XLSX from "xlsx"

interface SpreadsheetState {
  sheets: Sheet[]
  activeSheetId: string
  selectedCell: CellPosition | null
  selectedRange: CellRange | null
  formulaValue?: string
  contextMenu: ContextMenuData | null
  clipboard: { data: CellData; position: CellPosition }[]
  history: { sheets: Sheet[]; activeSheetId: string }[]
  historyIndex: number
}

interface SpreadsheetActions {
  // Sheet management
  createSheet: (name?: string) => string
  deleteSheet: (id: string) => void
  renameSheet: (id: string, name: string) => void
  setActiveSheet: (id: string) => void

  // Cell operations
  updateCell: (position: CellPosition, data: Partial<CellData>) => void

  // Selection
  setSelectedCell: (position: CellPosition | null) => void
  setSelectedRange: (range: CellRange | null) => void

  // Formula bar
  setFormulaValue: (value: string | undefined) => void

  // Context menu
  setContextMenu: (data: ContextMenuData | null) => void

  // Clipboard operations
  copySelection: () => void
  pasteSelection: () => void
  clearSelection: () => void

  // Row/Column operations
  insertRow: (above: boolean) => void
  insertColumn: (left: boolean) => void
  deleteRow: () => void
  deleteColumn: () => void

  // History
  undo: () => void
  redo: () => void

  // Formatting
  formatCells: (format: Partial<CellFormat>) => void

  // File operations
  exportSheet: (sheetId: string) => void
  importSheet: (file: File) => void

  // Label operations
  addLabel: (sheetId: string, label: Omit<SpreadsheetLabel, "id" | "timestamp">) => void
  updateLabel: (sheetId: string, labelId: string, updates: Partial<SpreadsheetLabel>) => void
  removeLabel: (sheetId: string, labelId: string) => void
}

type SpreadsheetStore = SpreadsheetState & SpreadsheetActions

export const useSpreadsheetStore = createWithEqualityFn<SpreadsheetStore>(
  (set, get) => ({
    // Initial state
    sheets: [
      {
        id: generateId(),
        name: "Sheet1",
        cells: {},
        labels: [],
      },
    ],
    activeSheetId: "",
    selectedCell: null,
    selectedRange: null,
    formulaValue: undefined,
    contextMenu: null,
    clipboard: [],
    history: [],
    historyIndex: -1,

    // Actions
    createSheet: (name?: string) => {
      let newSheetId: string = ""
      set((state) => {
        const sheetName = name || `Sheet${state.sheets.length + 1}`
        const newSheet: Sheet = { id: generateId(), name: sheetName, cells: {}, labels: [] }
        newSheetId = newSheet.id
        return {
          ...state,
          sheets: [...state.sheets, newSheet],
          activeSheetId: newSheet.id,
        }
      })
      return newSheetId
    },

    deleteSheet: (id: string) => {
      set((state) => {
        if (state.sheets.length <= 1) return state

        const newSheets = state.sheets.filter((s) => s.id !== id)
        const newActiveSheetId = state.activeSheetId === id ? newSheets[0].id : state.activeSheetId

        return {
          ...state,
          sheets: newSheets,
          activeSheetId: newActiveSheetId,
        }
      })
    },

    renameSheet: (id: string, name: string) => {
      set((state) => ({
        ...state,
        sheets: state.sheets.map((s) => (s.id === id ? { ...s, name } : s)),
      }))
    },

    setActiveSheet: (id: string) => {
      set((state) => ({
        ...state,
        activeSheetId: id,
        selectedCell: null,
        selectedRange: null,
      }))
    },

    updateCell: (position: CellPosition, data: Partial<CellData>) => {
      set((state) => {
        const activeSheet = state.sheets.find((s) => s.id === state.activeSheetId)
        if (!activeSheet) return state

        const cellKey = getCellKey(position)
        const currentCell = activeSheet.cells[cellKey] || {}

        // Evaluate formula if value starts with =
        let processedValue = data.value
        let originalFormula = data.formula || data.value
        
        if (data.value?.startsWith("=")) {
          try {
            // Create allSheets object from current state
            const allSheets: { [sheetName: string]: { [key: string]: CellData } } = {}
            state.sheets.forEach(sheet => {
              allSheets[sheet.name] = sheet.cells
            })
            
            originalFormula = data.value
            processedValue = evaluateFormula(data.value, activeSheet.cells, activeSheet.name, allSheets).toString()
          } catch (error) {
            processedValue = "#ERROR!"
          }
        }

        const updatedCell = {
          ...currentCell,
          ...data,
          value: processedValue || data.value,
          formula: data.value?.startsWith("=") ? originalFormula : undefined,
        }

        const updatedCells = { ...activeSheet.cells, [cellKey]: updatedCell }

        const updatedSheet = { ...activeSheet, cells: updatedCells }

        const updatedSheets = state.sheets.map((sheet) => (sheet.id === activeSheet.id ? updatedSheet : sheet))

        // Save to history
        const newHistory = state.history.slice(0, state.historyIndex + 1)
        newHistory.push({
          sheets: JSON.parse(JSON.stringify(updatedSheets)),
          activeSheetId: state.activeSheetId,
        })
        const limitedHistory = newHistory.slice(-50)

        return {
          ...state,
          sheets: updatedSheets,
          history: limitedHistory,
          historyIndex: Math.min(limitedHistory.length - 1, 49),
        }
      })
    },

    setSelectedCell: (position: CellPosition | null) => {
      set((state) => ({ ...state, selectedCell: position }))
    },

    setSelectedRange: (range: CellRange | null) => {
      set((state) => ({ ...state, selectedRange: range }))
    },

    setFormulaValue: (value: string | undefined) => {
      set((state) => ({ ...state, formulaValue: value }))
    },

    setContextMenu: (data: ContextMenuData | null) => {
      set((state) => ({ ...state, contextMenu: data }))
    },

    copySelection: () => {
      set((state) => {
        const activeSheet = state.sheets.find((s) => s.id === state.activeSheetId)
        if (!activeSheet) return state

        const clipboard: { data: CellData; position: CellPosition }[] = []

        if (state.selectedRange) {
          for (let row = state.selectedRange.start.row; row <= state.selectedRange.end.row; row++) {
            for (let col = state.selectedRange.start.col; col <= state.selectedRange.end.col; col++) {
              const position = { row, col }
              const cellKey = getCellKey(position)
              const cellData = activeSheet.cells[cellKey]
              if (cellData) {
                clipboard.push({ data: cellData, position })
              }
            }
          }
        } else if (state.selectedCell) {
          const cellKey = getCellKey(state.selectedCell)
          const cellData = activeSheet.cells[cellKey]
          if (cellData) {
            clipboard.push({ data: cellData, position: state.selectedCell })
          }
        }

        return { ...state, clipboard }
      })
    },

    pasteSelection: () => {
      set((state) => {
        if (!state.selectedCell || state.clipboard.length === 0) return state

        const activeSheet = state.sheets.find((s) => s.id === state.activeSheetId)
        if (!activeSheet) return state

        const baseRow = state.selectedCell.row
        const baseCol = state.selectedCell.col
        const clipboardBaseRow = state.clipboard[0].position.row
        const clipboardBaseCol = state.clipboard[0].position.col

        const updatedCells = { ...activeSheet.cells }

        state.clipboard.forEach(({ data, position }) => {
          const newRow = baseRow + (position.row - clipboardBaseRow)
          const newCol = baseCol + (position.col - clipboardBaseCol)
          const newPosition = { row: newRow, col: newCol }
          const cellKey = getCellKey(newPosition)

          updatedCells[cellKey] = { ...data }
        })

        const updatedSheet = { ...activeSheet, cells: updatedCells }
        const updatedSheets = state.sheets.map((sheet) => (sheet.id === activeSheet.id ? updatedSheet : sheet))

        return { ...state, sheets: updatedSheets }
      })
    },

    clearSelection: () => {
      set((state) => {
        const activeSheet = state.sheets.find((s) => s.id === state.activeSheetId)
        if (!activeSheet) return state

        const updatedCells = { ...activeSheet.cells }

        if (state.selectedRange) {
          for (let row = state.selectedRange.start.row; row <= state.selectedRange.end.row; row++) {
            for (let col = state.selectedRange.start.col; col <= state.selectedRange.end.col; col++) {
              const cellKey = getCellKey({ row, col })
              delete updatedCells[cellKey]
            }
          }
        } else if (state.selectedCell) {
          const cellKey = getCellKey(state.selectedCell)
          delete updatedCells[cellKey]
        }

        const updatedSheet = { ...activeSheet, cells: updatedCells }
        const updatedSheets = state.sheets.map((sheet) => (sheet.id === activeSheet.id ? updatedSheet : sheet))

        return { ...state, sheets: updatedSheets }
      })
    },

    insertRow: (above: boolean) => {
      set((state) => {
        if (!state.selectedCell) return state

        const activeSheet = state.sheets.find((s) => s.id === state.activeSheetId)
        if (!activeSheet) return state

        const insertRow = above ? state.selectedCell.row : state.selectedCell.row + 1
        const newCells: { [key: string]: CellData } = {}

        Object.entries(activeSheet.cells).forEach(([key, data]) => {
          const [rowStr, colStr] = key.split("-")
          const row = Number.parseInt(rowStr)
          const col = Number.parseInt(colStr)

          if (row >= insertRow) {
            const newKey = getCellKey({ row: row + 1, col })
            newCells[newKey] = data
          } else {
            newCells[key] = data
          }
        })

        const updatedSheet = { ...activeSheet, cells: newCells }
        const updatedSheets = state.sheets.map((sheet) => (sheet.id === activeSheet.id ? updatedSheet : sheet))

        return { ...state, sheets: updatedSheets }
      })
    },

    insertColumn: (left: boolean) => {
      set((state) => {
        if (!state.selectedCell) return state

        const activeSheet = state.sheets.find((s) => s.id === state.activeSheetId)
        if (!activeSheet) return state

        const insertCol = left ? state.selectedCell.col : state.selectedCell.col + 1
        const newCells: { [key: string]: CellData } = {}

        Object.entries(activeSheet.cells).forEach(([key, data]) => {
          const [rowStr, colStr] = key.split("-")
          const row = Number.parseInt(rowStr)
          const col = Number.parseInt(colStr)

          if (col >= insertCol) {
            const newKey = getCellKey({ row, col: col + 1 })
            newCells[newKey] = data
          } else {
            newCells[key] = data
          }
        })

        const updatedSheet = { ...activeSheet, cells: newCells }
        const updatedSheets = state.sheets.map((sheet) => (sheet.id === activeSheet.id ? updatedSheet : sheet))

        return { ...state, sheets: updatedSheets }
      })
    },

    deleteRow: () => {
      set((state) => {
        if (!state.selectedCell) return state

        const activeSheet = state.sheets.find((s) => s.id === state.activeSheetId)
        if (!activeSheet) return state

        const deleteRowNum = state.selectedCell.row
        const newCells: { [key: string]: CellData } = {}

        Object.entries(activeSheet.cells).forEach(([key, data]) => {
          const [rowStr, colStr] = key.split("-")
          const row = Number.parseInt(rowStr)
          const col = Number.parseInt(colStr)

          if (row < deleteRowNum) {
            newCells[key] = data
          } else if (row > deleteRowNum) {
            const newKey = getCellKey({ row: row - 1, col })
            newCells[newKey] = data
          }
        })

        const updatedSheet = { ...activeSheet, cells: newCells }
        const updatedSheets = state.sheets.map((sheet) => (sheet.id === activeSheet.id ? updatedSheet : sheet))

        return { ...state, sheets: updatedSheets }
      })
    },

    deleteColumn: () => {
      set((state) => {
        if (!state.selectedCell) return state

        const activeSheet = state.sheets.find((s) => s.id === state.activeSheetId)
        if (!activeSheet) return state

        const deleteColNum = state.selectedCell.col
        const newCells: { [key: string]: CellData } = {}

        Object.entries(activeSheet.cells).forEach(([key, data]) => {
          const [rowStr, colStr] = key.split("-")
          const row = Number.parseInt(rowStr)
          const col = Number.parseInt(colStr)

          if (col < deleteColNum) {
            newCells[key] = data
          } else if (col > deleteColNum) {
            const newKey = getCellKey({ row, col: col - 1 })
            newCells[newKey] = data
          }
        })

        const updatedSheet = { ...activeSheet, cells: newCells }
        const updatedSheets = state.sheets.map((sheet) => (sheet.id === activeSheet.id ? updatedSheet : sheet))

        return { ...state, sheets: updatedSheets }
      })
    },

    undo: () => {
      set((state) => {
        if (state.historyIndex > 0) {
          const previousState = state.history[state.historyIndex - 1]
          return {
            ...state,
            sheets: previousState.sheets,
            activeSheetId: previousState.activeSheetId,
            historyIndex: state.historyIndex - 1,
          }
        }
        return state
      })
    },

    redo: () => {
      set((state) => {
        if (state.historyIndex < state.history.length - 1) {
          const nextState = state.history[state.historyIndex + 1]
          return {
            ...state,
            sheets: nextState.sheets,
            activeSheetId: nextState.activeSheetId,
            historyIndex: state.historyIndex + 1,
          }
        }
        return state
      })
    },

    formatCells: (format: Partial<CellFormat>) => {
      set((state) => {
        const activeSheet = state.sheets.find((s) => s.id === state.activeSheetId)
        if (!activeSheet) return state

        const positions: CellPosition[] = []

        if (state.selectedRange) {
          for (let row = state.selectedRange.start.row; row <= state.selectedRange.end.row; row++) {
            for (let col = state.selectedRange.start.col; col <= state.selectedRange.end.col; col++) {
              positions.push({ row, col })
            }
          }
        } else if (state.selectedCell) {
          positions.push(state.selectedCell)
        }

        const updatedCells = { ...activeSheet.cells }

        positions.forEach((position) => {
          const cellKey = getCellKey(position)
          const currentCell = updatedCells[cellKey] || {}
          updatedCells[cellKey] = {
            ...currentCell,
            format: { ...currentCell.format, ...format },
          }
        })

        const updatedSheet = { ...activeSheet, cells: updatedCells }
        const updatedSheets = state.sheets.map((sheet) => (sheet.id === activeSheet.id ? updatedSheet : sheet))

        return { ...state, sheets: updatedSheets }
      })
    },

    exportSheet: (sheetId: string) => {
      const state = get()
      const sheet = state.sheets.find((s) => s.id === sheetId)
      if (!sheet) return

      const rows: string[][] = []
      const maxRow = Math.max(...Object.keys(sheet.cells).map((key) => Number.parseInt(key.split("-")[0])), 0)
      const maxCol = Math.max(...Object.keys(sheet.cells).map((key) => Number.parseInt(key.split("-")[1])), 0)

      for (let row = 0; row <= maxRow; row++) {
        const rowData: string[] = []
        for (let col = 0; col <= maxCol; col++) {
          const cellKey = getCellKey({ row, col })
          const cellData = sheet.cells[cellKey]
          rowData.push(cellData?.value || "")
        }
        rows.push(rowData)
      }

      const csvContent = rows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")
      const blob = new Blob([csvContent], { type: "text/csv" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${sheet.name}.csv`
      a.click()
      URL.revokeObjectURL(url)

      return
    },

    importSheet: (file: File) => {
      const fileExtension = file.name.split(".").pop()?.toLowerCase()

      if (fileExtension === "xlsx" || fileExtension === "xls") {
        // Handle Excel files - clear all sheets and import the entire workbook
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer)
            const workbook = XLSX.read(data, { type: "array" })

            const newSheets: Sheet[] = []

            // Process each worksheet in the Excel file
            workbook.SheetNames.forEach((sheetName, index) => {
              const worksheet = workbook.Sheets[sheetName]
              const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                header: 1,
                defval: "",
                raw: false, // This ensures dates and numbers are formatted as strings
              }) as string[][]

              const newSheet: Sheet = {
                id: generateId(),
                name: sheetName || `Sheet${index + 1}`,
                cells: {},
                labels: [],
              }

              // Convert the JSON data to our cell format
              jsonData.forEach((row, rowIndex) => {
                row.forEach((cellValue, colIndex) => {
                  if (cellValue !== null && cellValue !== undefined && cellValue !== "") {
                    const cellKey = getCellKey({ row: rowIndex, col: colIndex })

                    // Handle different data types from Excel
                    const processedValue = String(cellValue)

                    // Check if it's a formula (starts with =)
                    const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex })
                    const cellObject = worksheet[cellRef]

                    if (cellObject && cellObject.f) {
                      // It's a formula
                      newSheet.cells[cellKey] = {
                        value: processedValue,
                        formula: "=" + cellObject.f,
                      }
                    } else {
                      // Regular value
                      newSheet.cells[cellKey] = { value: processedValue }
                    }
                  }
                })
              })

              newSheets.push(newSheet)
            })

            // Clear all existing sheets and replace with imported ones
            set((state) => ({
              ...state,
              sheets: newSheets.length > 0 ? newSheets : [{ id: generateId(), name: "Sheet1", cells: {}, labels: [] }],
              activeSheetId: newSheets.length > 0 ? newSheets[0].id : generateId(),
              selectedCell: null,
              selectedRange: null,
            }))
          } catch (error) {
            console.error("Error importing Excel file:", error)
            // You could add a toast notification here
          }
        }
        reader.readAsArrayBuffer(file)
      } else {
        // Handle CSV files - add as new sheet to existing project
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const content = e.target?.result as string
            const rows = content.split("\n").map((row) => {
              // Better CSV parsing to handle quoted values
              const result = []
              let current = ""
              let inQuotes = false

              for (let i = 0; i < row.length; i++) {
                const char = row[i]
                if (char === '"') {
                  inQuotes = !inQuotes
                } else if (char === "," && !inQuotes) {
                  result.push(current.trim())
                  current = ""
                } else {
                  current += char
                }
              }
              result.push(current.trim())
              return result
            })

            const newSheet: Sheet = {
              id: generateId(),
              name: file.name.replace(/\.[^/.]+$/, ""),
              cells: {},
              labels: [],
            }

            rows.forEach((row, rowIndex) => {
              row.forEach((cell, colIndex) => {
                if (cell && cell.trim()) {
                  const cellKey = getCellKey({ row: rowIndex, col: colIndex })
                  newSheet.cells[cellKey] = { value: cell.trim() }
                }
              })
            })

            // Add as new sheet to existing project
            set((state) => ({
              ...state,
              sheets: [...state.sheets, newSheet],
              activeSheetId: newSheet.id,
            }))
          } catch (error) {
            console.error("Error importing CSV file:", error)
          }
        }
        reader.readAsText(file)
      }

      return
    },

    addLabel: (sheetId: string, label: Omit<SpreadsheetLabel, "id" | "timestamp">) => {
      set((state) => {
        // Find the sheet and extract data for the label range
        const sheet = state.sheets.find(s => s.id === sheetId)
        if (!sheet) return state

        // Extract actual cell data within the label range
        const labelData: { [cellKey: string]: any } = {}
        for (let row = label.startRow; row <= label.endRow; row++) {
          for (let col = label.startCol; col <= label.endCol; col++) {
            const cellKey = getCellKey({ row, col })
            if (sheet.cells[cellKey]) {
              labelData[cellKey] = sheet.cells[cellKey]
            }
          }
        }

        const newLabel: SpreadsheetLabel = {
          ...label,
          id: generateId(),
          timestamp: new Date(),
          data: labelData
        }

        const updatedSheets = state.sheets.map((sheet) =>
          sheet.id === sheetId ? { ...sheet, labels: [...(sheet.labels || []), newLabel] } : sheet,
        )

        return { ...state, sheets: updatedSheets }
      })
    },

    updateLabel: (sheetId: string, labelId: string, updates: Partial<SpreadsheetLabel>) => {
      set((state) => {
        const updatedSheets = state.sheets.map((sheet) =>
          sheet.id === sheetId
            ? {
                ...sheet,
                labels: (sheet.labels || []).map((label) => (label.id === labelId ? { ...label, ...updates } : label)),
              }
            : sheet,
        )

        return { ...state, sheets: updatedSheets }
      })
    },

    removeLabel: (sheetId: string, labelId: string) => {
      set((state) => {
        const updatedSheets = state.sheets.map((sheet) =>
          sheet.id === sheetId ? { ...sheet, labels: (sheet.labels || []).filter((label) => label.id !== labelId) } : sheet,
        )

        return { ...state, sheets: updatedSheets }
      })
    },
  }),
  shallow,
)

// Initialize activeSheetId
const store = useSpreadsheetStore.getState()
if (!store.activeSheetId && store.sheets.length > 0) {
  useSpreadsheetStore.setState({ activeSheetId: store.sheets[0].id })
}

// Selector hooks for better performance
export const useActiveSheet = () => {
  const sheets = useSpreadsheetStore((state) => state.sheets)
  const activeSheetId = useSpreadsheetStore((state) => state.activeSheetId)
  return sheets.find((s) => s.id === activeSheetId)
}

export const useCanUndoRedo = () => {
  return useSpreadsheetStore((state) => ({
    canUndo: state.historyIndex > 0,
    canRedo: state.historyIndex < state.history.length - 1,
  }))
}

// This hook is the key to our performance fix.
// It subscribes ONLY to the active sheet's cells.
// It will only cause a re-render if the 'cells' object of the
// active sheet is replaced with a new one.
export const useActiveSheetCells = () => {
  return useSpreadsheetStore((state) => {
    const activeSheet = state.sheets.find((s) => s.id === state.activeSheetId)
    return activeSheet?.cells || {}
  }, shallow) // Use shallow comparison for performance
}
