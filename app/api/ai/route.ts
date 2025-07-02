import { NextRequest, NextResponse } from "next/server"
import { GoogleGenAI, Type } from '@google/genai'
import { loadSystemPrompts } from '@/lib/prompt-loader'

// Helper function to make Gemini API calls
async function makeGeminiCall(
  prompt: string, 
  context: any, 
  apiKey: string, 
  systemInstruction: string, 
  config: any, 
  ai: any, 
  model: string
): Promise<AIResponse> {
  // Update the system instruction in the config to include context from validation errors
  const updatedConfig = {
    ...config,
    systemInstruction: [{
      text: systemInstruction + (context?.messages ? 
        `\n\nCONVERSATION HISTORY:\n${context.messages.map((msg: any) => `${msg.role.toUpperCase()}: ${msg.content}${msg.ai_suggestion_status ? ` [${msg.ai_suggestion_status.toUpperCase()}]` : ''}`).join('\n')}` : 
        ''
      )
    }]
  }

  // Build the contents array  
  const contents = [
    {
      role: 'user',
      parts: [
        {
          text: prompt,
        },
      ],
    },
  ]

  // Make the API call
  const response = await ai.models.generateContent({
    model,
    config: updatedConfig,
    contents,
  })

  const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text
  if (!responseText) {
    throw new Error("No response text from Gemini")
  }

  console.log("Raw Gemini response (recursive):", responseText)

  // Parse JSON response
  try {
    const aiResponse = JSON.parse(responseText)
    console.log("Parsed AI response (recursive):", JSON.stringify(aiResponse, null, 2))
    return aiResponse
  } catch (parseError) {
    console.error("Failed to parse recursive Gemini response as JSON:", parseError)
    console.error("Response text was:", responseText)
    
    // If JSON parsing fails, create a fallback response
    return {
      actions: { none: true },
      message: responseText.substring(0, 500) + (responseText.length > 500 ? "..." : ""),
      recursive: false
    }
  }
}

