"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { X, Tag, Edit, Grid } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import type { SpreadsheetLabel } from "@/types/spreadsheet"

interface Selection {
  startRow: number
  startCol: number
  endRow: number
  endCol: number
  isSelecting: boolean
}

interface ContextMenu {
  visible: boolean
  x: number
  y: number
  selection: Selection | null
}

interface SpreadsheetLabelsProps {
  labels: SpreadsheetLabel[]
  onAddLabel: (label: Omit<SpreadsheetLabel, "id" | "timestamp">) => void
  onUpdateLabel: (id: string, updates: Partial<SpreadsheetLabel>) => void
  onRemoveLabel: (id: string) => void
  onCellEdit?: (row: number, col: number, value: string) => void
  onCellClick: (row: number, col: number) => void
  getCellValue?: (row: number, col: number) => string
  onDeleteRows?: (rowIndexes: number[]) => void
  onDeleteColumns?: (colIndexes: number[]) => void
  onClearCells?: (selection: { start: { row: number; col: number }; end: { row: number; col: number } }) => void
  cellWidth: number
  cellHeight: number
  headerHeight: number
  headerWidth: number
  maxRows: number
  maxCols: number
  scrollPosition?: { scrollLeft: number; scrollTop: number }
}

const LABEL_COLORS = [
  "rgba(59, 130, 246, 0.2)", // blue
  "rgba(16, 185, 129, 0.2)", // green
  "rgba(245, 158, 11, 0.2)", // yellow
  "rgba(239, 68, 68, 0.2)", // red
  "rgba(168, 85, 247, 0.2)", // purple
  "rgba(236, 72, 153, 0.2)", // pink
  "rgba(14, 165, 233, 0.2)", // sky
  "rgba(34, 197, 94, 0.2)", // emerald
]

const getNormalizedSelection = (sel: Selection) => {
  return {
    startRow: Math.min(sel.startRow, sel.endRow),
    endRow: Math.max(sel.startRow, sel.endRow),
    startCol: Math.min(sel.startCol, sel.endCol),
    endCol: Math.max(sel.startCol, sel.endCol),
  }
}

