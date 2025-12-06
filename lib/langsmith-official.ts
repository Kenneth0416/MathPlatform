// 最簡單的 LangSmith 配置
// 確保使用正確的項目名稱

import { Client } from "langsmith"

// 簡單的 LangSmith 工具
export function getLangSmithClient(): Client | null {
  const apiKey = process.env.LANGCHAIN_API_KEY
  const tracing = process.env.LANGCHAIN_TRACING_V2 === "true"

  if (!apiKey || !tracing) {
    console.warn("⚠️ LangSmith not enabled - missing API key or tracing disabled")
    return null
  }

  try {
    return new Client({
      apiUrl: process.env.LANGCHAIN_ENDPOINT || "https://api.smith.langchain.com",
      apiKey: apiKey,
    })
  } catch (error) {
    console.error("❌ Failed to create LangSmith client:", error)
    return null
  }
}

export function isLangSmithEnabled(): boolean {
  return !!(
    process.env.LANGCHAIN_API_KEY &&
    process.env.LANGCHAIN_TRACING_V2 === "true"
  )
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
}
