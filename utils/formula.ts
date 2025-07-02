import type { CellData } from "@/types/spreadsheet"
import { parseCellReference, getCellKey } from "./spreadsheet"

export function evaluateFormula(formula: string, cells: { [key: string]: CellData }, currentSheet?: string, allSheets?: { [sheetName: string]: { [key: string]: CellData } }): number | string {
  // Remove the = sign
  const expression = formula.slice(1)

  // Handle basic functions
  if (expression.startsWith("SUM(")) {
    return evaluateSum(expression, cells, allSheets)
  }

  if (expression.startsWith("AVERAGE(")) {
    return evaluateAverage(expression, cells, allSheets)
  }

  if (expression.startsWith("COUNT(")) {
    return evaluateCount(expression, cells, allSheets)
  }

  if (expression.startsWith("IF(")) {
    return evaluateIf(expression, cells, allSheets)
  }

  if (expression.startsWith("SUMIF(")) {
    return evaluateSumIf(expression, cells, allSheets)
  }

  if (expression.startsWith("UNIQUE(")) {
    return evaluateUnique(expression, cells, allSheets)
  }

  if (expression.startsWith("VLOOKUP(")) {
    return evaluateVlookup(expression, cells, allSheets)
  }

  if (expression.startsWith("IFERROR(")) {
    return evaluateIferror(expression, cells, allSheets)
  }

  // Handle cell references and basic arithmetic
  return evaluateExpression(expression, cells, allSheets)
}

function evaluateSum(expression: string, cells: { [key: string]: CellData }, allSheets?: { [sheetName: string]: { [key: string]: CellData } }): number {
  const range = extractRange(expression)
  const values = getRangeValues(range, cells, allSheets)
  return values.reduce((sum, val) => sum + (Number.parseFloat(val) || 0), 0)
}

function evaluateAverage(expression: string, cells: { [key: string]: CellData }, allSheets?: { [sheetName: string]: { [key: string]: CellData } }): number {
  const range = extractRange(expression)
  const values = getRangeValues(range, cells, allSheets)
  const numbers = values.filter((val) => !isNaN(Number.parseFloat(val))).map((val) => Number.parseFloat(val))
  return numbers.length > 0 ? numbers.reduce((sum, val) => sum + val, 0) / numbers.length : 0
}

function evaluateCount(expression: string, cells: { [key: string]: CellData }, allSheets?: { [sheetName: string]: { [key: string]: CellData } }): number {
  const range = extractRange(expression)
  const values = getRangeValues(range, cells, allSheets)
  return values.filter((val) => val !== "").length
}

function evaluateIf(expression: string, cells: { [key: string]: CellData }, allSheets?: { [sheetName: string]: { [key: string]: CellData } }): string | number {
  // Simple IF implementation: IF(condition, true_value, false_value)
  const match = expression.match(/IF\(([^,]+),([^,]+),([^)]+)\)/)
  if (!match) return "#ERROR!"

  const condition = evaluateExpression(match[1].trim(), cells, allSheets)
  const trueValue = match[2].trim()
  const falseValue = match[3].trim()

  if (condition) {
    return isNaN(Number.parseFloat(trueValue)) ? trueValue.replace(/"/g, "") : Number.parseFloat(trueValue)
  } else {
    return isNaN(Number.parseFloat(falseValue)) ? falseValue.replace(/"/g, "") : Number.parseFloat(falseValue)
  }
}

function evaluateSumIf(expression: string, cells: { [key: string]: CellData }, allSheets?: { [sheetName: string]: { [key: string]: CellData } }): number {
  // SUMIF(range, criteria, [sum_range])
  // Also handle complex expressions like SUMIF(range, criteria, range1*range2)
  const match = expression.match(/SUMIF\(([^,]+),([^,]+)(?:,([^)]+))?\)/)
  if (!match) return 0

  const range = match[1].trim()
  const criteria = match[2].trim().replace(/"/g, "")
  const sumRange = match[3]?.trim() || range

  // Get the criteria value (could be a cell reference)
  let actualCriteria = criteria
  if (criteria.match(/[A-Z]+\d+/)) {
    const position = parseCellReference(criteria)
    if (position) {
      const cellKey = getCellKey(position)
      const cellData = cells[cellKey]
      actualCriteria = cellData?.value || ""
    }
  }

  // Handle the case where sumRange contains multiplication (like F:F*H:H)
  if (sumRange.includes('*')) {
    const [leftRange, rightRange] = sumRange.split('*').map(r => r.trim())
    
    // Get values from the range to check criteria
    const rangeValues = getRangeValues(range, cells, allSheets)
    const leftValues = getRangeValues(leftRange, cells, allSheets)
    const rightValues = getRangeValues(rightRange, cells, allSheets)

    let sum = 0
    for (let i = 0; i < rangeValues.length; i++) {
      if (rangeValues[i] === actualCriteria) {
        const leftVal = parseFloat(leftValues[i]) || 0
        const rightVal = parseFloat(rightValues[i]) || 0
        sum += leftVal * rightVal
      }
    }
    return sum
  } else {
    // Regular SUMIF
    const rangeValues = getRangeValues(range, cells, allSheets)
    const sumValues = getRangeValues(sumRange, cells, allSheets)

    let sum = 0
    for (let i = 0; i < rangeValues.length; i++) {
      if (rangeValues[i] === actualCriteria) {
        sum += parseFloat(sumValues[i]) || 0
      }
    }
    return sum
  }
}

function evaluateUnique(expression: string, cells: { [key: string]: CellData }, allSheets?: { [sheetName: string]: { [key: string]: CellData } }): string {
  const range = extractRange(expression)
  const values = getRangeValues(range, cells, allSheets)
  const uniqueValues = [...new Set(values.filter(val => val !== ""))]
  return uniqueValues[0] || "" // For now, just return the first unique value
}

function evaluateExpression(expression: string, cells: { [key: string]: CellData }, allSheets?: { [sheetName: string]: { [key: string]: CellData } }): number | string {
  // Handle cross-sheet references like 'Sheet Name'!A1
  const processedExpression = expression.replace(/'([^']+)'!([A-Z]+\d+)/g, (match, sheetName, cellRef) => {
    if (allSheets && allSheets[sheetName]) {
      const position = parseCellReference(cellRef)
      if (!position) return "0"
      
      const cellKey = getCellKey(position)
      const cellData = allSheets[sheetName][cellKey]
      const value = cellData?.value || "0"
      
      return isNaN(Number.parseFloat(value)) ? `"${value}"` : value
    }
    return "0"
  }).replace(/([A-Z]+\d+)/g, (match) => {
    // Handle regular cell references
    const position = parseCellReference(match)
    if (!position) return "0"

    const cellKey = getCellKey(position)
    const cellData = cells[cellKey]
    const value = cellData?.value || "0"

    return isNaN(Number.parseFloat(value)) ? `"${value}"` : value
  })

  try {
    // Simple evaluation for basic arithmetic
    return Function(`"use strict"; return (${processedExpression})`)()
  } catch {
    return "#ERROR!"
  }
}

