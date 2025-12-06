import { withAuth } from "next-auth/middleware"

export default withAuth(
  function middleware(req) {
    // Add any additional middleware logic here
    // For example, role-based access control
    return
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to auth pages and specific API routes without authentication
        if (
          req.nextUrl.pathname.startsWith("/login") ||
          req.nextUrl.pathname.startsWith("/register") ||
          req.nextUrl.pathname === "/" ||
          req.nextUrl.pathname.startsWith("/api/mathmcp") || // MathMCP API - no auth needed
          req.nextUrl.pathname.startsWith("/api/chat") || // Chat API - no auth needed for testing
          req.nextUrl.pathname.startsWith("/api/poe") || // Poe API proxy - no auth needed
          (process.env.NODE_ENV === 'development' && (
            req.nextUrl.pathname.startsWith("/api/admin") ||
            req.nextUrl.pathname.startsWith("/api/test")
          ))
        ) {
          return true
        }

        // Require authentication for all other pages
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth.js routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
}