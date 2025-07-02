"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import type { CellPosition } from "@/types/spreadsheet"
import { getCellReference } from "@/utils/spreadsheet"

interface FormulaBarProps {
  value?: string
  onChange: (value: string) => void
  onSubmit: () => void
  selectedCell: CellPosition | null
}

export function FormulaBar({ value, onChange, onSubmit, selectedCell }: FormulaBarProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [localValue, setLocalValue] = useState("")

  useEffect(() => {
    if (value !== undefined) {
      setLocalValue(value)
    } else {
      setLocalValue("")
    }
  }, [value])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onSubmit()
    } else if (e.key === "Escape") {
      onChange("")
      setLocalValue("")
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setLocalValue(newValue)
    onChange(newValue)
  }

  return (
    <div className="flex items-center gap-2 p-2 bg-gray-50 border-t border-gray-200">
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium text-gray-600">{selectedCell ? getCellReference(selectedCell) : ""}</span>
        <span className="text-gray-400">fx</span>
      </div>
      <input
        ref={inputRef}
        type="text"
        value={localValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Enter formula or value..."
        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )
}