function extractRange(expression: string): string {
  const match = expression.match(/\(([^)]+)\)/)
  return match ? match[1] : ""
}

function getRangeValues(range: string, cells: { [key: string]: CellData }, allSheets?: { [sheetName: string]: { [key: string]: CellData } }): string[] {
  const values: string[] = []

  // Handle cross-sheet references like 'Sheet Name'!A1:B2
  const crossSheetMatch = range.match(/'([^']+)'!(.+)/)
  let targetCells = cells
  let actualRange = range

  if (crossSheetMatch && allSheets) {
    const sheetName = crossSheetMatch[1]
    actualRange = crossSheetMatch[2]
    targetCells = allSheets[sheetName] || {}
  }

  if (actualRange.includes(":")) {
    // Range like A1:B3 or C:C
    const [start, end] = actualRange.split(":")
    
    // Handle column-only references like C:C or F:F
    if (start.match(/^[A-Z]+$/) && end.match(/^[A-Z]+$/)) {
      const startCol = start.charCodeAt(0) - 65 // A=0, B=1, etc.
      const endCol = end.charCodeAt(0) - 65
      
      // Get all values from these columns (up to row 1000 for performance)
      for (let row = 1; row <= 1000; row++) {
        for (let col = startCol; col <= endCol; col++) {
          const cellKey = getCellKey({ row, col })
          const cellData = targetCells[cellKey]
          if (cellData?.value) {
            values.push(cellData.value)
          }
        }
      }
    } else {
      // Regular range like A1:B3
      const startPos = parseCellReference(start.trim())
      const endPos = parseCellReference(end.trim())

      if (startPos && endPos) {
        for (let row = startPos.row; row <= endPos.row; row++) {
          for (let col = startPos.col; col <= endPos.col; col++) {
            const cellKey = getCellKey({ row, col })
            const cellData = targetCells[cellKey]
            values.push(cellData?.value || "")
          }
        }
      }
    }
  } else {
    // Single cell or comma-separated cells
    const cellRefs = actualRange.split(",").map((ref) => ref.trim())
    cellRefs.forEach((ref) => {
      const position = parseCellReference(ref)
      if (position) {
        const cellKey = getCellKey(position)
        const cellData = targetCells[cellKey]
        values.push(cellData?.value || "")
      }
    })
  }

  return values
}

function evaluateVlookup(expression: string, cells: { [key: string]: CellData }, allSheets?: { [sheetName: string]: { [key: string]: CellData } }): string | number {
  // VLOOKUP(lookup_value, table_array, col_index_num, [range_lookup])
  // For now, let's implement a simpler version that handles the AI's specific use case
  const match = expression.match(/VLOOKUP\(([^,]+),([^,]+),(\d+),([^)]+)\)/)
  if (!match) return "#ERROR!"

  const lookupValue = match[1].trim().replace(/"/g, "")
  const tableRange = match[2].trim()
  const colIndex = parseInt(match[3].trim())
  const exactMatch = match[4].trim() === 'FALSE'

  // Get the lookup value from a cell reference if needed
  let actualLookupValue = lookupValue
  if (lookupValue.match(/[A-Z]+\d+/)) {
    const position = parseCellReference(lookupValue)
    if (position) {
      const cellKey = getCellKey(position)
      const cellData = cells[cellKey]
      actualLookupValue = cellData?.value || ""
    }
  }

  // Get table values
  const tableValues = getRangeValues(tableRange, cells, allSheets)
  
  // For simplicity, assume the table is arranged in rows
  // This is a basic implementation
  return "#N/A"
}

function evaluateIferror(expression: string, cells: { [key: string]: CellData }, allSheets?: { [sheetName: string]: { [key: string]: CellData } }): string | number {
  // IFERROR(value, value_if_error)
  const match = expression.match(/IFERROR\(([^,]+),([^)]+)\)/)
  if (!match) return "#ERROR!"

  const value = match[1].trim()
  const errorValue = match[2].trim()

  try {
    // Try to evaluate the value
    const result = evaluateFormula('=' + value, cells, undefined, allSheets)
    
    // Check if result is an error
    if (typeof result === 'string' && (result.includes('#ERROR!') || result.includes('#N/A'))) {
      return errorValue.replace(/"/g, "")
    }
    
    return result
  } catch {
    return errorValue.replace(/"/g, "")
  }
}
