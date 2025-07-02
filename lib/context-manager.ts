export interface ContextItem {
  id: string
  type: "sheet" | "text"
  name: string
  content: string
  timestamp: Date
}

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  context?: ContextItem[]
  aiResponse?: {
    changes: any[]
    sheets?: any[]
    bulk_inserts?: any[]
    explanation: string
    recursive?: boolean
    status?: "pending" | "accepted" | "rejected"
    appliedAt?: Date
  }
}

export interface SheetData {
  name: string
  data: any[][] | { row: number; col: number; value: string | undefined }[]
  labels?: any[]
}

export class ContextManager {
  private contexts: ContextItem[] = []
  private chatHistory: ChatMessage[] = []
  private maxContextLength = 8000 // Max tokens for context
  private availableSheets: SheetData[] = [] // Track all available sheets
  private systemPrompts: { rules: string; mission: string; tools: string } = { rules: "", mission: "", tools: "" }

  constructor() {
    // System prompts are now loaded server-side in API routes
    // Set fallback prompts for client-side context building (not used in actual API calls)
    this.systemPrompts = {
      rules: "System prompts loaded server-side via API",
      mission: "System prompts loaded server-side via API", 
      tools: "System prompts loaded server-side via API"
    }
  }


  // Get current system prompts (fallback values, real prompts are server-side)
  getSystemPrompts() {
    return { ...this.systemPrompts }
  }

  // Set all available sheets (called when data loads)
  setAvailableSheets(sheets: SheetData[]): void {
    this.availableSheets = sheets
  }

  // Get sheets that are not in context yet
  getAvailableSheets(): SheetData[] {
    const contextSheetNames = new Set(this.contexts.filter((c) => c.type === "sheet").map((c) => c.name))

    return this.availableSheets.filter((sheet) => !contextSheetNames.has(sheet.name))
  }

  // Auto-add or update sheet context (called when sheet is viewed/edited)
  addOrUpdateSheetContext(sheet: SheetData): ContextItem {
    // Check if sheet context already exists
    const existingIndex = this.contexts.findIndex((c) => c.type === "sheet" && c.name === sheet.name)

    const contextItem: ContextItem = {
      id: existingIndex >= 0 ? this.contexts[existingIndex].id : `sheet-${Date.now()}`,
      type: "sheet",
      name: sheet.name,
      content: this.formatSheetForContext(sheet),
      timestamp: new Date(),
    }

    if (existingIndex >= 0) {
      // Update existing context
      this.contexts[existingIndex] = contextItem
    } else {
      // Add new context
      this.contexts.push(contextItem)
    }

    return contextItem
  }

  // Add sheet context by name (called from "+ available sheets" dialog)
  addSheetContextByName(sheetName: string): ContextItem | null {
    const sheet = this.availableSheets.find((s) => s.name === sheetName)
    if (!sheet) return null

    return this.addOrUpdateSheetContext(sheet)
  }

  addTextContext(name: string, content: string): ContextItem {
    const contextItem: ContextItem = {
      id: `text-${Date.now()}`,
      type: "text",
      name,
      content,
      timestamp: new Date(),
    }

    this.contexts.push(contextItem)
    return contextItem
  }

  removeContext(id: string): void {
    this.contexts = this.contexts.filter((ctx) => ctx.id !== id)
  }

  getContexts(): ContextItem[] {
    return [...this.contexts]
  }

  addChatMessage(role: "user" | "assistant", content: string, aiResponse?: any): ChatMessage {
    const message: ChatMessage = {
      id: `msg-${Date.now()}`,
      role,
      content,
      timestamp: new Date(),
      context: [...this.contexts], // Include all current contexts
      aiResponse: aiResponse
    }

    this.chatHistory.push(message)
    return message
  }

  getChatHistory(): ChatMessage[] {
    return [...this.chatHistory]
  }

  clearChatHistory(): void {
    this.chatHistory = []
  }

  // Update the status of an AI suggestion
  updateSuggestionStatus(messageId: string, status: "accepted" | "rejected"): void {
    const message = this.chatHistory.find(msg => msg.id === messageId)
    if (message && message.aiResponse) {
      message.aiResponse.status = status
      message.aiResponse.appliedAt = new Date()
    }
  }

  // Get recent AI suggestions for context
  getRecentAISuggestions(limit: number = 5): Array<{
    messageId: string
    suggestion: any
    status: string
    timestamp: Date
  }> {
    return this.chatHistory
      .filter(msg => msg.role === "assistant" && msg.aiResponse?.changes && msg.aiResponse.changes.length > 0)
      .slice(-limit)
      .map(msg => ({
        messageId: msg.id,
        suggestion: msg.aiResponse!.changes,
        status: msg.aiResponse!.status || "pending",
        timestamp: msg.timestamp
      }))
  }

