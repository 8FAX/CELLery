"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import {
  Sparkles,
  MessageSquare,
  Send,
  RotateCcw,
  Plus,
  Trash2,
  FileText,
  Sheet,
  Loader2,
  Key,
  Tag,
  X,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { AiSuggestionPanel } from "./ai-suggestion-panel"
import type { ContextItem } from "@/lib/context-manager"
import { contextManager } from "@/lib/context-manager"

interface ChatMessage {
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

interface AiChatSidebarProps {
  onSubmit: (prompt: string) => void
  isProcessing: boolean
  chatHistory: ChatMessage[]
  onAcceptChanges: (changes: any[], messageId?: string, bulkInserts?: any[]) => void
  onRejectChanges: (messageId: string) => void
  onAcceptAll: () => void
  contexts: ContextItem[]
  onRemoveContext: (id: string) => void
  onAddTextContext: (name: string, content: string) => void
  onAddAvailableSheet: (sheetName: string) => void
  onAddAvailableLabel: (label: any) => void
  getAvailableSheets: () => any[]
  getAvailableLabels: () => any[]
  onClearChat: () => void
  apiKey: string
  onApiKeyChange: (key: string) => void
}

export function AiChatSidebar({
  onSubmit,
  isProcessing,
  chatHistory,
  onAcceptChanges,
  onRejectChanges,
  onAcceptAll,
  contexts,
  onRemoveContext,
  onAddTextContext,
  onAddAvailableSheet,
  onAddAvailableLabel,
  getAvailableSheets,
  getAvailableLabels,
  onClearChat,
  apiKey,
  onApiKeyChange,
}: AiChatSidebarProps) {
  const [prompt, setPrompt] = useState("")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newContextName, setNewContextName] = useState("")
  const [newContextContent, setNewContextContent] = useState("")
  const [showApiKeyInput, setShowApiKeyInput] = useState(false)
  const [showDebugDialog, setShowDebugDialog] = useState(false)
  const [systemPrompts, setSystemPrompts] = useState<{rules: string, mission: string, tools: string} | null>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]")
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight
      }
    }
  }, [chatHistory])

  // Fetch system prompts for debug view
  const fetchSystemPrompts = async () => {
    try {
      const response = await fetch('/api/system-prompts')
      if (response.ok) {
        const prompts = await response.json()
        setSystemPrompts(prompts)
      }
    } catch (error) {
      console.warn("Could not fetch system prompts for debug:", error)
      setSystemPrompts({
        rules: "Could not load rules",
        mission: "Could not load mission", 
        tools: "Could not load tools"
      })
    }
  }

  // Keyboard shortcut for debug dialog (Ctrl+Shift+D)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault()
        setShowDebugDialog(true)
        fetchSystemPrompts()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleSubmit = () => {
    if (prompt.trim() && !isProcessing) {
      onSubmit(prompt)
      setPrompt("")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleAddTextContext = () => {
    if (newContextName.trim() && newContextContent.trim()) {
      onAddTextContext(newContextName, newContextContent)
      setNewContextName("")
      setNewContextContent("")
      setShowAddDialog(false)
    }
  }

  const handleReject = () => {
    console.log("AI suggestion rejected by user.")
  }

  return (
    <div className="w-full bg-white/90 backdrop-blur-sm flex flex-col h-full border-l border-gray-200">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold">AI Assistant</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowDebugDialog(true)
                fetchSystemPrompts()
              }}
              className="text-gray-500 hover:text-blue-600"
              title="Debug Context (Ctrl+Shift+D)"
            >
              🐛
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearChat}
              className="text-gray-500 hover:text-red-600"
              title="Clear Chat History"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* API Key Section */}
      <div className="flex-shrink-0 p-3 border-b bg-blue-50/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Key className="h-4 w-4" />
            Google AI API Key
          </span>
          <Button variant="ghost" size="sm" onClick={() => setShowApiKeyInput(!showApiKeyInput)} className="text-xs">
            {apiKey ? "Update" : "Set Key"}
          </Button>
        </div>

        {showApiKeyInput && (
          <div className="space-y-2">
            <Input
              type="password"
              placeholder="Enter your Google AI API key..."
              value={apiKey}
              onChange={(e) => onApiKeyChange(e.target.value)}
              className="text-sm"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setShowApiKeyInput(false)} disabled={!apiKey.trim()}>
                Save
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowApiKeyInput(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {!showApiKeyInput && (
          <div className="text-xs text-gray-600">
            {apiKey ? (
              <span className="text-green-600">✓ API key configured</span>
            ) : (
              <span className="text-orange-600">⚠ API key required</span>
            )}
          </div>
        )}
      </div>

      {/* Context Management */}
      <div className="flex-shrink-0 p-3 border-b bg-gray-50/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Context ({contexts.length})</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowAddDialog(!showAddDialog)}
            className="h-6 w-6"
            title="Add context"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="max-h-32 overflow-y-auto">
          <div className="space-y-1 pr-2">
            {contexts.map((context) => (
              <div
                key={`${context.id}-${contexts.length}`}
                className="flex items-center gap-2 text-xs p-1.5 hover:bg-gray-200/50 rounded-md"
              >
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  {context.type === "sheet" ? (
                    <Sheet className="h-4 w-4 text-green-600 flex-shrink-0" />
                  ) : context.name.startsWith("Label: ") ? (
                    <Tag className="h-4 w-4 text-purple-600 flex-shrink-0" />
                  ) : (
                    <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  )}
                  <span className="truncate text-gray-800 font-medium">{context.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    console.log("Removing context:", context.id, context.name)
                    onRemoveContext(context.id)
                  }}
                  className="h-6 w-6 text-gray-400 hover:text-red-600 flex-shrink-0"
                  title={`Remove ${context.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {contexts.length === 0 && (
              <div className="text-center text-gray-500 py-2">
                <p className="text-xs">No context added yet</p>
              </div>
            )}
          </div>
        </div>

        {showAddDialog && (
          <div className="mt-2 p-3 border rounded-md bg-white space-y-2 shadow-sm">
            <div className="flex flex-col gap-2">
              <h4 className="text-sm font-medium">Add Context</h4>

              {/* Available Sheets Section */}
              {getAvailableSheets().length > 0 && (
                <div>
                  <p className="text-xs text-gray-600 mb-1">Available Sheets:</p>
                  <ScrollArea className="max-h-20">
                    <div className="flex flex-wrap gap-1 pr-2">
                      {getAvailableSheets().map((sheet: any) => (
                        <Button
                          key={sheet.name}
                          variant="outline"
                          size="sm"
                          className="text-xs h-6 px-2 flex-shrink-0 bg-transparent"
                          onClick={() => {
                            onAddAvailableSheet(sheet.name)
                            setShowAddDialog(false)
                          }}
                        >
                          <Sheet className="h-3 w-3 mr-1" />
                          {sheet.name}
                        </Button>
                      ))}
                    </div>
                    <ScrollBar orientation="vertical" />
                  </ScrollArea>
                </div>
              )}

              {/* Available Labels Section */}
              {getAvailableLabels().length > 0 && (
                <div>
                  <p className="text-xs text-gray-600 mb-1">Available Labels:</p>
                  <ScrollArea className="max-h-20">
                    <div className="flex flex-wrap gap-1 pr-2">
                      {getAvailableLabels().map((label: any) => (
                        <Button
                          key={label.id}
                          variant="outline"
                          size="sm"
                          className="text-xs h-6 px-2 flex-shrink-0 bg-transparent"
                          onClick={() => {
                            onAddAvailableLabel(label)
                            setShowAddDialog(false)
                          }}
                        >
                          <Tag className="h-3 w-3 mr-1" />
                          {label.name}
                        </Button>
                      ))}
                    </div>
                    <ScrollBar orientation="vertical" />
                  </ScrollArea>
                </div>
              )}

              {/* Text Context Section */}
              <div>
                <p className="text-xs text-gray-600 mb-1">Add Text Context:</p>
                <Input
                  type="text"
                  placeholder="Context name..."
                  value={newContextName}
                  onChange={(e) => setNewContextName(e.target.value)}
                  className="text-sm mb-1"
                />
                <Textarea
                  placeholder="Paste text or content here..."
                  value={newContextContent}
                  onChange={(e) => setNewContextContent(e.target.value)}
                  rows={3}
                  className="text-sm resize-y"
                />
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    onClick={handleAddTextContext}
                    disabled={!newContextName.trim() || !newContextContent.trim()}
                  >
                    Add Text
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowAddDialog(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chat History */}
      <div className="flex-1 flex flex-col min-h-0">
        <ScrollArea className="flex-1" ref={scrollAreaRef}>
          <div className="p-4 space-y-4">
            {chatHistory.length === 0 ? (
              <div className="text-center text-gray-500 pt-16">
                <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">Start a conversation</p>
                <p className="text-sm">Ask me to analyze, format, or calculate data in your sheet.</p>
              </div>
            ) : (
              chatHistory.map((message, index) => (
                <div key={message.id} className="space-y-3">
                  {message.role === "user" ? (
                    <div className="flex justify-end">
                      <div className="bg-blue-500 text-white rounded-lg rounded-br-none p-3 max-w-sm">
                        <p className="text-sm">{message.content}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 rounded-lg rounded-bl-none p-3 max-w-sm w-full">
                        <div className="space-y-3">
                          {/* Always show the message content */}
                          <div className="text-sm text-gray-700">
                            <p>{typeof message.content === 'string' ? message.content : JSON.stringify(message.content)}</p>
                          </div>
                          
                          {/* Show created sheets if any */}
                          {message.aiResponse?.sheets && message.aiResponse.sheets.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs text-blue-600 font-medium">📋 Created Sheets:</p>
                              {message.aiResponse.sheets.map((sheet: any, index: number) => (
                                <div key={index} className="bg-blue-50 border border-blue-200 rounded p-2">
                                  <div className="text-xs font-medium text-blue-800">{sheet.name}</div>
                                  <div className="text-xs text-blue-600">{sheet.description}</div>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* Show AI suggestions if any */}
                          {(message.aiResponse?.changes && message.aiResponse.changes.length > 0) || 
                           (message.aiResponse?.bulk_inserts && message.aiResponse.bulk_inserts.length > 0) ? (
                            <AiSuggestionPanel
                              suggestions={{
                                prompt: "", // We don't need to show the prompt again
                                changes: message.aiResponse.changes || [],
                                bulk_inserts: message.aiResponse.bulk_inserts || [],
                                explanation: message.aiResponse.explanation
                              }}
                              onAccept={(changes, bulkInserts) => onAcceptChanges(changes, message.id, bulkInserts)}
                              onReject={() => onRejectChanges(message.id)}
                              status={message.aiResponse.status}
                            />
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Accept All Button */}
      {chatHistory.some(msg => 
        msg.aiResponse?.status === "pending" && 
        ((msg.aiResponse.changes && msg.aiResponse.changes.length > 0) || 
         (msg.aiResponse.bulk_inserts && msg.aiResponse.bulk_inserts.length > 0))
      ) && (
        <div className="px-3 py-2 border-t bg-blue-50">
          <Button
            onClick={onAcceptAll}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            size="sm"
          >
            <Check className="h-4 w-4 mr-2" />
            Accept All Suggestions
          </Button>
        </div>
      )}

      {/* Input Area */}
      <div className="flex-shrink-0 p-3 border-t bg-gray-50">
        <div className="relative">
          <Textarea
            placeholder={apiKey ? "e.g., 'Calculate the average of column C'" : "Please set your API key first"}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            className="pr-12 resize-none"
            disabled={isProcessing || !apiKey}
          />
          <Button
            onClick={handleSubmit}
            size="icon"
            className="absolute right-2 bottom-2 h-8 w-8"
            disabled={isProcessing || !prompt.trim() || !apiKey}
            title="Send Message"
          >
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Debug Dialog */}
      {showDebugDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] pointer-events-auto">
          <div className="bg-white rounded-lg p-6 w-[80vw] max-w-4xl max-h-[80vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Debug: Current Context</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowDebugDialog(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">System Prompts Status</h4>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  {systemPrompts ? Object.entries(systemPrompts).map(([key, value]) => (
                    <div key={key} className="p-2 border rounded">
                      <div className="font-medium capitalize">{key}</div>
                      <div className={`text-xs ${value ? 'text-green-600' : 'text-red-600'}`}>
                        {value ? `✓ Loaded (${value.length} chars)` : '✗ Not loaded'}
                      </div>
                    </div>
                  )) : (
                    <div className="col-span-3 p-2 border rounded text-center text-gray-500">
                      Click the debug button to load system prompts status
                    </div>
                  )}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Context Items ({contexts.length})</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {contexts.length === 0 ? (
                    <div className="p-2 border rounded text-sm text-gray-500 italic">
                      No context items available. Try adding some sheets or text context first.
                    </div>
                  ) : (
                    contexts.map((context, index) => (
                      <div key={context.id} className="p-2 border rounded text-sm">
                        <div className="font-medium">
                          {index + 1}. {context.name} ({context.type})
                        </div>
                        <div className="text-gray-600 mt-1 whitespace-pre-wrap">
                          {context.content.substring(0, 200)}...
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Available Sheets</h4>
                <div className="text-sm text-gray-600">
                  {getAvailableSheets()
                    .map((sheet) => sheet.name)
                    .join(", ") || "None"}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Available Labels</h4>
                <div className="text-sm text-gray-600">
                  {getAvailableLabels()
                    .map((label) => label.name)
                    .join(", ") || "None"}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Current Context Payload (Data + Messages Only)</h4>
                <div className="text-xs text-gray-600 mb-2">
                  System prompts are now loaded server-side via systemInstruction, not included in this payload.
                </div>
                <textarea
                  className="w-full h-40 p-2 border rounded text-xs font-mono"
                  readOnly
                  value={JSON.stringify(contextManager.buildStructuredPayload(true), null, 2)}
                />
              </div>
              <div>
                <h4 className="font-medium mb-2">Last AI Response (Full)</h4>
                <div className="text-xs text-gray-600 mb-2">
                  Shows the complete structured response from the AI, including suggest_change tools.
                </div>
                <textarea
                  className="w-full h-40 p-2 border rounded text-xs font-mono"
                  readOnly
                  value={(() => {
                    const lastAssistantMessage = chatHistory.slice().reverse().find(msg => msg.role === "assistant")
                    if (lastAssistantMessage?.aiResponse) {
                      return JSON.stringify(lastAssistantMessage.aiResponse, null, 2)
                    }
                    return "No structured AI response found. The AI might not be using tools properly."
                  })()}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
