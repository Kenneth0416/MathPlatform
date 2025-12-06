import { useSession } from "next-auth/react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

export function useAuth(requireAuth = true) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const isLoading = status === "loading"

  useEffect(() => {
    if (!isLoading && requireAuth && !session) {
      router.push("/login")
    }
  }, [session, isLoading, requireAuth, router])

  return {
    user: session?.user,
    isLoading,
    isAuthenticated: !!session,
  }
}