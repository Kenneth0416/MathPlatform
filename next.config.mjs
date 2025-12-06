/** @type {import('next').NextConfig} */
const nextConfig = {
  // 移除 ignoreBuildErrors，改為解決實際錯誤
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  env: {
    POE_API_KEY: process.env.POE_API_KEY,
    POE_API_URL: process.env.POE_API_URL,
    DATABASE_URL: process.env.DATABASE_URL,
    // LangSmith 環境變量
    LANGCHAIN_API_KEY: process.env.LANGCHAIN_API_KEY,
    LANGCHAIN_TRACING_V2: process.env.LANGCHAIN_TRACING_V2,
    LANGCHAIN_PROJECT: process.env.LANGCHAIN_PROJECT,
    LANGCHAIN_ENDPOINT: process.env.LANGCHAIN_ENDPOINT,
    LANGSMITH_API_KEY: process.env.LANGSMITH_API_KEY,
    LANGSMITH_PROJECT: process.env.LANGSMITH_PROJECT,
    LANGSMITH_ENDPOINT: process.env.LANGSMITH_ENDPOINT,
    LANGSMITH_TRACING: process.env.LANGSMITH_TRACING,
    ENABLE_LANGSMITH: process.env.ENABLE_LANGSMITH,
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
}

export default nextConfig