// Define the expected response structure
interface AIResponse {
  actions?: {
    none?: boolean
    suggest_change?: Array<{
      type: string
      sheet: string // Required: which sheet to apply changes to
      range?: string
      formula?: string
      value?: string
      format?: any
      description: string
      preview?: string[]
    }>
    bulk_insert?: Array<{
      sheet: string // Required: which sheet to apply changes to
      start_cell: string // e.g., "A1"
      end_cell: string // e.g., "B3"
      data: string // JSON string: e.g., '{"1": ["val1", "val2"], "2": ["val3", "val4"]}'
      description: string
    }>
    create_sheet?: Array<{
      name: string
      description: string
      headers?: string[]
      initial_data?: string[][]
    }>
  }
  message: string
  recursive?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prompt, context, apiKey } = body

    // Log the context structure for debugging
    console.log("Received context structure:", {
      hasData: !!context?.data,
      hasMessages: !!context?.messages,
      dataItemsCount: context?.data?.context_items?.length || 0,
      messagesCount: context?.messages?.length || 0
    })

    // Use Gemini API if API key is provided
    if (apiKey) {
      try {
        const ai = new GoogleGenAI({
          apiKey: apiKey,
        })

        // Load system prompts from files
        const systemPrompts = await loadSystemPrompts()

        // Build system instruction from context and loaded prompts
        const systemInstruction = `
${systemPrompts.examples}

🚨 CONTEXT-SPECIFIC INSTRUCTIONS 🚨
Available sheets: ${context?.data?.summary?.sheet_names?.join(', ') || 'None'}

${systemPrompts.rules}

${systemPrompts.mission}

${systemPrompts.tools}

CURRENT CONTEXT:
- Available sheets: ${context?.data?.summary?.sheets || 0}
- Available labels: ${context?.data?.summary?.labels || 0} 
- Context items: ${context?.data?.context_items?.length || 0}
- Recent AI suggestions: ${context?.data?.recent_ai_suggestions?.length || 0}

CONVERSATION HISTORY:
${context?.messages?.map((msg: any) => `${msg.role.toUpperCase()}: ${msg.content}${msg.ai_suggestion_status ? ` [${msg.ai_suggestion_status.toUpperCase()}]` : ''}`).join('\n') || 'No previous messages'}

CRITICAL: You MUST respond ONLY with valid JSON. Do not include any text before or after the JSON.`.trim()

        const config = {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              actions: {
                type: Type.OBJECT,
                properties: {
                  none: {
                    type: Type.BOOLEAN,
                  },
                  suggest_change: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        type: { type: Type.STRING },
                        sheet: { type: Type.STRING },
                        range: { type: Type.STRING },
                        formula: { type: Type.STRING },
                        value: { type: Type.STRING },
                        format: { 
                          type: Type.OBJECT,
                          properties: {
                            backgroundColor: { type: Type.STRING },
                            textColor: { type: Type.STRING },
                            fontSize: { type: Type.STRING },
                            fontWeight: { type: Type.STRING },
                            border: { type: Type.STRING },
                            alignment: { type: Type.STRING }
                          }
                        },
                        description: { type: Type.STRING },
                        preview: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING }
                        }
                      },
                      required: ["type", "sheet", "description"]
                    }
                  },
                  bulk_insert: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        sheet: { type: Type.STRING },
                        start_cell: { type: Type.STRING },
                        end_cell: { type: Type.STRING },
                        data: {
                          type: Type.STRING,
                          description: "JSON string containing row data as object with row numbers as keys and arrays as values"
                        },
                        description: { type: Type.STRING }
                      },
                      required: ["sheet", "start_cell", "end_cell", "data", "description"]
                    }
                  },
                  create_sheet: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        description: { type: Type.STRING },
                        headers: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING }
                        },
                        initial_data: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                          }
                        }
                      },
                      required: ["name", "description"]
                    }
                  }
                },
              },
              message: {
                type: Type.STRING,
              },
              recursive: {
                type: Type.BOOLEAN,
              },
            },
            required: ["message"]
          },
          systemInstruction: [{
            text: systemInstruction
          }],
        }

        const model = 'gemini-2.0-flash'
        const contents = [
          {
            role: 'user',
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ]

        const response = await ai.models.generateContent({
          model,
          config,
          contents,
        })

        const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text
        if (!responseText) {
          throw new Error("No response text from Gemini")
        }

        console.log("Raw Gemini response:", responseText)

        // Try to parse the JSON response
        let aiResponse: AIResponse
        try {
          aiResponse = JSON.parse(responseText)
          console.log("Parsed AI response:", JSON.stringify(aiResponse, null, 2))
        } catch (parseError) {
          console.error("Failed to parse Gemini response as JSON:", parseError)
          console.error("Response text was:", responseText)
          
          // If JSON parsing fails, create a fallback response
          aiResponse = {
            actions: { none: true },
            message: responseText.substring(0, 500) + (responseText.length > 500 ? "..." : ""),
            recursive: false
          }
        }
        
        // Validate and process the AI response
        const processedResponse = await validateAndProcessAIResponse(aiResponse, context)
        
        // Check if validation errors occurred - if so, auto-correct by making a recursive AI call
        if (processedResponse.validation_errors && processedResponse.validation_errors.length > 0) {
          console.log("🚨 VALIDATION ERRORS DETECTED - Starting auto-correction process...")
          console.log("Original validation errors:", processedResponse.validation_errors)
          
          // Create a system message with validation feedback for auto-correction
          const validationFeedback = "CRITICAL VALIDATION ERROR - YOUR PREVIOUS RESPONSE WAS INVALID: " + processedResponse.validation_errors.join(' ') + "\n\nYou MUST fix these errors and provide a corrected response. Pay special attention to using the correct action types and following the required JSON schema."
          
          // Add the validation error to context as a system message
          const updatedContext = {
            ...context,
            messages: [
              ...(context?.messages || []),
              {
                role: "system",
                content: validationFeedback,
                timestamp: new Date().toISOString(),
                ai_suggestion_status: "validation_error"
              }
            ]
          }
          
          console.log("📞 Making recursive AI call with validation feedback...")
          
          // Make a recursive call to the AI with the validation feedback
          try {
            const correctionPrompt = `CORRECTION REQUIRED: Your previous response had critical validation errors. Please provide a corrected response for the original user request: "${prompt}"\n\nPay special attention to the validation errors in the conversation history above.`
            
            const recursiveResponse = await makeGeminiCall(correctionPrompt, updatedContext, apiKey, systemInstruction, config, ai, model)
            
            // Validate the recursive response
            const recursiveProcessed = await validateAndProcessAIResponse(recursiveResponse, updatedContext)
            
            // If the recursive response also has validation errors, return a generic error (hide specifics from user)
            if (recursiveProcessed.validation_errors && recursiveProcessed.validation_errors.length > 0) {
              console.log("❌ Auto-correction failed - recursive response also had validation errors")
              console.log("Recursive validation errors:", recursiveProcessed.validation_errors)
              
              return NextResponse.json({
                response: {
                  changes: [],
                  sheets: [],
                  bulk_inserts: [],
                  explanation: "I apologize, but I encountered some technical difficulties processing your request. Please try rephrasing your request or breaking it into smaller parts.",
                  recursive: false,
                  auto_correction_failed: true
                }
              })
            }
            
            // Return the corrected response (validation errors are completely hidden from user)
            console.log("✅ Auto-correction successful! Returning corrected response to user")
            return NextResponse.json({
              response: {
                changes: recursiveProcessed.changes || [],
                sheets: recursiveProcessed.sheets || [],
                bulk_inserts: recursiveProcessed.bulk_inserts || [],
                explanation: recursiveProcessed.message,
                recursive: recursiveProcessed.recursive || false,
                auto_corrected: true // Flag to indicate this was auto-corrected (for debugging)
              }
            })
            
          } catch (recursiveError) {
            console.error("💥 Recursive AI call failed:", recursiveError)
            
            // Return a generic error message (hide technical details from user)
            return NextResponse.json({
              response: {
                changes: [],
                sheets: [],
                bulk_inserts: [],
                explanation: "I'm having trouble processing your request right now. Please try again in a moment or rephrase your request.",
                recursive: false,
                auto_correction_error: true
              }
            })
          }
        }
        
        // Convert AI response to expected format (no validation errors)
        const formattedResponse = {
          response: {
            changes: processedResponse.changes || [],
            sheets: processedResponse.sheets || [],
            bulk_inserts: processedResponse.bulk_inserts || [],
            explanation: processedResponse.message,
            recursive: processedResponse.recursive || false
          }
        }

        return NextResponse.json(formattedResponse)

      } catch (geminiError) {
        console.error("Gemini API error:", geminiError)
        // Fall through to mock response if Gemini fails
      }
    }

    // For now, return a mock response that shows we received the structured context
    const mockResponse = {
      response: {
        changes: [
          {
            type: "analysis",
            sheet: context?.data?.context_items?.[0]?.name || "Current Sheet",
            description: `I received your request: "${prompt}". I can see ${context?.data?.context_items?.length || 0} context items and ${context?.messages?.length || 0} previous messages.`,
            context_summary: {
              sheets_in_context: context?.data?.summary?.sheets || 0,
              labels_in_context: context?.data?.summary?.labels || 0,
              conversation_length: context?.messages?.length || 0
            }
          }
        ],
        explanation: "Context successfully received in LangChain format. System prompts are loaded server-side. Ready for AI processing."
      }
    }

    // Here you would integrate with your AI service (Google AI, OpenAI, etc.)
    // Example:
    // const aiResponse = await callAIService(context, prompt, apiKey)
    
    return NextResponse.json(mockResponse)
  } catch (error) {
    console.error("AI API error:", error)
    return NextResponse.json(
      { error: "Failed to process AI request" },
      { status: 500 }
    )
  }
}

