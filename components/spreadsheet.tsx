"use client"

import { useCallback, useEffect, useState } from "react"
import { SpreadsheetGrid } from "./grid"
import { FormulaBar } from "./formula-bar"
import { Toolbar } from "./toolbar"
import { SheetTabs } from "./sheet-tabs"
import { ContextMenu } from "./context-menu"
import { AiChatSidebar } from "./ai-chat-sidebar"
import { useSpreadsheetStore, useActiveSheet, useCanUndoRedo } from "@/stores/spreadsheet-store"
import { contextManager } from "@/lib/context-manager"
import type { CellPosition } from "@/types/spreadsheet"
import { Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Spreadsheet() {
  const [showAiSidebar, setShowAiSidebar] = useState(false)
  const [apiKey, setApiKey] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [chatHistory, setChatHistory] = useState<any[]>([])
  const [showLabelDialog, setShowLabelDialog] = useState(false)
  const [newLabelName, setNewLabelName] = useState("")
  const [newLabelDescription, setNewLabelDescription] = useState("")
  const [contexts, setContexts] = useState(contextManager.getContexts())
  const [createdSheets, setCreatedSheets] = useState<Array<{id: string, name: string, timestamp: Date}>>([])

  const activeSheet = useActiveSheet()
  const selectedCell = useSpreadsheetStore((state) => state.selectedCell)
  const selectedRange = useSpreadsheetStore((state) => state.selectedRange)
  const formulaValue = useSpreadsheetStore((state) => state.formulaValue)
  const contextMenu = useSpreadsheetStore((state) => state.contextMenu)
  const sheets = useSpreadsheetStore((state) => state.sheets)
  const activeSheetId = useSpreadsheetStore((state) => state.activeSheetId)
  const { canUndo, canRedo } = useCanUndoRedo()

  // Actions
  const updateCell = useSpreadsheetStore((state) => state.updateCell)
  const setFormulaValue = useSpreadsheetStore((state) => state.setFormulaValue)
  const setContextMenu = useSpreadsheetStore((state) => state.setContextMenu)
  const copySelection = useSpreadsheetStore((state) => state.copySelection)
  const pasteSelection = useSpreadsheetStore((state) => state.pasteSelection)
  const clearSelection = useSpreadsheetStore((state) => state.clearSelection)
  const insertRow = useSpreadsheetStore((state) => state.insertRow)
  const insertColumn = useSpreadsheetStore((state) => state.insertColumn)
  const deleteRow = useSpreadsheetStore((state) => state.deleteRow)
  const deleteColumn = useSpreadsheetStore((state) => state.deleteColumn)
  const undo = useSpreadsheetStore((state) => state.undo)
  const redo = useSpreadsheetStore((state) => state.redo)
  const formatCells = useSpreadsheetStore((state) => state.formatCells)
  const exportSheet = useSpreadsheetStore((state) => state.exportSheet)
  const importSheet = useSpreadsheetStore((state) => state.importSheet)
  const createSheet = useSpreadsheetStore((state) => state.createSheet)
  const deleteSheet = useSpreadsheetStore((state) => state.deleteSheet)
  const renameSheet = useSpreadsheetStore((state) => state.renameSheet)
  const setActiveSheet = useSpreadsheetStore((state) => state.setActiveSheet)

  // Add this function to get available labels not in context
  const getAvailableLabels = useCallback(() => {
    if (!activeSheet) return []

    const contextLabelNames = new Set(
      contextManager
        .getContexts()
        .filter((c) => c.type === "text" && c.name.startsWith("Label: "))
        .map((c) => c.name.replace("Label: ", "")),
    )

    return activeSheet.labels?.filter((label) => !contextLabelNames.has(label.name)) || []
  }, [activeSheet])

  // Add this function to handle adding labels to context
  const handleAddAvailableLabel = useCallback((label: any) => {
    // Find related labels
    const relatedLabels = label.linkedLabels ? 
      activeSheet?.labels?.filter(l => label.linkedLabels.includes(l.id)) || [] : []
    
    const labelInfo = {
      name: label.name,
      description: label.description,
      range: `${String.fromCharCode(65 + label.startCol)}${label.startRow + 1}:${String.fromCharCode(65 + label.endCol)}${label.endRow + 1}`,
      sheet: activeSheet?.name || 'Unknown',
      type: label.type,
      color: label.color,
      timestamp: label.timestamp,
      data: label.data || {}, // Include actual cell data
      related_labels: relatedLabels.map(rl => ({
        name: rl.name,
        description: rl.description,
        range: `${String.fromCharCode(65 + rl.startCol)}${rl.startRow + 1}:${String.fromCharCode(65 + rl.endCol)}${rl.endRow + 1}`,
        data: rl.data || {}
      }))
    }
    
    contextManager.addTextContext(`Label: ${label.name}`, JSON.stringify(labelInfo, null, 2))
    setContexts(contextManager.getContexts())
  }, [activeSheet])

  // AI Chat functionality with recursive support
  const handleAiSubmit = useCallback(
    async (prompt: string, isRecursiveCall = false) => {
      if (!apiKey) return

      setIsProcessing(true)
      try {
        // Add user message to context manager (only for initial calls, not recursive)
        if (!isRecursiveCall) {
          contextManager.addChatMessage("user", prompt)
        }

        // Build structured context payload with all messages
        const contextPayload = contextManager.buildStructuredPayload(true)

        const response = await fetch("/api/ai", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt,
            context: contextPayload, // Send full structured context
            apiKey,
          }),
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const result = await response.json()
        console.log("AI API response:", result)

        // Add AI response to context manager
        const aiResponse = result.response || "No response received"
        console.log("Parsed AI response:", aiResponse)
        let responseText: string
        
        // Check for validation errors first
        if (aiResponse.validation_errors && aiResponse.validation_errors.length > 0) {
          responseText = `Validation Error: ${aiResponse.explanation || "Please check your request"}`
          contextManager.addChatMessage("assistant", responseText, aiResponse)
          setChatHistory(contextManager.getChatHistory())
          return
        }
        
        // Process create_sheet actions FIRST (before any other changes)
        if (aiResponse.sheets && aiResponse.sheets.length > 0) {
          console.log("Creating sheets:", aiResponse.sheets)
          const createdSheetNames: string[] = []
          
          aiResponse.sheets.forEach((sheetData: any) => {
            console.log("Creating new sheet:", sheetData)
            
            // Create the new sheet
            const newSheetId = createSheet(sheetData.name)
            console.log("Created sheet with ID:", newSheetId)
            createdSheetNames.push(sheetData.name)
            
            // Track the created sheet
            setCreatedSheets(prev => [...prev, {
              id: newSheetId,
              name: sheetData.name,
              timestamp: new Date()
            }])
            
            // Switch to the new sheet to add data
            setActiveSheet(newSheetId)
            
            // Add initial headers if provided
            if (sheetData.headers && sheetData.headers.length > 0) {
              sheetData.headers.forEach((header: string, index: number) => {
                updateCell({ row: 0, col: index }, { value: header })
              })
            }
            
            // Add initial data if provided
            if (sheetData.initial_data && sheetData.initial_data.length > 0) {
              sheetData.initial_data.forEach((rowData: string[], rowIndex: number) => {
                rowData.forEach((cellValue: string, colIndex: number) => {
                  updateCell({ row: rowIndex + 1, col: colIndex }, { value: cellValue })
                })
              })
            }
          })
          
          // Update sheet context after creation
          setTimeout(() => {
            const updatedSheetData = sheets.map((sheet) => ({
              name: sheet.name,
              data: Object.entries(sheet.cells).map(([key, cell]) => {
                const [row, col] = key.split("-").map(Number)
                return { row, col, value: cell.value }
              }),
              labels: sheet.labels || [],
            }))
            contextManager.setAvailableSheets(updatedSheetData)
          }, 100)
        }
        
        if (typeof aiResponse === 'string') {
          responseText = aiResponse
        } else {
          // For structured responses, show the explanation plus any changes
          responseText = aiResponse.explanation || "AI processed your request"
          if (aiResponse.changes && aiResponse.changes.length > 0) {
            const changesText = aiResponse.changes.map((change: any) => 
              `• ${change.description || change.type} (${change.sheet}: ${change.range})`
            ).join('\n')
            responseText = `${responseText}\n\nSuggested changes:\n${changesText}`
          }
          if (aiResponse.sheets && aiResponse.sheets.length > 0) {
            const sheetsText = aiResponse.sheets.map((sheet: any) => 
              `• Created sheet: ${sheet.name} - ${sheet.description}`
            ).join('\n')
            responseText = `${responseText}\n\nCreated sheets:\n${sheetsText}`
          }
          if (aiResponse.bulk_inserts && aiResponse.bulk_inserts.length > 0) {
            const bulkText = aiResponse.bulk_inserts.map((bulk: any) => 
              `• ${bulk.description} (${bulk.sheet}: ${bulk.start_cell}:${bulk.end_cell})`
            ).join('\n')
            responseText = `${responseText}\n\nBulk data insertions:\n${bulkText}`
          }
        }
        
        contextManager.addChatMessage("assistant", responseText, aiResponse)

        // Update local chat history from context manager
        setChatHistory(contextManager.getChatHistory())

        // Handle recursive calls if the AI requests it
        if (result.response?.recursive) {
          console.log("AI requested recursive call, making follow-up request...")
          // Make a recursive call with a continuation prompt
          setTimeout(() => {
            handleAiSubmit("Continue with the previous task", true)
          }, 1000) // Small delay to prevent overwhelming the API
        }

      } catch (error) {
        console.error("AI request failed:", error)
        
        // Add error message to context manager
        const errorMessage = `Error: ${error instanceof Error ? error.message : "Unknown error occurred"}`
        contextManager.addChatMessage("assistant", errorMessage)
        setChatHistory(contextManager.getChatHistory())
      } finally {
        setIsProcessing(false)
      }
    },
    [apiKey],
  )

  const handleAcceptChanges = useCallback((changes: any[], messageId?: string, bulkInserts?: any[]) => {
    // Apply the AI suggested changes to the spreadsheet
    changes.forEach((change) => {
      console.log("Applying change:", change)
      
      if (change.type === "value" && change.range && change.sheet) {
        // Parse the range (e.g., "E1:E17" or "E2")
        const rangeParts = change.range.split(":")
        const startCell = rangeParts[0]
        const endCell = rangeParts[1] || startCell
        
        // Parse start cell (e.g., "E2" -> col=4, row=1)
        const startCol = startCell.charCodeAt(0) - 65 // A=0, B=1, etc.
        const startRow = parseInt(startCell.slice(1)) - 1 // 1-indexed to 0-indexed
        
        // Parse end cell
        const endCol = endCell.charCodeAt(0) - 65
        const endRow = parseInt(endCell.slice(1)) - 1
        
        // Apply changes to each cell in the range
        for (let row = startRow; row <= endRow; row++) {
          for (let col = startCol; col <= endCol; col++) {
            const position = { row, col }
            
            if (change.value && change.value.startsWith("=")) {
              // Handle formula like "=C1:C60" -> copy from source range
              const sourceRange = change.value.substring(1) // Remove "="
              if (sourceRange.includes(":")) {
                const [sourceStart, sourceEnd] = sourceRange.split(":")
                const sourceStartCol = sourceStart.charCodeAt(0) - 65
                const sourceStartRow = parseInt(sourceStart.slice(1)) - 1
                
                // Calculate offset within the target range
                const offsetRow = row - startRow
                const offsetCol = col - startCol
                
                // Get source cell position
                const sourceRow = sourceStartRow + offsetRow
                const sourceCol = sourceStartCol + offsetCol
                const sourcePosition = { row: sourceRow, col: sourceCol }
                
                // Get value from source cell
                const sourceCell = activeSheet?.cells[`${sourceRow}-${sourceCol}`]
                const valueToSet = sourceCell?.value || ""
                
                // Set the value in the target cell
                updateCell(position, { value: valueToSet })
              }
            } else if (change.value) {
              // Direct value assignment
              updateCell(position, { value: change.value })
            }
          }
        }
      } else if (change.type === "formula" && change.range) {
        // Handle formula application
        const rangeParts = change.range.split(":")
        const startCell = rangeParts[0]
        const startCol = startCell.charCodeAt(0) - 65
        const startRow = parseInt(startCell.slice(1)) - 1
        
        // Determine what formula/value to use
        let formulaToUse = ""
        if (change.formula) {
          formulaToUse = change.formula.startsWith("=") ? change.formula : `=${change.formula}`
        } else if (change.value && change.value !== "string") {
          if (change.value.startsWith("=")) {
            formulaToUse = change.value
          } else if (change.value.includes("=")) {
            // Extract formula from value if it contains one
            const match = change.value.match(/=[\w\s\(\)\[\]!:,'.+-/*]+/)
            if (match) {
              formulaToUse = match[0]
            }
          }
        }
        
        // If no valid formula found, try to infer from description
        if (!formulaToUse && change.description) {
          const desc = change.description.toLowerCase()
          if (desc.includes("total revenue") && desc.includes("multiply")) {
            formulaToUse = "=D{row}*E{row}" // Sale Price * Quantity template
          } else if (desc.includes("commission") && desc.includes("multiply")) {
            formulaToUse = "=D{row}*H{row}" // Sale Price * Commission Percent template
          } else if (desc.includes("sumif")) {
            formulaToUse = change.value || "=SUMIF('Car Sales Data'!C:C,A{row},'Car Sales Data'!K:K)"
          }
        }
        
        if (formulaToUse) {
          // Handle range formulas
          if (rangeParts.length > 1) {
            // Multi-cell range
            const endCell = rangeParts[1]
            const endCol = endCell.charCodeAt(0) - 65
            const endRow = parseInt(endCell.slice(1)) - 1
            
            for (let row = startRow; row <= endRow; row++) {
              for (let col = startCol; col <= endCol; col++) {
                // Adjust formula for each cell if needed
                let adjustedFormula = formulaToUse
                
                // Replace {row} placeholder with actual row number
                if (adjustedFormula.includes("{row}")) {
                  const rowNum = row + 1 // Convert to 1-based
                  adjustedFormula = adjustedFormula.replace(/{row}/g, rowNum.toString())
                }
                
                // Handle specific formula patterns
                if (formulaToUse.includes("*") && !formulaToUse.startsWith("=")) {
                  const rowNum = row + 1 // Convert to 1-based
                  if (change.description?.toLowerCase().includes("total revenue")) {
                    adjustedFormula = `=D${rowNum}*E${rowNum}` // Sale Price * Quantity
                  } else if (change.description?.toLowerCase().includes("commission")) {
                    adjustedFormula = `=D${rowNum}*H${rowNum}` // Sale Price * Commission Percent
                  }
                }
                
                updateCell({ row, col }, { value: adjustedFormula })
              }
            }
          } else {
            // Single cell
            let adjustedFormula = formulaToUse
            
            // Replace {row} placeholder with actual row number
            if (adjustedFormula.includes("{row}")) {
              const rowNum = startRow + 1 // Convert to 1-based
              adjustedFormula = adjustedFormula.replace(/{row}/g, rowNum.toString())
            }
            
            updateCell({ row: startRow, col: startCol }, { value: adjustedFormula })
          }
        }
      }
    })
    
    // Apply bulk inserts
    if (bulkInserts && bulkInserts.length > 0) {
      bulkInserts.forEach((bulkInsert) => {
        console.log("Applying bulk insert:", bulkInsert)
        
        try {
          // Find the target sheet
          const targetSheet = sheets.find(s => s.name === bulkInsert.sheet)
          if (!targetSheet) {
            console.error("Target sheet not found:", bulkInsert.sheet)
            return
          }
          
          // Switch to the target sheet
          setActiveSheet(targetSheet.id)
          
          // Parse the bulk data
          const bulkData = JSON.parse(bulkInsert.data)
          
          // Parse start cell
          const startCol = bulkInsert.start_cell.charCodeAt(0) - 65
          const startRow = parseInt(bulkInsert.start_cell.slice(1)) - 1
          
          // Apply each row of data
          Object.entries(bulkData).forEach(([rowKey, rowData]: [string, any]) => {
            const rowIndex = parseInt(rowKey) - 1 // Convert to 0-based
            
            if (Array.isArray(rowData)) {
              rowData.forEach((cellValue: string, colIndex: number) => {
                const position = { row: rowIndex, col: startCol + colIndex }
                updateCell(position, { value: cellValue })
              })
            }
          })
          
        } catch (error) {
          console.error("Error applying bulk insert:", error)
        }
      })
    }
    
    // Update the suggestion status
    if (messageId) {
      contextManager.updateSuggestionStatus(messageId, "accepted")
      setChatHistory(contextManager.getChatHistory())
    }
  }, [updateCell, activeSheet, sheets, setActiveSheet])

  const handleRejectChanges = useCallback((messageId: string) => {
    // Update the suggestion status
    contextManager.updateSuggestionStatus(messageId, "rejected")
    setChatHistory(contextManager.getChatHistory())
  }, [])

  const handleAcceptAll = useCallback(() => {
    // Find all pending suggestions and accept them
    const pendingSuggestions = chatHistory.filter(msg => 
      msg.aiResponse?.status === "pending" && 
      ((msg.aiResponse.changes && msg.aiResponse.changes.length > 0) || 
       (msg.aiResponse.bulk_inserts && msg.aiResponse.bulk_inserts.length > 0))
    )

    pendingSuggestions.forEach(msg => {
      if (msg.aiResponse) {
        // Apply the changes
        handleAcceptChanges(
          msg.aiResponse.changes || [], 
          msg.id, 
          msg.aiResponse.bulk_inserts || []
        )
      }
    })
  }, [chatHistory, handleAcceptChanges])

  const handleCellEdit = useCallback(
    (position: CellPosition, value: string) => {
      updateCell(position, { value })
    },
    [updateCell],
  )

  const handleFormulaSubmit = useCallback(() => {
    if (selectedCell && formulaValue !== undefined) {
      updateCell(selectedCell, { value: formulaValue })
      setFormulaValue(undefined)
    }
  }, [selectedCell, formulaValue, updateCell, setFormulaValue])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "c":
            e.preventDefault()
            copySelection()
            break
          case "v":
            e.preventDefault()
            pasteSelection()
            break
          case "z":
            e.preventDefault()
            if (e.shiftKey) {
              redo()
            } else {
              undo()
            }
            break
          case "y":
            e.preventDefault()
            redo()
            break
        }
      }
    },
    [copySelection, pasteSelection, undo, redo],
  )

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  // Update context manager with current sheets
  useEffect(() => {
    const sheetData = sheets.map((sheet) => ({
      name: sheet.name,
      data: Object.entries(sheet.cells).map(([key, cell]) => {
        const [row, col] = key.split("-").map(Number)
        return { row, col, value: cell.value }
      }),
      labels: sheet.labels || [],
    }))
    contextManager.setAvailableSheets(sheetData)
  }, [sheets])

  // Add this useEffect after the existing useEffect for sheets
  useEffect(() => {
    if (activeSheet) {
      // Auto-add current sheet to context when viewed
      const sheetData = {
        name: activeSheet.name,
        data: Object.entries(activeSheet.cells).map(([key, cell]) => {
          const [row, col] = key.split("-").map(Number)
          return { row, col, value: cell.value }
        }),
        labels: activeSheet.labels || [],
      }
      contextManager.addOrUpdateSheetContext(sheetData)
      setContexts(contextManager.getContexts())
    }
  }, [activeSheet, activeSheetId])

  const handleCreateLabel = useCallback(() => {
    if (!selectedCell && !selectedRange) return
    setShowLabelDialog(true)
    setContextMenu(null)
  }, [selectedCell, selectedRange, setContextMenu])

  const handleLabelSubmit = useCallback(() => {
    if (!activeSheet || !newLabelName.trim()) return

    let startRow, endRow, startCol, endCol

    if (selectedRange) {
      startRow = selectedRange.start.row
      endRow = selectedRange.end.row
      startCol = selectedRange.start.col
      endCol = selectedRange.end.col
    } else if (selectedCell) {
      startRow = endRow = selectedCell.row
      startCol = endCol = selectedCell.col
    } else {
      return
    }

    const label = {
      name: newLabelName,
      description: newLabelDescription,
      type: "cells" as const,
      startRow,
      endRow,
      startCol,
      endCol,
      color: "rgba(59, 130, 246, 0.2)",
    }

    // Use the addLabel action from the store
    const addLabel = useSpreadsheetStore.getState().addLabel
    addLabel(activeSheetId, label)

    setShowLabelDialog(false)
    setNewLabelName("")
    setNewLabelDescription("")
  }, [activeSheet, activeSheetId, selectedCell, selectedRange, newLabelName, newLabelDescription])

  // Add function to handle deleting AI-created sheets
  const handleDeleteCreatedSheet = useCallback((sheetId: string) => {
    deleteSheet(sheetId)
    setCreatedSheets(prev => prev.filter(sheet => sheet.id !== sheetId))
  }, [deleteSheet])

  // Auto-dismiss sheet creation notifications after 10 seconds
  useEffect(() => {
    if (createdSheets.length > 0) {
      const timeouts = createdSheets.map((sheet) => 
        setTimeout(() => {
          setCreatedSheets(prev => prev.filter(s => s.id !== sheet.id))
        }, 10000) // 10 seconds
      )
      
      return () => {
        timeouts.forEach(timeout => clearTimeout(timeout))
      }
    }
  }, [createdSheets])

  if (!activeSheet) return null

  return (
    <div className="h-full flex">
      {/* Main Spreadsheet Area */}
      <div className={`flex flex-col transition-all duration-300 ${showAiSidebar ? "w-3/4" : "w-full"}`}>
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-gray-900">CELLery</h1>
              <Button
                onClick={() => setShowAiSidebar(!showAiSidebar)}
                variant={showAiSidebar ? "default" : "outline"}
                size="sm"
                className="flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                AI Assistant
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={undo}
                disabled={!canUndo}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded"
              >
                Undo
              </button>
              <button
                onClick={redo}
                disabled={!canRedo}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded"
              >
                Redo
              </button>
              <button
                onClick={() => exportSheet(activeSheetId)}
                className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded"
              >
                Export
              </button>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) importSheet(file)
                }}
                className="hidden"
                id="import-file"
              />
              <label
                htmlFor="import-file"
                className="px-3 py-1 text-sm bg-green-500 hover:bg-green-600 text-white rounded cursor-pointer"
              >
                Import
              </label>
            </div>
          </div>
          <FormulaBar
            value={formulaValue}
            onChange={setFormulaValue}
            onSubmit={handleFormulaSubmit}
            selectedCell={selectedCell}
          />
        </div>

        {/* Toolbar */}
        <Toolbar
          selectedCell={selectedCell}
          selectedRange={selectedRange}
          onFormat={formatCells}
          activeSheet={activeSheet}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <div className="flex-1 overflow-hidden">
            <SpreadsheetGrid onCellEdit={handleCellEdit} />
          </div>

          {/* Sheet Creation Notifications */}
          {createdSheets.length > 0 && (
            <div className="absolute top-4 right-4 z-40 space-y-2">
              {createdSheets.map((sheet) => (
                <div
                  key={sheet.id}
                  className="bg-green-50 border border-green-200 rounded-lg p-3 shadow-lg flex items-center justify-between min-w-80"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-green-800">
                        Sheet Created: {sheet.name}
                      </p>
                      <p className="text-xs text-green-600">
                        {new Date(sheet.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveSheet(sheet.id)}
                      className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleDeleteCreatedSheet(sheet.id)}
                      className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setCreatedSheets(prev => prev.filter(s => s.id !== sheet.id))}
                      className="text-green-500 hover:text-green-700"
                      title="Dismiss notification"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Sheet Tabs */}
          <SheetTabs
            sheets={sheets}
            activeSheetId={activeSheetId}
            onCreateSheet={createSheet}
            onDeleteSheet={deleteSheet}
            onRenameSheet={renameSheet}
            onSelectSheet={setActiveSheet}
          />
        </div>

        {/* Context Menu */}
        {contextMenu && (
          <ContextMenu
            data={contextMenu}
            onClose={() => setContextMenu(null)}
            onCopy={copySelection}
            onPaste={pasteSelection}
            onClear={clearSelection}
            onInsertRow={insertRow}
            onInsertColumn={insertColumn}
            onDeleteRow={deleteRow}
            onDeleteColumn={deleteColumn}
            onCreateLabel={handleCreateLabel}
          />
        )}
      </div>

      {/* AI Chat Sidebar */}
      {showAiSidebar && (
        <div className="w-1/4 h-full">
          <AiChatSidebar
            onSubmit={handleAiSubmit}
            isProcessing={isProcessing}
            chatHistory={chatHistory}
            onAcceptChanges={handleAcceptChanges}
            onRejectChanges={handleRejectChanges}
            onAcceptAll={handleAcceptAll}
            contexts={contexts}
            onRemoveContext={(id) => {
              contextManager.removeContext(id)
              setContexts(contextManager.getContexts())
            }}
            onAddTextContext={(name, content) => {
              contextManager.addTextContext(name, content)
              setContexts(contextManager.getContexts())
            }}
            onAddAvailableSheet={(sheetName) => {
              contextManager.addSheetContextByName(sheetName)
              setContexts(contextManager.getContexts())
            }}
            onAddAvailableLabel={handleAddAvailableLabel}
            getAvailableSheets={() => contextManager.getAvailableSheets()}
            getAvailableLabels={getAvailableLabels}
            onClearChat={() => {
              contextManager.clearChatHistory()
              setChatHistory([])
            }}
            apiKey={apiKey}
            onApiKeyChange={setApiKey}
          />
        </div>
      )}
      {/* Label Creation Dialog */}
      {showLabelDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-[90vw] shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Create Label</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1">Label Name</label>
                <input
                  type="text"
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  placeholder="Enter label name..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Description (Optional)</label>
                <textarea
                  value={newLabelDescription}
                  onChange={(e) => setNewLabelDescription(e.target.value)}
                  placeholder="Enter description..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              {(selectedCell || selectedRange) && (
                <div className="text-sm text-gray-600 bg-gray-100 p-2 rounded-md">
                  Selected:{" "}
                  {selectedRange
                    ? `${String.fromCharCode(65 + selectedRange.start.col)}${selectedRange.start.row + 1}:${String.fromCharCode(65 + selectedRange.end.col)}${selectedRange.end.row + 1}`
                    : selectedCell
                      ? `${String.fromCharCode(65 + selectedCell.col)}${selectedCell.row + 1}`
                      : ""}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    setShowLabelDialog(false)
                    setNewLabelName("")
                    setNewLabelDescription("")
                  }}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLabelSubmit}
                  disabled={!newLabelName.trim()}
                  className="px-4 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Label
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sheet Creation Notifications */}
      {createdSheets.length > 0 && (
        <div className="absolute top-16 right-4 z-40 space-y-2">
          {createdSheets.map((sheet) => (
            <div
              key={sheet.id}
              className="bg-green-50 border border-green-200 rounded-lg p-3 shadow-lg flex items-center justify-between min-w-80"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-green-800">
                    Sheet Created: {sheet.name}
                  </p>
                  <p className="text-xs text-green-600">
                    {new Date(sheet.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveSheet(sheet.id)}
                  className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                >
                  View
                </button>
                <button
                  onClick={() => handleDeleteCreatedSheet(sheet.id)}
                  className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                >
                  Delete
                </button>
                <button
                  onClick={() => setCreatedSheets(prev => prev.filter(s => s.id !== sheet.id))}
                  className="text-green-500 hover:text-green-700"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
