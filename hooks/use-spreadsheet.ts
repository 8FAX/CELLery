"use client"

import { useState, useCallback, useMemo } from "react"
import type { Sheet, CellData, CellPosition, CellRange, ContextMenuData, CellFormat } from "@/types/spreadsheet"
import { getCellKey, generateId } from "@/utils/spreadsheet"
import { evaluateFormula } from "@/utils/formula"

interface SpreadsheetState {
  sheets: Sheet[]
  activeSheetId: string
  selectedCell: CellPosition | null
  selectedRange: CellRange | null
  formulaValue?: string
  contextMenu: ContextMenuData | null
  clipboard: { data: CellData; position: CellPosition }[]
  history: SpreadsheetState[]
  historyIndex: number
}

export function useSpreadsheet() {
  const [sheets, setSheets] = useState<Sheet[]>(() => [
    {
      id: generateId(),
      name: "Sheet1",
      cells: {},
      labels: [],
    },
  ])

  const [activeSheetId, setActiveSheetIdState] = useState(() => sheets[0]?.id || "")
  const [selectedCell, setSelectedCell] = useState<CellPosition | null>(null)
  const [selectedRange, setSelectedRange] = useState<CellRange | null>(null)
  const [formulaValue, setFormulaValue] = useState<string | undefined>(undefined)
  const [contextMenu, setContextMenu] = useState<ContextMenuData | null>(null)
  const [clipboard, setClipboard] = useState<{ data: CellData; position: CellPosition }[]>([])
  const [history, setHistory] = useState<SpreadsheetState[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  const activeSheet = useMemo(() => sheets.find((s) => s.id === activeSheetId), [sheets, activeSheetId])

  const saveToHistory = useCallback(
    (newSheets: Sheet[]) => {
      setHistory((prev) => {
        const newState: SpreadsheetState = {
          sheets: newSheets,
          activeSheetId,
          selectedCell,
          selectedRange,
          formulaValue,
          contextMenu,
          clipboard,
          history: [],
          historyIndex: -1,
        }
        const newHistory = prev.slice(0, historyIndex + 1)
        newHistory.push({
          sheets,
          activeSheetId,
          selectedCell,
          selectedRange,
          formulaValue,
          contextMenu,
          clipboard,
          history: [],
          historyIndex: -1,
        })
        return newHistory.slice(-50)
      })
      setHistoryIndex((prev) => Math.min(prev + 1, 49))
    },
    [sheets, activeSheetId, selectedCell, selectedRange, formulaValue, contextMenu, clipboard, historyIndex],
  )

  const createSheet = useCallback(() => {
    const newSheet: Sheet = {
      id: generateId(),
      name: `Sheet${sheets.length + 1}`,
      cells: {},
      labels: [],
    }
    setSheets((prev) => [...prev, newSheet])
    setActiveSheetIdState(newSheet.id)
  }, [sheets.length])

  const deleteSheet = useCallback(
    (id: string) => {
      if (sheets.length <= 1) return

      setSheets((prev) => {
        const newSheets = prev.filter((s) => s.id !== id)
        if (activeSheetId === id) {
          setActiveSheetIdState(newSheets[0].id)
        }
        return newSheets
      })
    },
    [sheets.length, activeSheetId],
  )

  const renameSheet = useCallback((id: string, name: string) => {
    setSheets((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)))
  }, [])

  const setActiveSheet = useCallback((id: string) => {
    setActiveSheetIdState(id)
    setSelectedCell(null)
    setSelectedRange(null)
  }, [])

  const updateCell = useCallback(
    (position: CellPosition, data: Partial<CellData>) => {
      setSheets((prev) => {
        const newSheets = prev.map((sheet) => {
          if (sheet.id !== activeSheetId) return sheet

          const cellKey = getCellKey(position)
          const currentCell = sheet.cells[cellKey] || {}

          let processedValue = data.value
          if (data.value?.startsWith("=")) {
            try {
              // Create allSheets object from current sheets
              const allSheets: { [sheetName: string]: { [key: string]: CellData } } = {}
              prev.forEach(s => {
                allSheets[s.name] = s.cells
              })
              
              processedValue = evaluateFormula(data.value, sheet.cells, sheet.name, allSheets).toString()
            } catch (error) {
              processedValue = "#ERROR!"
            }
          }

          return {
            ...sheet,
            cells: {
              ...sheet.cells,
              [cellKey]: {
                ...currentCell,
                ...data,
                value: processedValue || data.value,
              },
            },
          }
        })

        saveToHistory(newSheets)
        return newSheets
      })
    },
    [activeSheetId, saveToHistory],
  )

  const setSelectedCellState = useCallback((position: CellPosition | null) => {
    setSelectedCell(position)
  }, [])

  const setSelectedRangeState = useCallback((range: CellRange | null) => {
    setSelectedRange(range)
  }, [])

  const setFormulaValueState = useCallback((value: string | undefined) => {
    setFormulaValue(value)
  }, [])

  const setContextMenuState = useCallback((data: ContextMenuData | null) => {
    setContextMenu(data)
  }, [])

  const copySelection = useCallback(() => {
    if (!activeSheet) return

    const newClipboard: { data: CellData; position: CellPosition }[] = []

    if (selectedRange) {
      for (let row = selectedRange.start.row; row <= selectedRange.end.row; row++) {
        for (let col = selectedRange.start.col; col <= selectedRange.end.col; col++) {
          const position = { row, col }
          const cellKey = getCellKey(position)
          const cellData = activeSheet.cells[cellKey]
          if (cellData) {
            newClipboard.push({ data: cellData, position })
          }
        }
      }
    } else if (selectedCell) {
      const cellKey = getCellKey(selectedCell)
      const cellData = activeSheet.cells[cellKey]
      if (cellData) {
        newClipboard.push({ data: cellData, position: selectedCell })
      }
    }

    setClipboard(newClipboard)
  }, [activeSheet, selectedRange, selectedCell])

  const pasteSelection = useCallback(() => {
    if (!selectedCell || clipboard.length === 0 || !activeSheet) return

    setSheets((prev) => {
      const newSheets = prev.map((sheet) => {
        if (sheet.id !== activeSheetId) return sheet

        const baseRow = selectedCell.row
        const baseCol = selectedCell.col
        const clipboardBaseRow = clipboard[0].position.row
        const clipboardBaseCol = clipboard[0].position.col

        const newCells = { ...sheet.cells }

        clipboard.forEach(({ data, position }) => {
          const newRow = baseRow + (position.row - clipboardBaseRow)
          const newCol = baseCol + (position.col - clipboardBaseCol)
          const newPosition = { row: newRow, col: newCol }
          const cellKey = getCellKey(newPosition)
          newCells[cellKey] = { ...data }
        })

        return { ...sheet, cells: newCells }
      })

      saveToHistory(newSheets)
      return newSheets
    })
  }, [selectedCell, clipboard, activeSheet, activeSheetId, saveToHistory])

  const clearSelection = useCallback(() => {
    if (!activeSheet) return

    setSheets((prev) => {
      const newSheets = prev.map((sheet) => {
        if (sheet.id !== activeSheetId) return sheet

        const newCells = { ...sheet.cells }

        if (selectedRange) {
          for (let row = selectedRange.start.row; row <= selectedRange.end.row; row++) {
            for (let col = selectedRange.start.col; col <= selectedRange.end.col; col++) {
              const cellKey = getCellKey({ row, col })
              delete newCells[cellKey]
            }
          }
        } else if (selectedCell) {
          const cellKey = getCellKey(selectedCell)
          delete newCells[cellKey]
        }

        return { ...sheet, cells: newCells }
      })

      saveToHistory(newSheets)
      return newSheets
    })
  }, [activeSheet, selectedRange, selectedCell, activeSheetId, saveToHistory])

  const insertRow = useCallback(
    (above: boolean) => {
      if (!activeSheet || !selectedCell) return

      setSheets((prevSheets) => {
        const newSheets = prevSheets.map((sheet) => {
          if (sheet.id !== activeSheetId) return sheet

          const insertRowIndex = above ? selectedCell.row : selectedCell.row + 1
          const newCells: { [key: string]: CellData } = {}

          Object.entries(sheet.cells).forEach(([key, data]) => {
            const [rowStr, colStr] = key.split("-")
            const row = Number.parseInt(rowStr)
            const col = Number.parseInt(colStr)

            if (row >= insertRowIndex) {
              const newKey = getCellKey({ row: row + 1, col })
              newCells[newKey] = data
            } else {
              newCells[key] = data
            }
          })

          return { ...sheet, cells: newCells }
        })

        saveToHistory(newSheets)
        return newSheets
      })
    },
    [activeSheet, selectedCell, activeSheetId, saveToHistory],
  )

  const insertColumn = useCallback(
    (left: boolean) => {
      if (!activeSheet || !selectedCell) return

      setSheets((prevSheets) => {
        const newSheets = prevSheets.map((sheet) => {
          if (sheet.id !== activeSheetId) return sheet

          const insertColIndex = left ? selectedCell.col : selectedCell.col + 1
          const newCells: { [key: string]: CellData } = {}

          Object.entries(sheet.cells).forEach(([key, data]) => {
            const [rowStr, colStr] = key.split("-")
            const row = Number.parseInt(rowStr)
            const col = Number.parseInt(colStr)

            if (col >= insertColIndex) {
              const newKey = getCellKey({ row, col: col + 1 })
              newCells[newKey] = data
            } else {
              newCells[key] = data
            }
          })

          return { ...sheet, cells: newCells }
        })

        saveToHistory(newSheets)
        return newSheets
      })
    },
    [activeSheet, selectedCell, activeSheetId, saveToHistory],
  )

  const deleteRowState = useCallback(() => {
    if (!activeSheet || !selectedCell) return

    setSheets((prevSheets) => {
      const newSheets = prevSheets.map((sheet) => {
        if (sheet.id !== activeSheetId) return sheet

        const deleteRowNum = selectedCell.row
        const newCells: { [key: string]: CellData } = {}

        Object.entries(sheet.cells).forEach(([key, data]) => {
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

        return { ...sheet, cells: newCells }
      })

      saveToHistory(newSheets)
      return newSheets
    })
  }, [activeSheet, selectedCell, activeSheetId, saveToHistory])

  const deleteColumnState = useCallback(() => {
    if (!activeSheet || !selectedCell) return

    setSheets((prevSheets) => {
      const newSheets = prevSheets.map((sheet) => {
        if (sheet.id !== activeSheetId) return sheet

        const deleteColNum = selectedCell.col
        const newCells: { [key: string]: CellData } = {}

        Object.entries(sheet.cells).forEach(([key, data]) => {
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

        return { ...sheet, cells: newCells }
      })

      saveToHistory(newSheets)
      return newSheets
    })
  }, [activeSheet, selectedCell, activeSheetId, saveToHistory])

  const undoState = useCallback(() => {
    if (historyIndex > 0) {
      const previousState = history[historyIndex - 1]
      setSheets(previousState.sheets)
      setActiveSheetIdState(previousState.activeSheetId)
      setSelectedCell(previousState.selectedCell)
      setSelectedRange(previousState.selectedRange)
      setFormulaValue(previousState.formulaValue)
      setContextMenu(previousState.contextMenu)
      setClipboard(previousState.clipboard)
      setHistoryIndex((prev) => prev - 1)
    }
  }, [history, historyIndex])

  const redoState = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1]
      setSheets(nextState.sheets)
      setActiveSheetIdState(nextState.activeSheetId)
      setSelectedCell(nextState.selectedCell)
      setSelectedRange(nextState.selectedRange)
      setFormulaValue(nextState.formulaValue)
      setContextMenu(nextState.contextMenu)
      setClipboard(nextState.clipboard)
      setHistoryIndex((prev) => prev + 1)
    }
  }, [history, historyIndex])

  const formatCellsState = useCallback(
    (format: Partial<CellFormat>) => {
      if (!activeSheet) return

      setSheets((prev) => {
        const newSheets = prev.map((sheet) => {
          if (sheet.id !== activeSheetId) return sheet

          const positions: CellPosition[] = []

          if (selectedRange) {
            for (let row = selectedRange.start.row; row <= selectedRange.end.row; row++) {
              for (let col = selectedRange.start.col; col <= selectedRange.end.col; col++) {
                positions.push({ row, col })
              }
            }
          } else if (selectedCell) {
            positions.push(selectedCell)
          }

          const newCells = { ...sheet.cells }
          positions.forEach((position) => {
            const cellKey = getCellKey(position)
            const currentCell = newCells[cellKey] || {}
            newCells[cellKey] = {
              ...currentCell,
              format: { ...currentCell.format, ...format },
            }
          })

          return { ...sheet, cells: newCells }
        })

        saveToHistory(newSheets)
        return newSheets
      })
    },
    [activeSheet, selectedRange, selectedCell, activeSheetId, saveToHistory],
  )

  const exportSheetState = useCallback(
    (sheetId: string) => {
      const sheet = sheets.find((s) => s.id === sheetId)
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
    },
    [sheets],
  )

  const importSheetState = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      const rows = content.split("\n").map((row) => row.split(",").map((cell) => cell.replace(/"/g, "")))

      const newSheet: Sheet = {
        id: generateId(),
        name: file.name.replace(/\.[^/.]+$/, ""),
        cells: {},
        labels: [],
      }

      rows.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
          if (cell.trim()) {
            const cellKey = getCellKey({ row: rowIndex, col: colIndex })
            newSheet.cells[cellKey] = { value: cell.trim() }
          }
        })
      })

      setSheets((prev) => [...prev, newSheet])
      setActiveSheetIdState(newSheet.id)
    }
    reader.readAsText(file)
  }, [])

  return {
    sheets,
    activeSheetId,
    selectedCell,
    selectedRange,
    formulaValue,
    contextMenu,
    createSheet,
    deleteSheet,
    renameSheet,
    setActiveSheet,
    updateCell,
    setSelectedCell: setSelectedCellState,
    setSelectedRange: setSelectedRangeState,
    setFormulaValue: setFormulaValueState,
    setContextMenu: setContextMenuState,
    copySelection,
    pasteSelection,
    clearSelection,
    insertRow,
    insertColumn,
    deleteRow: deleteRowState,
    deleteColumn: deleteColumnState,
    undo: undoState,
    redo: redoState,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    formatCells: formatCellsState,
    exportSheet: exportSheetState,
    importSheet: importSheetState,
  }
}
