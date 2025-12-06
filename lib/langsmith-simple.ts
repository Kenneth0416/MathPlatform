// 簡單的 LangSmith 配置 - 手動加載環境變量確保使用正確的項目名稱

import { Client } from "langsmith"
import fs from 'fs'
import path from 'path'

// 手動加載 .env.local 文件
function loadEnvFile() {
  try {
    const envPath = path.join(process.cwd(), '.env.local')
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8')
      const lines = envContent.split('\n')

      lines.forEach(line => {
        const trimmed = line.trim()
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=')
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=').trim()
            // 只設置 LangSmith 相關的變量，如果還沒有設置
            if (key.startsWith('LANGCHAIN_') || key.startsWith('LANGSMITH_')) {
              if (!process.env[key]) {
                process.env[key] = value.replace(/^["']|["']$/g, '') // 移除引號
              }
            }
          }
        }
      })
      console.log('✅ Loaded .env.local file for LangSmith')
    }
  } catch (error) {
    console.warn('⚠️ Failed to load .env.local file:', error.message)
  }
}

// 在模塊加載時加載環境變量
if (typeof window === "undefined") {
  loadEnvFile()
}

// 簡單的 LangSmith 工具
export function getLangSmithClient(): Client | null {
  const apiKey = process.env.LANGCHAIN_API_KEY || process.env.LANGSMITH_API_KEY
  const tracing = process.env.LANGCHAIN_TRACING_V2 === "true" || process.env.LANGSMITH_TRACING === "true"

  if (!apiKey || !tracing) {
    console.warn("⚠️ LangSmith not enabled - missing API key or tracing disabled")
    return null
  }

  try {
    return new Client({
      apiUrl: process.env.LANGCHAIN_ENDPOINT || process.env.LANGSMITH_ENDPOINT || "https://api.smith.langchain.com",
      apiKey: apiKey,
    })
  } catch (error) {
    console.error("❌ Failed to create LangSmith client:", error)
    return null
  }
}

export function isLangSmithEnabled(): boolean {
  const apiKey = process.env.LANGCHAIN_API_KEY || process.env.LANGSMITH_API_KEY
  const tracing = process.env.LANGCHAIN_TRACING_V2 === "true" || process.env.LANGSMITH_TRACING === "true"

  return !!(apiKey && tracing)
}

export function getProjectName(): string {
  // 確保返回正確的項目名稱，不使用 "default"
  const project = process.env.LANGCHAIN_PROJECT || process.env.LANGSMITH_PROJECT
  if (!project || project === "default") {
    console.warn("⚠️ Using fallback project name: dse-math-tutoring")
    return "dse-math-tutoring"
  }
  return project
}

// 初始化檢查
if (typeof window === "undefined") {
  console.log(`🔧 LangSmith project: ${getProjectName()}`)
  console.log(`🔗 LangSmith enabled: ${isLangSmithEnabled()}`)
  console.log(`🔑 LangSmith API key: ${process.env.LANGCHAIN_API_KEY || process.env.LANGSMITH_API_KEY ? '已設置' : '未設置'}`)
}
