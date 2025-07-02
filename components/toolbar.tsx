"use client"

import type React from "react"

import { useState } from "react"
import { Bold, Italic, Underline, Palette } from "lucide-react"
import type { CellPosition, CellRange, Sheet, CellFormat } from "@/types/spreadsheet"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface ToolbarProps {
  selectedCell: CellPosition | null
  selectedRange: CellRange | null
  onFormat: (format: Partial<CellFormat>) => void
  activeSheet: Sheet
}

export function Toolbar({ selectedCell, selectedRange, onFormat, activeSheet }: ToolbarProps) {
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [colorType, setColorType] = useState<"text" | "background">("text")

  const colors = [
    "#000000",
    "#FF0000",
    "#00FF00",
    "#0000FF",
    "#FFFF00",
    "#FF00FF",
    "#00FFFF",
    "#800000",
    "#008000",
    "#000080",
    "#808000",
    "#800080",
    "#008080",
    "#C0C0C0",
    "#808080",
    "#FF9999",
    "#99FF99",
    "#9999FF",
    "#FFFF99",
    "#FF99FF",
    "#99FFFF",
  ]

  const handleColorSelect = (color: string) => {
    if (colorType === "text") {
      onFormat({ color })
    } else {
      onFormat({ backgroundColor: color })
    }
    setShowColorPicker(false)
  }

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFormat({ fontSize: Number.parseInt(e.target.value) })
  }

  return (
    <div className="bg-white border-b border-gray-200 p-2 flex items-center gap-2">
      {/* Font Size */}
      <select
        onChange={handleFontSizeChange}
        className="px-2 py-1 text-sm border border-gray-300 rounded"
        defaultValue="12"
      >
        <option value="8">8</option>
        <option value="10">10</option>
        <option value="12">12</option>
        <option value="14">14</option>
        <option value="16">16</option>
        <option value="18">18</option>
        <option value="20">20</option>
        <option value="24">24</option>
      </select>

      {/* Text Formatting */}
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={() => onFormat({ bold: true })} className="p-1">
          <Bold className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onFormat({ italic: true })} className="p-1">
          <Italic className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onFormat({ underline: true })} className="p-1">
          <Underline className="h-4 w-4" />
        </Button>
      </div>

      {/* Color Picker */}
      <Popover open={showColorPicker} onOpenChange={setShowColorPicker}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="p-1">
            <Palette className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64">
          <div className="space-y-2">
            <div className="flex gap-2">
              <button
                onClick={() => setColorType("text")}
                className={`px-3 py-1 text-sm rounded ${
                  colorType === "text" ? "bg-blue-500 text-white" : "bg-gray-100"
                }`}
              >
                Text
              </button>
              <button
                onClick={() => setColorType("background")}
                className={`px-3 py-1 text-sm rounded ${
                  colorType === "background" ? "bg-blue-500 text-white" : "bg-gray-100"
                }`}
              >
                Background
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {colors.map((color) => (
                <button
                  key={color}
                  onClick={() => handleColorSelect(color)}
                  className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Number Format */}
      <select
        onChange={(e) => onFormat({ numberFormat: e.target.value as any })}
        className="px-2 py-1 text-sm border border-gray-300 rounded"
        defaultValue="general"
      >
        <option value="general">General</option>
        <option value="number">Number</option>
        <option value="currency">Currency</option>
        <option value="percent">Percent</option>
        <option value="date">Date</option>
      </select>
    </div>
  )
}
