import fs from 'fs'
import path from 'path'

export async function loadSystemPrompts() {
  try {
    const promptsDir = path.join(process.cwd(), 'prompts')
    
    const [rules, mission, tools, examples] = await Promise.all([
      fs.promises.readFile(path.join(promptsDir, 'rules.txt'), 'utf-8').catch(() => "Default rules: You are a helpful AI assistant for spreadsheet analysis and manipulation."),
      fs.promises.readFile(path.join(promptsDir, 'mission.txt'), 'utf-8').catch(() => "Default mission: Help users analyze and manipulate their spreadsheet data."),
      fs.promises.readFile(path.join(promptsDir, 'tools.txt'), 'utf-8').catch(() => "Default tools: Available tools include cell editing, formula creation, and data analysis."),
      fs.promises.readFile(path.join(promptsDir, 'examples.txt'), 'utf-8').catch(() => "No examples available.")
    ])
    
    return { rules, mission, tools, examples }
  } catch (error) {
    console.warn("Could not load system prompts:", error)
    return {
      rules: "Default rules: You are a helpful AI assistant for spreadsheet analysis and manipulation.",
      mission: "Default mission: Help users analyze and manipulate their spreadsheet data.",
      tools: "Default tools: Available tools include cell editing, formula creation, and data analysis.",
      examples: "No examples available."
    }
  }
}