  buildContextString(includeChatHistory = true): string {
    // Create a structured payload for LangChain-style processing
    const payload = this.buildStructuredPayload(includeChatHistory)
    return JSON.stringify(payload, null, 2)
  }

  buildStructuredPayload(includeChatHistory = true) {
    const recentSuggestions = this.getRecentAISuggestions(3)
    
    return {
      data: {
        context_items: this.contexts.map(context => ({
          id: context.id,
          type: context.type,
          name: context.name,
          content: context.content,
          timestamp: context.timestamp.toISOString()
        })),
        summary: {
          total_items: this.contexts.length,
          sheets: this.contexts.filter(c => c.type === "sheet").length,
          labels: this.contexts.filter(c => c.type === "text" && c.name.startsWith("Label: ")).length,
          text_contexts: this.contexts.filter(c => c.type === "text" && !c.name.startsWith("Label: ")).length,
          sheet_names: [
            ...new Set([ // Use Set to remove duplicates
              ...this.availableSheets.map(sheet => sheet.name), // Add existing sheet names
              ...this.contexts.filter(c => c.type === "sheet").map(c => c.name) // Add sheet names from context
            ])
          ],
        },
        recent_ai_suggestions: recentSuggestions.map(s => ({
          suggestion_id: s.messageId,
          changes: s.suggestion,
          status: s.status,
          timestamp: s.timestamp.toISOString()
        }))
      },
      messages: includeChatHistory ? this.chatHistory.slice(-20).map(message => ({
        role: message.role,
        content: message.content,
        timestamp: message.timestamp.toISOString(),
        ai_suggestion_status: message.aiResponse?.status
      })) : []
    }
  }

  private formatSheetForContext(sheet: SheetData): string {
    if (!sheet.data || sheet.data.length === 0) return JSON.stringify({ sheet: sheet.name, status: "empty" }, null, 2)

    // Handle different data formats - ensure we have a 2D array
    let processedData: any[][]

    if (Array.isArray(sheet.data[0])) {
      // Already a 2D array
      processedData = sheet.data as any[][]
    } else {
      // Convert object format {row, col, value} to 2D array
      const cellData = sheet.data as { row: number; col: number; value: string | undefined }[]
      
      // Find bounds
      const maxRow = cellData.length > 0 ? Math.max(...cellData.map(item => item.row || 0)) : 0
      const maxCol = cellData.length > 0 ? Math.max(...cellData.map(item => item.col || 0)) : 0

      // Initialize 2D array
      processedData = Array(maxRow + 1)
        .fill(null)
        .map(() => Array(maxCol + 1).fill(""))

      // Populate with cell data
      cellData.forEach((item) => {
        if (item.row !== undefined && item.col !== undefined) {
          processedData[item.row][item.col] = item.value || ""
        }
      })
    }

    // Get first few rows and columns for context
    const maxRows = 10
    const maxCols = 10
    const data = processedData.slice(0, maxRows)
    const maxColCount = Math.min(maxCols, Math.max(...data.map((row) => row?.length || 0)))

    // Create structured data
    const sheetData: any = {
      sheet_name: sheet.name,
      dimensions: {
        total_rows: processedData.length,
        total_columns: maxColCount,
        preview_rows: Math.min(maxRows, processedData.length),
        preview_columns: maxColCount
      },
      headers: data.length > 0 && data[0] ? data[0].slice(0, maxColCount) : [],
      data_rows: []
    }

    // Add data rows
    for (let i = 1; i < data.length; i++) {
      if (data[i]) {
        const row = data[i].slice(0, maxColCount)
        sheetData.data_rows.push({
          row_number: i,
          values: row
        })
      }
    }

    // Add labels information if available
    if (sheet.labels && sheet.labels.length > 0) {
      sheetData.labels = sheet.labels.map((label: any) => ({
        name: label.name,
        description: label.description || "No description",
        range: `${String.fromCharCode(65 + label.startCol)}${label.startRow + 1}:${String.fromCharCode(65 + label.endCol)}${label.endRow + 1}`,
        type: label.type,
        color: label.color,
        linked_labels: label.linkedLabels || [],
        data: label.data || {}
      }))
    }

    return JSON.stringify(sheetData, null, 2)
  }
}

// Global instance
export const contextManager = new ContextManager()
