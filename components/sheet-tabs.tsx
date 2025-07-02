"use client"

import type React from "react"

import { useState } from "react"
import { Plus, X, Edit2 } from "lucide-react"
import type { Sheet } from "@/types/spreadsheet"
import { Button } from "@/components/ui/button"

interface SheetTabsProps {
  sheets: Sheet[]
  activeSheetId: string
  onCreateSheet: () => void
  onDeleteSheet: (id: string) => void
  onRenameSheet: (id: string, name: string) => void
  onSelectSheet: (id: string) => void
}

export function SheetTabs({
  sheets,
  activeSheetId,
  onCreateSheet,
  onDeleteSheet,
  onRenameSheet,
  onSelectSheet,
}: SheetTabsProps) {
  const [editingSheet, setEditingSheet] = useState<string | null>(null)
  const [editName, setEditName] = useState("")

  const handleRename = (sheet: Sheet) => {
    setEditingSheet(sheet.id)
    setEditName(sheet.name)
  }

  const handleRenameSubmit = () => {
    if (editingSheet && editName.trim()) {
      onRenameSheet(editingSheet, editName.trim())
    }
    setEditingSheet(null)
    setEditName("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleRenameSubmit()
    } else if (e.key === "Escape") {
      setEditingSheet(null)
      setEditName("")
    }
  }

  return (
    <div className="bg-gray-100 border-t border-gray-300 p-1 flex items-center gap-1 overflow-x-auto">
      {sheets.map((sheet) => (
        <div
          key={sheet.id}
          className={`flex items-center gap-1 px-3 py-1 rounded-t-lg cursor-pointer group ${
            sheet.id === activeSheetId
              ? "bg-white border-t border-l border-r border-gray-300"
              : "bg-gray-200 hover:bg-gray-300"
          }`}
          onClick={() => onSelectSheet(sheet.id)}
        >
          {editingSheet === sheet.id ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={handleKeyDown}
              className="bg-transparent border-none outline-none text-sm w-20"
              autoFocus
            />
          ) : (
            <>
              <span className="text-sm font-medium">{sheet.name}</span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRename(sheet)
                  }}
                  className="p-1 hover:bg-gray-300 rounded"
                >
                  <Edit2 className="h-3 w-3" />
                </button>
                {sheets.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteSheet(sheet.id)
                    }}
                    className="p-1 hover:bg-red-200 rounded"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      ))}

      <Button variant="ghost" size="sm" onClick={onCreateSheet} className="p-1 ml-2">
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  )
}
