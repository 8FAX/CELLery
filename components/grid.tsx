"use client"

import React, { useCallback, useMemo, useRef, useState, useEffect } from "react"
import { FixedSizeGrid as Grid } from "react-window"
import { Cell } from "./cell"
import type { CellPosition, CellRange, ContextMenuData } from "@/types/spreadsheet"
import { getColumnLabel, getCellKey } from "@/utils/spreadsheet"
import { useSpreadsheetStore, useActiveSheetCells } from "@/stores/spreadsheet-store"
import { SpreadsheetLabels } from "./spreadsheet-labels"

interface GridProps {
  onCellEdit: (position: CellPosition, value: string) => void
}

const CELL_WIDTH = 80
const CELL_HEIGHT = 24
const HEADER_HEIGHT = 24
const ROW_HEADER_WIDTH = 48
const ROWS = 1000
const COLS = 50

interface CellRendererProps {
  columnIndex: number
  rowIndex: number
  style: React.CSSProperties
  data: {
    cells: { [key: string]: any }
    onCellSelect: (position: CellPosition) => void
    onRangeSelect: (range: CellRange | null) => void
    onCellEdit: (position: CellPosition, value: string) => void
    onContextMenu: (data: ContextMenuData | null) => void
    onCellMouseDown: (position: CellPosition, e: React.MouseEvent) => void
    onCellMouseEnter: (position: CellPosition) => void
  }
}

const CellRenderer = React.memo(({ columnIndex, rowIndex, style, data }: CellRendererProps) => {
  const position = { row: rowIndex, col: columnIndex }
  const cellKey = getCellKey(position)
  const cellData = data.cells[cellKey]

  const handleClick = useCallback(
    (pos: CellPosition, e: React.MouseEvent) => {
      e.preventDefault()
      data.onCellSelect(pos)
      data.onRangeSelect(null)
    },
    [data.onCellSelect, data.onRangeSelect],
  )

  const handleContextMenu = useCallback(
    (pos: CellPosition, e: React.MouseEvent) => {
      e.preventDefault()
      data.onContextMenu({
        x: e.clientX,
        y: e.clientY,
        type: "cell",
        position: pos,
      })
    },
    [data.onContextMenu],
  )

  return (
    <div style={style}>
      <Cell
        position={position}
        data={cellData}
        onClick={handleClick}
        onMouseDown={data.onCellMouseDown}
        onMouseEnter={data.onCellMouseEnter}
        onContextMenu={handleContextMenu}
        onEdit={data.onCellEdit}
      />
    </div>
  )
})

CellRenderer.displayName = "CellRenderer"

