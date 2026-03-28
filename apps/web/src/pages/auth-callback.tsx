import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/auth-context'

export function AuthCallbackPage() {
  const [searchParams] = useSearchParams()
  const { setToken } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const token = searchParams.get('token')
    if (token) {
      setToken(token)
      toast.success('Successfully signed in!')
      navigate('/dashboard')
    } else {
      toast.error('Authentication failed')
      navigate('/auth')
    }
  }, [searchParams, setToken, navigate])

  return (
    <div className="flex h-[60vh] flex-col items-center justify-center space-y-4">
      <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
      <p className="text-muted-foreground animate-pulse text-sm font-medium"> Completing authentication...</p>
    </div>
  )
}