// Helper function to parse cell reference (e.g., "A1" -> {col: 0, row: 0})
function parseCellReference(cellRef: string): {col: number, row: number} {
  const match = cellRef.match(/^([A-Z]+)(\d+)$/)
  if (!match) throw new Error(`Invalid cell reference: ${cellRef}`)
  
  const colStr = match[1]
  const rowNum = parseInt(match[2]) - 1 // Convert to 0-based
  
  // Convert column letters to number (A=0, B=1, ..., Z=25, AA=26, etc.)
  let colNum = 0
  for (let i = 0; i < colStr.length; i++) {
    colNum = colNum * 26 + (colStr.charCodeAt(i) - 65 + 1)
  }
  colNum -= 1 // Convert to 0-based
  
  return {col: colNum, row: rowNum}
}

// Helper function to validate bulk insert data
function validateBulkInsertData(startCell: string, endCell: string, data: Record<string, string[]>): string[] {
  const errors: string[] = []
  
  try {
    const start = parseCellReference(startCell)
    const end = parseCellReference(endCell)
    
    // Calculate expected dimensions
    const expectedCols = end.col - start.col + 1
    const expectedRows = end.row - start.row + 1
    
    if (expectedCols <= 0 || expectedRows <= 0) {
      errors.push(`Invalid cell range: ${startCell} to ${endCell}. End cell must be after start cell.`)
      return errors
    }
    
    // Validate data structure
    const dataRows = Object.keys(data).map(k => parseInt(k)).sort((a, b) => a - b)
    const minRow = start.row + 1 // Convert back to 1-based for comparison
    const maxRow = end.row + 1
    
    // Check if all rows are within expected range
    for (const rowNum of dataRows) {
      if (rowNum < minRow || rowNum > maxRow) {
        errors.push(`Row ${rowNum} is outside the specified range. Expected rows ${minRow} to ${maxRow}.`)
      }
    }
    
    // Check if all rows have correct number of columns
    for (const [rowKey, rowData] of Object.entries(data)) {
      if (rowData.length !== expectedCols) {
        errors.push(
          `Row ${rowKey} has ${rowData.length} columns, but expected ${expectedCols} columns ` +
          `(from ${startCell} to ${endCell} = ${expectedCols} columns × ${expectedRows} rows).`
        )
      }
    }
    
    // Check for missing rows (if user intended to fill all rows)
    const providedRows = dataRows.length
    if (providedRows < expectedRows) {
      errors.push(
        `Only ${providedRows} rows provided, but cell range expects ${expectedRows} rows. ` +
        `Please provide data for all rows ${minRow} to ${maxRow}, or adjust the end_cell.`
      )
    }
    
  } catch (error) {
    errors.push(`Error parsing cell references: ${error instanceof Error ? error.message : String(error)}`)
  }
  
  return errors
}