export function SpreadsheetGrid({ onCellEdit }: GridProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<Grid>(null)
  const columnHeaderRef = useRef<HTMLDivElement>(null)
  const rowHeaderRef = useRef<HTMLDivElement>(null)

  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<CellPosition | null>(null)
  const [scrollPosition, setScrollPosition] = useState({ scrollLeft: 0, scrollTop: 0 })

  const activeSheetCells = useActiveSheetCells()
  const setSelectedCell = useSpreadsheetStore((state) => state.setSelectedCell)
  const setSelectedRange = useSpreadsheetStore((state) => state.setSelectedRange)
  const setContextMenu = useSpreadsheetStore((state) => state.setContextMenu)

  const addLabel = useSpreadsheetStore((state) => state.addLabel)
  const updateLabel = useSpreadsheetStore((state) => state.updateLabel)
  const removeLabel = useSpreadsheetStore((state) => state.removeLabel)
  const activeSheetId = useSpreadsheetStore((state) => state.activeSheetId)
  const activeSheet = useSpreadsheetStore((state) => state.sheets.find((s) => s.id === state.activeSheetId))

  // Handle container resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setContainerSize({
          width: rect.width,
          height: rect.height,
        })
      }
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Handle scroll synchronization
  const handleGridScroll = useCallback(({ scrollLeft, scrollTop }: { scrollLeft: number; scrollTop: number }) => {
    if (columnHeaderRef.current) {
      columnHeaderRef.current.scrollLeft = scrollLeft
    }
    if (rowHeaderRef.current) {
      rowHeaderRef.current.scrollTop = scrollTop
    }
    // Update scroll position state for labels
    setScrollPosition({ scrollLeft, scrollTop })
  }, [])

  const handleCellMouseDown = useCallback(
    (position: CellPosition, e: React.MouseEvent) => {
      if (e.button === 0) {
        setDragStart(position)
        setIsDragging(true)
        setSelectedCell(position)
        setSelectedRange(null)
      }
    },
    [setSelectedCell, setSelectedRange],
  )

  const handleCellMouseEnter = useCallback(
    (position: CellPosition) => {
      if (isDragging && dragStart) {
        const range: CellRange = {
          start: {
            row: Math.min(dragStart.row, position.row),
            col: Math.min(dragStart.col, position.col),
          },
          end: {
            row: Math.max(dragStart.row, position.row),
            col: Math.max(dragStart.col, position.col),
          },
        }
        setSelectedRange(range)
      }
    },
    [isDragging, dragStart, setSelectedRange],
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setDragStart(null)
  }, [])

  useEffect(() => {
    document.addEventListener("mouseup", handleMouseUp)
    return () => document.removeEventListener("mouseup", handleMouseUp)
  }, [handleMouseUp])

  const gridData = useMemo(
    () => ({
      cells: activeSheetCells, // Use the direct cells object
      onCellSelect: setSelectedCell,
      onRangeSelect: setSelectedRange,
      onCellEdit,
      onContextMenu: setContextMenu,
      onCellMouseDown: handleCellMouseDown,
      onCellMouseEnter: handleCellMouseEnter,
    }),
    [
      activeSheetCells, // The key dependency is now the optimized cells object
      setSelectedCell,
      setSelectedRange,
      onCellEdit,
      setContextMenu,
      handleCellMouseDown,
      handleCellMouseEnter,
    ],
  )

  if (!activeSheetCells) return null

  const gridWidth = containerSize.width - ROW_HEADER_WIDTH
  const gridHeight = containerSize.height - HEADER_HEIGHT

  return (
    <div className="h-full w-full flex flex-col bg-white" ref={containerRef}>
      {/* Column Headers */}
      <div className="flex sticky top-0 z-20 bg-gray-100 border-b border-gray-300">
        <div
          className="bg-gray-200 border-r border-gray-300 flex-shrink-0"
          style={{ width: ROW_HEADER_WIDTH, height: HEADER_HEIGHT }}
        ></div>
        <div ref={columnHeaderRef} className="flex-1 overflow-hidden" style={{ height: HEADER_HEIGHT }}>
          <div className="flex" style={{ width: COLS * CELL_WIDTH }}>
            {Array.from({ length: COLS }, (_, col) => (
              <div
                key={col}
                className="bg-gray-100 border-r border-gray-300 flex items-center justify-center text-xs font-medium flex-shrink-0"
                style={{ width: CELL_WIDTH, height: HEADER_HEIGHT }}
              >
                {getColumnLabel(col)}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Row Headers */}
        <div
          className="bg-gray-100 border-r border-gray-300 sticky left-0 z-10 flex-shrink-0"
          style={{ width: ROW_HEADER_WIDTH }}
        >
          <div ref={rowHeaderRef} className="overflow-hidden" style={{ height: gridHeight }}>
            <div style={{ height: ROWS * CELL_HEIGHT }}>
              {Array.from({ length: ROWS }, (_, row) => (
                <div
                  key={row}
                  className="bg-gray-100 border-b border-gray-300 flex items-center justify-center text-xs font-medium"
                  style={{ height: CELL_HEIGHT, width: ROW_HEADER_WIDTH }}
                >
                  {row + 1}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Virtualized Grid */}
        <div className="flex-1">
          <Grid
            ref={gridRef}
            columnCount={COLS}
            rowCount={ROWS}
            columnWidth={CELL_WIDTH}
            rowHeight={CELL_HEIGHT}
            height={gridHeight}
            width={gridWidth}
            itemData={gridData}
            overscanRowCount={5}
            overscanColumnCount={5}
            onScroll={handleGridScroll}
          >
            {CellRenderer}
          </Grid>
        </div>
      </div>
      {/* Spreadsheet Labels Overlay */}
      <SpreadsheetLabels
        labels={activeSheet?.labels || []}
        onAddLabel={(label) => addLabel(activeSheetId, label)}
        onUpdateLabel={(labelId, updates) => updateLabel(activeSheetId, labelId, updates)}
        onRemoveLabel={(labelId) => removeLabel(activeSheetId, labelId)}
        onCellEdit={(row, col, value) => onCellEdit({ row, col }, value)}
        onCellClick={(row, col) => setSelectedCell({ row, col })}
        getCellValue={(row, col) => {
          const cellKey = getCellKey({ row, col })
          return activeSheetCells[cellKey]?.value || ""
        }}
        cellWidth={CELL_WIDTH}
        cellHeight={CELL_HEIGHT}
        headerHeight={HEADER_HEIGHT}
        headerWidth={ROW_HEADER_WIDTH}
        maxRows={ROWS}
        maxCols={COLS}
        scrollPosition={scrollPosition}
      />
    </div>
  )
}
