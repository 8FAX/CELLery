"use client"

import { useEffect, useRef } from "react"
import type { ContextMenuData } from "@/types/spreadsheet"

interface ContextMenuProps {
  data: ContextMenuData
  onClose: () => void
  onCopy: () => void
  onPaste: () => void
  onClear: () => void
  onInsertRow: (above: boolean) => void
  onInsertColumn: (left: boolean) => void
  onDeleteRow: () => void
  onDeleteColumn: () => void
  onCreateLabel: () => void
}

export function ContextMenu({
  data,
  onClose,
  onCopy,
  onPaste,
  onClear,
  onInsertRow,
  onInsertColumn,
  onDeleteRow,
  onDeleteColumn,
  onCreateLabel,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [onClose])

  const menuItems = [
    { label: "Copy", action: onCopy },
    { label: "Paste", action: onPaste },
    { label: "Clear", action: onClear },
    { type: "separator" },
    { label: "Create Label", action: onCreateLabel },
    { type: "separator" },
    { label: "Insert Row Above", action: () => onInsertRow(true) },
    { label: "Insert Row Below", action: () => onInsertRow(false) },
    { label: "Insert Column Left", action: () => onInsertColumn(true) },
    { label: "Insert Column Right", action: () => onInsertColumn(false) },
    { type: "separator" },
    { label: "Delete Row", action: onDeleteRow },
    { label: "Delete Column", action: onDeleteColumn },
  ]

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white border border-gray-300 rounded-lg shadow-lg py-1 min-w-48"
      style={{ left: data.x, top: data.y }}
    >
      {menuItems.map((item, index) =>
        item.type === "separator" ? (
          <div key={index} className="border-t border-gray-200 my-1" />
        ) : (
          <button
            key={index}
            onClick={() => {
              item.action?.()
              onClose()
            }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
          >
            {item.label}
          </button>
        ),
      )}
    </div>
  )
}