export function SpreadsheetLabels({
  labels,
  onAddLabel,
  onUpdateLabel,
  onRemoveLabel,
  onCellEdit,
  onCellClick,
  getCellValue,
  onDeleteRows,
  onDeleteColumns,
  onClearCells,
  cellWidth,
  cellHeight,
  headerHeight,
  headerWidth,
  maxRows,
  maxCols,
  scrollPosition = { scrollLeft: 0, scrollTop: 0 },
}: SpreadsheetLabelsProps) {
  const [selection, setSelection] = useState<Selection | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenu>({
    visible: false,
    x: 0,
    y: 0,
    selection: null,
  })
  const [showLabelDialog, setShowLabelDialog] = useState(false)
  const [showMassEditDialog, setShowMassEditDialog] = useState(false)
  const [newLabelName, setNewLabelName] = useState("")
  const [newLabelDescription, setNewLabelDescription] = useState("")
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[0])
  const [linkedLabels, setLinkedLabels] = useState<string[]>([])
  const [massEditValue, setMassEditValue] = useState("")
  const [editingCells, setEditingCells] = useState<{ [key: string]: string }>({})
  const containerRef = useRef<HTMLDivElement>(null)
  const [editingPopover, setEditingPopover] = useState<{
    id: string
    name: string
    description: string
    linkedLabels: string[]
  } | null>(null)

  const handlePopoverOpenChange = (open: boolean, label: SpreadsheetLabel) => {
    if (open) {
      setEditingPopover({
        id: label.id,
        name: label.name,
        description: label.description,
        linkedLabels: label.linkedLabels || [],
      })
    } else {
      if (editingPopover) {
        // Only update if there are actual changes
        const hasChanges =
          editingPopover.name !== label.name ||
          editingPopover.description !== label.description ||
          JSON.stringify(editingPopover.linkedLabels) !== JSON.stringify(label.linkedLabels || [])

        if (hasChanges) {
          onUpdateLabel(editingPopover.id, {
            name: editingPopover.name,
            description: editingPopover.description,
            linkedLabels: editingPopover.linkedLabels,
          })
        }
        setEditingPopover(null)
      }
    }
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!selection?.isSelecting) return

      const coords = getCellCoordinatesFromEvent(e)
      if (!coords) return

      setSelection((prev) => (prev ? { ...prev, endRow: coords.row, endCol: coords.col } : null))
    }

    const handleMouseUp = (e: MouseEvent) => {
      if (selection?.isSelecting) {
        const finalSelection = { ...selection, isSelecting: false }
        setSelection(finalSelection)

        // Show context menu only on right mouse up
        if (e.button === 2) {
          setContextMenu({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            selection: finalSelection,
          })
        }
      }
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [selection])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        (e.target as HTMLElement).closest(
          "[data-radix-popper-content-wrapper], .fixed.inset-0, .label-interaction-overlay",
        )
      ) {
        return
      }
      if (contextMenu.visible) {
        setContextMenu((prev) => ({ ...prev, visible: false }))
      }
      if (selection && !selection.isSelecting) {
        setSelection(null)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [contextMenu.visible, selection])

  const getCellCoordinatesFromEvent = (e: MouseEvent) => {
    const scrollViewport = document.querySelector("[data-radix-scroll-area-viewport]")
    if (!scrollViewport) return null

    const scrollRect = scrollViewport.getBoundingClientRect()
    const scrollTop = scrollViewport.scrollTop
    const scrollLeft = scrollViewport.scrollLeft

    const x = e.clientX - scrollRect.left + scrollLeft - headerWidth
    const y = e.clientY - scrollRect.top + scrollTop - headerHeight

    const col = Math.floor(x / cellWidth)
    const row = Math.floor(y / cellHeight)

    if (col >= 0 && row >= 0 && col < maxCols && row < maxRows) {
      return { row, col }
    }
    return null
  }

  const getCellCoordinates = (e: React.MouseEvent) => {
    return getCellCoordinatesFromEvent(e.nativeEvent)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (contextMenu.visible) {
      setContextMenu((prev) => ({ ...prev, visible: false }))
    }
    const coords = getCellCoordinates(e)
    if (!coords) return

    const { row, col } = coords

    if (e.button === 0) {
      onCellClick(row, col)
      return
    }

    if (e.button === 2) {
      setSelection({
        startRow: row,
        startCol: col,
        endRow: row,
        endCol: col,
        isSelecting: true,
      })
    }
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()

    const coords = getCellCoordinates(e)
    if (!coords) return

    const { row, col } = coords

    if (!selection || selection.isSelecting) {
      const newSelection = {
        startRow: row,
        startCol: col,
        endRow: row,
        endCol: col,
        isSelecting: false,
      }
      setSelection(newSelection)
      setContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        selection: newSelection,
      })
    } else {
      setContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        selection: selection,
      })
    }
  }

  const handleCreateLabel = () => {
    const activeSelection = contextMenu.selection
    if (!activeSelection || !newLabelName.trim()) return

    const { startRow, endRow, startCol, endCol } = getNormalizedSelection(activeSelection)

    const label: Omit<SpreadsheetLabel, "id" | "timestamp"> = {
      name: newLabelName,
      description: newLabelDescription,
      type: "cells",
      startRow,
      endRow,
      startCol,
      endCol,
      color: newLabelColor,
      linkedLabels,
    }

    onAddLabel(label)

    setSelection(null)
    setContextMenu((prev) => ({ ...prev, visible: false }))
    setShowLabelDialog(false)
    setNewLabelName("")
    setNewLabelDescription("")
    setNewLabelColor(LABEL_COLORS[0])
    setLinkedLabels([])
    setEditingCells({})
  }

  const handleMassEdit = () => {
    const activeSelection = contextMenu.selection
    if (!activeSelection || !onCellEdit) return

    const { startRow, endRow, startCol, endCol } = getNormalizedSelection(activeSelection)

    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const cellKey = `${row}-${col}`
        const value = editingCells[cellKey] !== undefined ? editingCells[cellKey] : massEditValue
        onCellEdit(row, col, value)
      }
    }
    setSelection(null)
    setContextMenu((prev) => ({ ...prev, visible: false }))
    setShowMassEditDialog(false)
    setMassEditValue("")
    setEditingCells({})
  }

  const handleClearSelection = () => {
    if (!contextMenu.selection || !onClearCells) return
    const normalized = getNormalizedSelection(contextMenu.selection)
    onClearCells({
      start: { row: normalized.startRow, col: normalized.startCol },
      end: { row: normalized.endRow, col: normalized.endCol },
    })
    setContextMenu((prev) => ({ ...prev, visible: false }))
    setSelection(null)
  }

  const handleDeleteSelectedRows = () => {
    if (!contextMenu.selection || !onDeleteRows) return
    const { startRow, endRow } = getNormalizedSelection(contextMenu.selection)
    const indexes = Array.from({ length: endRow - startRow + 1 }, (_, i) => startRow + i)
    onDeleteRows(indexes)
    setContextMenu((prev) => ({ ...prev, visible: false }))
    setSelection(null)
  }

  const handleDeleteSelectedColumns = () => {
    if (!contextMenu.selection || !onDeleteColumns) return
    const { startCol, endCol } = getNormalizedSelection(contextMenu.selection)
    const indexes = Array.from({ length: endCol - startCol + 1 }, (_, i) => startCol + i)
    onDeleteColumns(indexes)
    setContextMenu((prev) => ({ ...prev, visible: false }))
    setSelection(null)
  }

  const openLabelDialog = () => {
    if (contextMenu.selection && getCellValue) {
      const { startRow, endRow, startCol, endCol } = getNormalizedSelection(contextMenu.selection)
      const newEditingCells: { [key: string]: string } = {}

      for (let row = startRow; row <= endRow; row++) {
        for (let col = startCol; col <= endCol; col++) {
          const cellKey = `${row}-${col}`
          newEditingCells[cellKey] = getCellValue(row, col) || ""
        }
      }
      setEditingCells(newEditingCells)
    }

    setContextMenu((prev) => ({ ...prev, visible: false }))
    setShowLabelDialog(true)
  }

  const openMassEditDialog = () => {
    if (contextMenu.selection && getCellValue) {
      const { startRow, endRow, startCol, endCol } = getNormalizedSelection(contextMenu.selection)
      const newEditingCells: { [key: string]: string } = {}

      for (let row = startRow; row <= endRow; row++) {
        for (let col = startCol; col <= endCol; col++) {
          const cellKey = `${row}-${col}`
          newEditingCells[cellKey] = getCellValue(row, col) || ""
        }
      }
      setEditingCells(newEditingCells)
    }

    setContextMenu((prev) => ({ ...prev, visible: false }))
    setShowMassEditDialog(true)
  }

  const closeDialogs = () => {
    setShowLabelDialog(false)
    setShowMassEditDialog(false)
    setNewLabelName("")
    setNewLabelDescription("")
    setNewLabelColor(LABEL_COLORS[0])
    setLinkedLabels([])
    setMassEditValue("")
    setEditingCells({})
  }

  const handleCellEdit = (row: number, col: number, value: string) => {
    const cellKey = `${row}-${col}`
    setEditingCells((prev) => ({ ...prev, [cellKey]: value }))
  }

  const getLabelStyle = (label: SpreadsheetLabel) => {
    const left = label.startCol * cellWidth + headerWidth - scrollPosition.scrollLeft
    const top = label.startRow * cellHeight + headerHeight - scrollPosition.scrollTop - (-6.8 * cellHeight)
    const width = (label.endCol - label.startCol + 1) * cellWidth
    const height = (label.endRow - label.startRow + 1) * cellHeight
    return {
      position: "absolute" as const,
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
      backgroundColor: label.color,
      border: "2px solid rgba(0,0,0,0.3)",
      borderRadius: "0px",
      pointerEvents: "auto" as const,
      zIndex: 10 + labels.indexOf(label),
    }
  }

  const getSelectionStyle = () => {
    if (!selection || selection.isSelecting) return {}
    const { startRow, endRow, startCol, endCol } = getNormalizedSelection(selection)
    const left = startCol * cellWidth + headerWidth - scrollPosition.scrollLeft
    const top = startRow * cellHeight + headerHeight - scrollPosition.scrollTop
    const width = (endCol - startCol + 1) * cellWidth
    const height = (endRow - startRow + 1) * cellHeight
    return {
      position: "absolute" as const,
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
      backgroundColor: "rgba(59, 130, 246, 0.2)",
      border: "2px solid #3b82f6",
      borderRadius: "0px",
      pointerEvents: "none" as const,
      zIndex: 50,
    }
  }

  const formatCellRange = (sel: Selection) => {
    const { startRow, endRow, startCol, endCol } = getNormalizedSelection(sel)

    if (startRow === endRow && startCol === endCol) {
      return `${String.fromCharCode(65 + startCol)}${startRow + 1}`
    }
    return `${String.fromCharCode(65 + startCol)}${startRow + 1}:${String.fromCharCode(65 + endCol)}${endRow + 1}`
  }

  const addLinkedLabel = (labelId: string) => {
    if (editingPopover && !editingPopover.linkedLabels.includes(labelId)) {
      setEditingPopover({
        ...editingPopover,
        linkedLabels: [...editingPopover.linkedLabels, labelId],
      })
    } else if (!linkedLabels.includes(labelId)) {
      setLinkedLabels([...linkedLabels, labelId])
    }
  }

  const removeLinkedLabel = (labelId: string) => {
    if (editingPopover) {
      setEditingPopover({
        ...editingPopover,
        linkedLabels: editingPopover.linkedLabels.filter((id) => id !== labelId),
      })
    } else {
      setLinkedLabels(linkedLabels.filter((id) => id !== labelId))
    }
  }

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 5 }}>
      <div
        className="absolute inset-0 pointer-events-none label-interaction-overlay"
        onMouseDown={handleMouseDown}
        onContextMenu={handleContextMenu}
        style={{
          cursor: selection?.isSelecting ? "crosshair" : "default",
          pointerEvents: selection?.isSelecting ? "auto" : "none",
        }}
      />
      {selection && !selection.isSelecting && <div className="selection-area" style={getSelectionStyle()} />}

      {/* Custom context menu */}
      {contextMenu.visible &&
        contextMenu.selection &&
        (() => {
          const sel = getNormalizedSelection(contextMenu.selection!)
          const isFullRowSelection = sel.startCol === 0 && sel.endCol === maxCols - 1
          const isFullColSelection = sel.startRow === 0 && sel.endRow === maxRows - 1

          return (
            <div
              className="fixed bg-white border border-gray-200 rounded-md shadow-lg z-50 pointer-events-auto"
              style={{
                left: `${Math.min(contextMenu.x, window.innerWidth - 200)}px`,
                top: `${Math.min(contextMenu.y, window.innerHeight - 250)}px`,
                minWidth: "180px",
              }}
              data-radix-popper-content-wrapper
            >
              <div className="py-1">
                <div className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-50 border-b">
                  {formatCellRange(contextMenu.selection!)}
                </div>
                <button
                  onClick={openLabelDialog}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                >
                  <Tag className="h-4 w-4" />
                  Create Label
                </button>
                {onCellEdit && (
                  <button
                    onClick={openMassEditDialog}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Mass Edit Cells
                  </button>
                )}
                {onClearCells && (
                  <button
                    onClick={handleClearSelection}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                  >
                    <Grid className="h-4 w-4" />
                    Clear Cells
                  </button>
                )}
                {(onDeleteRows || onDeleteColumns) && (isFullRowSelection || isFullColSelection) && (
                  <hr className="my-1" />
                )}
                {onDeleteRows && isFullRowSelection && (
                  <button
                    onClick={handleDeleteSelectedRows}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Delete Row(s)
                  </button>
                )}
                {onDeleteColumns && isFullColSelection && (
                  <button
                    onClick={handleDeleteSelectedColumns}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Delete Column(s)
                  </button>
                )}
              </div>
            </div>
          )
        })()}

      {/* Rendered labels */}
      {labels.map((label) => (
        <div key={label.id} style={getLabelStyle(label)}>
          <div className="absolute top-1 right-1">
            <Popover onOpenChange={(open) => handlePopoverOpenChange(open, label)}>
              <PopoverTrigger asChild>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-6 px-2 text-xs font-medium rounded-md shadow-sm pointer-events-auto"
                >
                  {label.name}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-3" align="start">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Name</label>
                    <Input
                      value={editingPopover?.id === label.id ? editingPopover.name : label.name}
                      onChange={(e) => editingPopover && setEditingPopover({ ...editingPopover, name: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      value={editingPopover?.id === label.id ? editingPopover.description : label.description}
                      onChange={(e) =>
                        editingPopover && setEditingPopover({ ...editingPopover, description: e.target.value })
                      }
                      rows={3}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Linked Labels</label>
                    <div className="mt-1 space-y-2">
                      <Select onValueChange={addLinkedLabel}>
                        <SelectTrigger>
                          <SelectValue placeholder="Link to another label..." />
                        </SelectTrigger>
                        <SelectContent>
                          {labels
                            .filter(
                              (l) =>
                                l.id !== label.id &&
                                !(editingPopover?.linkedLabels || label.linkedLabels || []).includes(l.id),
                            )
                            .map((l) => (
                              <SelectItem key={l.id} value={l.id}>
                                {l.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <div className="flex flex-wrap gap-1">
                        {(editingPopover?.id === label.id ? editingPopover.linkedLabels : label.linkedLabels || []).map(
                          (linkedId) => {
                            const linkedLabel = labels.find((l) => l.id === linkedId)
                            return linkedLabel ? (
                              <Badge key={linkedId} variant="secondary" className="text-xs">
                                {linkedLabel.name}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-4 w-4 p-0 ml-1"
                                  onClick={() => removeLinkedLabel(linkedId)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </Badge>
                            ) : null
                          },
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    Range: {String.fromCharCode(65 + label.startCol)}
                    {label.startRow + 1}:{String.fromCharCode(65 + label.endCol)}
                    {label.endRow + 1}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="destructive" size="sm" onClick={() => onRemoveLabel(label.id)}>
                      <X className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      ))}

      {/* Label creation dialog */}
      {showLabelDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 pointer-events-auto">
          <div className="bg-white rounded-lg p-6 w-96 max-w-[90vw] max-h-[80vh] overflow-y-auto shadow-xl">
            <h3 className="text-lg font-semibold mb-2">Create Label</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Label Name</label>
                <Input
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  placeholder="Enter label name..."
                  className="mt-1"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description (Optional)</label>
                <Textarea
                  value={newLabelDescription}
                  onChange={(e) => setNewLabelDescription(e.target.value)}
                  placeholder="Enter description..."
                  rows={3}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Color</label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {LABEL_COLORS.map((color, index) => (
                    <button
                      key={index}
                      onClick={() => setNewLabelColor(color)}
                      className={`w-8 h-8 rounded border-2 ${newLabelColor === color ? "border-gray-800" : "border-gray-300"}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Link to Labels</label>
                <div className="mt-1 space-y-2">
                  <Select onValueChange={addLinkedLabel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Link to existing labels..." />
                    </SelectTrigger>
                    <SelectContent>
                      {labels
                        .filter((l) => !linkedLabels.includes(l.id))
                        .map((l) => (
                          <SelectItem key={l.id} value={l.id}>
                            {l.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <div className="flex flex-wrap gap-1">
                    {linkedLabels.map((linkedId) => {
                      const linkedLabel = labels.find((l) => l.id === linkedId)
                      return linkedLabel ? (
                        <Badge key={linkedId} variant="secondary" className="text-xs">
                          {linkedLabel.name}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 ml-1"
                            onClick={() => removeLinkedLabel(linkedId)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ) : null
                    })}
                  </div>
                </div>
              </div>
              {contextMenu.selection && (
                <div className="text-sm text-gray-600 bg-gray-100 p-2 rounded-md">
                  Selected Range: <strong>{formatCellRange(contextMenu.selection)}</strong>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={closeDialogs}>
                  Cancel
                </Button>
                <Button onClick={handleCreateLabel} disabled={!newLabelName.trim()}>
                  Create Label
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mass edit dialog */}
      {showMassEditDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 pointer-events-auto">
          <div className="bg-white rounded-lg p-6 w-96 max-w-[90vw] max-h-[80vh] overflow-y-auto shadow-xl">
            <h3 className="text-lg font-semibold mb-2">Mass Edit Cells</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Apply to All Cells</label>
                <Input
                  value={massEditValue}
                  onChange={(e) => setMassEditValue(e.target.value)}
                  placeholder="Enter value for all cells..."
                  className="mt-1"
                  autoFocus
                />
              </div>

              {contextMenu.selection && (
                <div className="border-t pt-4">
                  <label className="text-sm font-medium mb-2 block">Or Edit Individual Cells</label>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {(() => {
                      const { startRow, endRow, startCol, endCol } = getNormalizedSelection(contextMenu.selection!)
                      const cells = []
                      for (let row = startRow; row <= endRow; row++) {
                        for (let col = startCol; col <= endCol; col++) {
                          const cellKey = `${row}-${col}`
                          const cellRef = `${String.fromCharCode(65 + col)}${row + 1}`
                          cells.push(
                            <div key={cellKey} className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 w-12">{cellRef}:</span>
                              <Input
                                value={editingCells[cellKey] || ""}
                                onChange={(e) => handleCellEdit(row, col, e.target.value)}
                                placeholder="Cell value..."
                                className="text-sm"
                              />
                            </div>,
                          )
                        }
                      }
                      return cells
                    })()}
                  </div>
                </div>
              )}

              {contextMenu.selection && (
                <div className="text-sm text-gray-600 bg-gray-100 p-2 rounded-md">
                  Selected Range: <strong>{formatCellRange(contextMenu.selection)}</strong>
                  <br />
                  Cells to edit: {(() => {
                    const sel = contextMenu.selection!
                    const { startRow, endRow, startCol, endCol } = getNormalizedSelection(sel)
                    return (endRow - startRow + 1) * (endCol - startCol + 1)
                  })()}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={closeDialogs}>
                  Cancel
                </Button>
                <Button onClick={handleMassEdit}>Apply Changes</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
