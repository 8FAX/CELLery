"use client"
import { Check, X, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface AiSuggestionPanelProps {
  suggestions: {
    prompt: string
    changes: Array<{
      type: string
      sheet?: string
      range: string
      formula?: string
      value?: string
      format?: any
      description: string
      preview: string[]
    }>
    bulk_inserts?: Array<{
      sheet: string
      start_cell: string
      end_cell: string
      data: string
      description: string
    }>
    explanation: string
  }
  onAccept: (changes: any, bulkInserts?: any) => void
  onReject: () => void
  status?: "pending" | "accepted" | "rejected"
}

export function AiSuggestionPanel({ suggestions, onAccept, onReject, status = "pending" }: AiSuggestionPanelProps) {
  return (
    <div className="space-y-4">
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-600" />
            AI Analysis
          </CardTitle>
          <CardDescription className="text-sm">{suggestions.explanation}</CardDescription>
        </CardHeader>
      </Card>

      {suggestions.changes?.map((change, index) => (
        <Card key={index} className="border-green-200 bg-green-50/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-xs">
                {change.type.toUpperCase()}
              </Badge>
              <div className="flex items-center gap-2">
                {change.sheet && (
                  <span className="text-xs text-blue-600 font-medium">📄 {change.sheet}</span>
                )}
                <span className="text-xs text-gray-600 font-mono">{change.range}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-gray-700 mb-3">{change.description}</p>

            {change.value && (
              <div className="bg-gray-100 rounded p-2 mb-3">
                <p className="text-xs text-gray-600 font-medium mb-1">Value:</p>
                <code className="text-xs text-gray-800">{change.value}</code>
              </div>
            )}
            {change.formula && (
              <div className="bg-gray-100 rounded p-2 mb-3">
                <p className="text-xs text-gray-600 font-medium mb-1">Formula:</p>
                <code className="text-xs text-gray-800">{change.formula}</code>
              </div>
            )}
            {change.preview && change.preview.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-gray-600 font-medium">Preview:</p>
                <div className="flex flex-wrap gap-1">
                  {change.preview.slice(0, 5).map((value, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {value}
                    </Badge>
                  ))}
                  {change.preview.length > 5 && (
                    <Badge variant="secondary" className="text-xs">
                      +{change.preview.length - 5} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {suggestions.bulk_inserts?.map((bulkInsert, index) => (
        <Card key={`bulk-${index}`} className="border-purple-200 bg-purple-50/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-xs bg-purple-100 text-purple-800">
                BULK INSERT
              </Badge>
              <div className="flex items-center gap-2">
                <span className="text-xs text-blue-600 font-medium">📄 {bulkInsert.sheet}</span>
                <span className="text-xs text-gray-600 font-mono">{bulkInsert.start_cell}:{bulkInsert.end_cell}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-gray-700 mb-3">{bulkInsert.description}</p>
            <div className="bg-gray-100 rounded p-2 mb-3">
              <p className="text-xs text-gray-600 font-medium mb-1">Data Preview:</p>
              <code className="text-xs text-gray-800 block overflow-hidden text-ellipsis">
                {bulkInsert.data.length > 100 ? bulkInsert.data.substring(0, 100) + "..." : bulkInsert.data}
              </code>
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex gap-2 pt-2">
        {status === "pending" ? (
          <>
            <Button
              onClick={() => onAccept(suggestions.changes, suggestions.bulk_inserts)}
              className="flex-1 bg-green-600 hover:bg-green-700"
              size="sm"
            >
              <Check className="h-4 w-4 mr-1" />
              Accept
            </Button>
            <Button
              onClick={onReject}
              variant="outline"
              className="flex-1 border-red-200 text-red-600 hover:bg-red-50 bg-transparent"
              size="sm"
            >
              <X className="h-4 w-4 mr-1" />
              Reject
            </Button>
          </>
        ) : (
          <div className="flex-1 text-center">
            <Badge 
              variant={status === "accepted" ? "default" : "destructive"}
              className={status === "accepted" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
            >
              {status === "accepted" ? (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  Accepted
                </>
              ) : (
                <>
                  <X className="h-3 w-3 mr-1" />
                  Rejected
                </>
              )}
            </Badge>
          </div>
        )}
      </div>
    </div>
  )
}
