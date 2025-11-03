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
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
}

export default nextConfig
