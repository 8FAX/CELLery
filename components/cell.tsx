"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback, memo, useMemo } from "react"
import { useSpreadsheetStore } from "@/stores/spreadsheet-store"
import type { CellData, CellPosition } from "@/types/spreadsheet"
import { formatCellValue } from "@/utils/formatting"

interface CellActionProps {
  onClick: (position: CellPosition, e: React.MouseEvent) => void
  onMouseDown: (position: CellPosition, e: React.MouseEvent) => void
  onMouseEnter: (position: CellPosition) => void
  onContextMenu: (position: CellPosition, e: React.MouseEvent) => void
  onEdit: (position: CellPosition, value: string) => void
}

interface CellProps extends CellActionProps {
  position: CellPosition
  data?: CellData
}

function CellComponent({ position, data, onClick, onMouseDown, onMouseEnter, onContextMenu, onEdit }: CellProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  // *** THE KEY OPTIMIZATION ***
  // The cell subscribes directly to the store to get its selection status.
  // We use a selector with `useCallback` to prevent re-renders unless the
  // selection status for this specific cell actually changes.
  const { isSelected, isInRange } = useSpreadsheetStore(
    useCallback(
      (state) => {
        const isSelected = state.selectedCell?.row === position.row && state.selectedCell?.col === position.col
        const isInRange = state.selectedRange
          ? position.row >= state.selectedRange.start.row &&
            position.row <= state.selectedRange.end.row &&
            position.col >= state.selectedRange.start.col &&
            position.col <= state.selectedRange.end.col
          : false
        return { isSelected, isInRange }
      },
      [position.row, position.col], // Dependencies ensure the selector is stable for this cell
    ),
  )

  const displayValue = data?.value || ""
  const formattedValue = useMemo(() => formatCellValue(displayValue, data?.format), [displayValue, data?.format])

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true)
    // Use the raw value for editing, not the formatted one
    setEditValue(data?.formula || displayValue)
  }, [displayValue, data?.formula])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        onEdit(position, editValue)
        setIsEditing(false)
      } else if (e.key === "Escape") {
        setIsEditing(false)
        setEditValue("")
      }
    },
    [editValue, onEdit, position],
  )

  const handleBlur = useCallback(() => {
    if (isEditing) {
      onEdit(position, editValue)
      setIsEditing(false)
    }
  }, [isEditing, editValue, onEdit, position])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  // Style calculation is now self-contained within the cell
  const cellStyle = useMemo(
    () => ({
      // Selection styling is prioritized
      backgroundColor: isSelected
        ? "#1976d2" // a nice blue for selection
        : isInRange
          ? "rgba(25, 118, 210, 0.1)" // a light blue for range
          : data?.format?.backgroundColor || "white", // cell's own format or default
      color: isSelected ? "white" : data?.format?.color || "black",
      // Other formatting
      fontWeight: data?.format?.bold ? "bold" : "normal",
      fontStyle: data?.format?.italic ? "italic" : "normal",
      textDecoration: data?.format?.underline ? "underline" : "none",
      fontSize: data?.format?.fontSize ? `${data.format.fontSize}px` : "12px",
      // Add borders for the grid lines
      borderRight: "1px solid #e0e0e0",
      borderBottom: "1px solid #e0e0e0",
      // Add a stronger border to the selected cell for emphasis
      outline: isSelected ? "2px solid #1976d2" : "none",
      outlineOffset: "-1px",
      zIndex: isSelected ? 10 : 1, // Ensure selected cell outline is on top
    }),
    [data?.format, isSelected, isInRange],
  )

  return (
    <div
      className="w-full h-full relative cursor-cell select-none"
      style={cellStyle}
      onClick={(e) => onClick(position, e)}
      onMouseDown={(e) => onMouseDown(position, e)}
      onMouseEnter={() => onMouseEnter(position)}
      onDoubleClick={handleDoubleClick}
      onContextMenu={(e) => onContextMenu(position, e)}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          // The input should inherit text styles but have a solid background
          className="w-full h-full p-1 text-xs border-none outline-none"
          style={{
            fontSize: "inherit",
            fontWeight: "inherit",
            fontStyle: "inherit",
            backgroundColor: "white", // Ensure readability while editing
            color: "black",
          }}
        />
      ) : (
        <div className="w-full h-full px-1 flex items-center text-xs overflow-hidden whitespace-nowrap">
          {formattedValue || (data?.error ? <span className="text-red-500 italic">{data.error}</span> : "")}
        </div>
      )}
    </div>
  )
}

// Memoize the component to prevent re-renders when its own props haven't changed.
export const Cell = memo(CellComponent)