// Validation function to check AI responses
async function validateAndProcessAIResponse(aiResponse: AIResponse, context: any) {
  const availableSheets = context?.data?.summary?.sheet_names || []
  
  // Also get sheets from context_items (this includes sheets that were just created)
  const sheetsFromContext = new Set<string>()
  if (context?.data?.context_items) {
    for (const item of context.data.context_items) {
      if (item.type === 'sheet' && item.name) {
        sheetsFromContext.add(item.name)
      }
    }
  }
  
  // Also check for sheets that were created in the conversation history using multiple patterns
  const sheetsCreatedInConversation = new Set<string>()
  if (context?.messages) {
    for (const message of context.messages) {
      if (message.content && typeof message.content === 'string') {
        // Look for successful sheet creation messages with different patterns
        const patterns = [
          /created.*sheet.*['"`]([^'"`]+)['"`]/gi,  // created new sheet "Name"
          /created.*['"`]([^'"`]+)['"`].*sheet/gi,  // created "Name" sheet
          /new.*sheet.*['"`]([^'"`]+)['"`]/gi,      // new sheet "Name"
          /sheet.*['"`]([^'"`]+)['"`].*created/gi,  // sheet "Name" created
          /Created sheet:\s*([^-\n]+)/gi,          // Created sheet: Name
          /•\s*Created sheet:\s*([^-\n]+)/gi       // • Created sheet: Name
        ]
        
        for (const pattern of patterns) {
          let match
          while ((match = pattern.exec(message.content)) !== null) {
            sheetsCreatedInConversation.add(match[1].trim())
          }
        }
      }
    }
  }
  
  // Combine all available sheets
  const allAvailableSheets = [
    ...availableSheets, 
    ...Array.from(sheetsFromContext),
    ...Array.from(sheetsCreatedInConversation)
  ]
  
  console.log("Available sheets for validation:", allAvailableSheets)
  console.log("Sheets from context items:", Array.from(sheetsFromContext))
  console.log("Sheets created in conversation:", Array.from(sheetsCreatedInConversation))
  
  const validationErrors: string[] = []
  
  // Check if we have create_sheet actions
  const createSheetActions = aiResponse.actions?.create_sheet || []
  const suggestChangeActions = aiResponse.actions?.suggest_change || []
  const bulkInsertActions = aiResponse.actions?.bulk_insert || []
  
  // Validate sheet references in suggest_change actions
  const sheetsToCreate = new Set(createSheetActions.map(action => action.name))
  
  // Also check for suggest_change actions that are trying to create sheets (common AI mistake)
  const suggestChangeSheetCreations = suggestChangeActions.filter(action => 
    action.type === "create_sheet" || 
    (action.description?.toLowerCase().includes("create") && action.description?.toLowerCase().includes("sheet")) ||
    (action.description?.toLowerCase().includes("new sheet")) ||
    (!allAvailableSheets.includes(action.sheet) && !sheetsToCreate.has(action.sheet))
  )
  
  if (suggestChangeSheetCreations.length > 0) {
    const invalidActions = suggestChangeSheetCreations.map(a => `"${a.description}" (trying to use sheet "${a.sheet}")`).join(', ')
    
    validationErrors.push(
      `CRITICAL ERROR: Found ${suggestChangeSheetCreations.length} suggest_change actions trying to create or reference non-existent sheets. ` +
      `This is INVALID. You MUST use the "create_sheet" action to create new sheets FIRST. ` +
      `\n\nAvailable sheets: ${allAvailableSheets.join(', ')}\n` +
      `\nWRONG FORMAT (what you did):\n` +
      `"suggest_change": [{"type": "create_sheet", "sheet": "NonExistentSheet", ...}]\n` +
      `OR\n` +
      `"suggest_change": [{"sheet": "NonExistentSheet", "type": "value", ...}]\n\n` +
      `CORRECT FORMAT (what you should do):\n` +
      `"create_sheet": [{"name": "NewSheetName", "description": "...", "headers": [...]}]\n\n` +
      `Invalid actions: ${invalidActions}\n\n` +
      `IMPORTANT: You cannot reference sheets that don't exist yet. Create the sheet FIRST using create_sheet action.`
    )
  }
  
  for (const change of suggestChangeActions) {
    // Skip validation for sheet creation attempts or non-existent sheet references (already handled above)
    if (change.type === "create_sheet" || 
        (change.description?.toLowerCase().includes("create") && change.description?.toLowerCase().includes("sheet")) ||
        (change.description?.toLowerCase().includes("new sheet")) ||
        (!allAvailableSheets.includes(change.sheet) && !sheetsToCreate.has(change.sheet))) {
      continue
    }
    
    if (change.sheet && !allAvailableSheets.includes(change.sheet) && !sheetsToCreate.has(change.sheet)) {
      validationErrors.push(
        `Sheet "${change.sheet}" does not exist. Available sheets: ${allAvailableSheets.join(', ')}. ` +
        `If you want to create this sheet, use the "create_sheet" action instead of "suggest_change".`
      )
    }

    // Validate against JSON array values (common mistake)
    if (change.value && typeof change.value === 'string' && change.value.trim().startsWith('[[')) {
      validationErrors.push(
        `Invalid value format in change "${change.description}". ` +
        `You're trying to insert a JSON array as a single cell value. ` +
        `For bulk data, use bulk_insert action instead.`
      )
    }

    // Check for overly large single-cell values
    if (change.value && typeof change.value === 'string' && change.value.length > 1000) {
      validationErrors.push(
        `Value too large in change "${change.description}". ` +
        `Single cell values should be concise. For bulk data, use bulk_insert action instead.`
      )
    }
  }
  
  // Validate bulk_insert actions
  for (const bulkAction of bulkInsertActions) {
    if (bulkAction.sheet && !allAvailableSheets.includes(bulkAction.sheet) && !sheetsToCreate.has(bulkAction.sheet)) {
      validationErrors.push(
        `Sheet "${bulkAction.sheet}" does not exist. Available sheets: ${allAvailableSheets.join(', ')}.`
      )
    }
    
    // Parse and validate bulk insert data structure
    try {
      const parsedData = JSON.parse(bulkAction.data) as Record<string, string[]>
      const bulkErrors = validateBulkInsertData(bulkAction.start_cell, bulkAction.end_cell, parsedData)
      validationErrors.push(...bulkErrors.map(err => `Bulk insert "${bulkAction.description}": ${err}`))
    } catch (parseError) {
      validationErrors.push(
        `Bulk insert "${bulkAction.description}": Invalid JSON data format. ` +
        `Expected JSON object with row numbers as keys and arrays as values.`
      )
    }
  }
  
  // If there are validation errors, return error response
  if (validationErrors.length > 0) {
    return {
      changes: [],
      sheets: [],
      bulk_inserts: [],
      message: `Validation errors found:\n${validationErrors.join('\n')}\n\nPlease correct your response and try again.`,
      recursive: false,
      validation_errors: validationErrors
    }
  }
  
  // Return processed response with sheets first, then changes
  return {
    changes: suggestChangeActions,
    sheets: createSheetActions,
    bulk_inserts: bulkInsertActions,
    message: aiResponse.message,
    recursive: aiResponse.recursive || false
  }
}
