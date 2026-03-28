import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { FolderGit, KeyRound, LogOut } from 'lucide-react'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'

import { ApiKeyManager } from '@/components/api-key-manager'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/contexts/auth-context'
import { cn } from '@/lib/utils'

const loginSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(8, 'At least 8 characters'),
  apiKey: z.string().optional(),
})

const registerSchema = loginSchema
  .extend({
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Passwords must match',
    path: ['confirm'],
  })

type LoginValues = z.infer<typeof loginSchema>
type RegisterValues = z.infer<typeof registerSchema>

function passwordStrength(pw: string) {
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  return Math.min(score, 4)
}

export function AuthPage() {
  const { user, isGuest, login, register, logout, enterGuest, loginWithGoogle, loginWithGithub } = useAuth()
  const navigate = useNavigate()

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', apiKey: '' },
  })

  const regForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', confirm: '', apiKey: '' },
  })

  const pw = useWatch({ control: regForm.control, name: 'password' }) ?? ''

  async function onLogin(data: LoginValues) {
    try {
      await login(data.email, data.password)
      toast.success('Signed in successfully')
      navigate('/dashboard')
    } catch (err: any) {
      toast.error(err.message || 'Login failed')
    }
  }

  async function onRegister(data: RegisterValues) {
    try {
      await register(data.email, data.password)
      toast.success('Account created successfully')
      navigate('/dashboard')
    } catch (err: any) {
      toast.error(err.message || 'Registration failed')
    }
  }

  if (user || isGuest) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Session</CardTitle>
            <CardDescription>
              {user ? `Signed in as ${user.email}` : 'Browsing as guest — some actions are limited.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {user ? (
              <>
                <div className="text-muted-foreground text-sm">
                  <p>
                    Plan: <span className="text-foreground font-medium">{user.plan}</span>
                  </p>
                  <p className="mt-1">
                    Generations: {user.usage.generationsUsed}
                    {user.usage.generationsLimit > 0 ? ` / ${user.usage.generationsLimit}` : ' (unlimited)'}
                  </p>
                </div>
                <Separator />
                <div id="keys" className="scroll-mt-24 space-y-3">
                  <h3 className="flex items-center gap-2 text-sm font-medium">
                    <KeyRound className="size-4" />
                    API keys
                  </h3>
                  <ApiKeyManager triggerLabel="Open key manager" />
                </div>
              </>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Link to="/dashboard" className={buttonVariants({ variant: 'secondary' })}>
                Dashboard
              </Link>
              <Link to="/generate" className={buttonVariants()}>
                Generate README
              </Link>
              <button type="button" className={buttonVariants({ variant: 'outline' })} onClick={logout}>
                <LogOut className="size-4" />
                Sign out
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="relative mx-auto max-w-md px-4 py-16 sm:px-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <Card className="border-border/80 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription>Sign in or create an account — demo only, no real auth.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
              <TabsContent value="login" className="mt-6 flex flex-col space-y-4">
                <form className="space-y-4" onSubmit={loginForm.handleSubmit(onLogin)}>
                  <div className="grid gap-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input id="login-email" type="email" autoComplete="email" {...loginForm.register('email')} />
                    {loginForm.formState.errors.email ? (
                      <p className="text-destructive text-xs">{loginForm.formState.errors.email.message}</p>
                    ) : null}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      autoComplete="current-password"
                      {...loginForm.register('password')}
                    />
                    {loginForm.formState.errors.password ? (
                      <p className="text-destructive text-xs">{loginForm.formState.errors.password.message}</p>
                    ) : null}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="login-api">API key (optional)</Label>
                    <Input id="login-api" type="password" placeholder="sk-…" {...loginForm.register('apiKey')} />
                  </div>
                  <button type="submit" className={cn(buttonVariants(), 'w-full')}>
                    Sign in
                  </button>
                </form>
                <PasswordReset />
              </TabsContent>
              <TabsContent value="register" className="mt-6 space-y-4">
                <form className="space-y-4" onSubmit={regForm.handleSubmit(onRegister)}>
                  <div className="grid gap-2">
                    <Label htmlFor="reg-email">Email</Label>
                    <Input id="reg-email" type="email" autoComplete="email" {...regForm.register('email')} />
                    {regForm.formState.errors.email ? (
                      <p className="text-destructive text-xs">{regForm.formState.errors.email.message}</p>
                    ) : null}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="reg-password">Password</Label>
                    <Input
                      id="reg-password"
                      type="password"
                      autoComplete="new-password"
                      {...regForm.register('password')}
                    />
                    <StrengthBar score={passwordStrength(pw)} />
                    {regForm.formState.errors.password ? (
                      <p className="text-destructive text-xs">{regForm.formState.errors.password.message}</p>
                    ) : null}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="reg-confirm">Confirm password</Label>
                    <Input
                      id="reg-confirm"
                      type="password"
                      autoComplete="new-password"
                      {...regForm.register('confirm')}
                    />
                    {regForm.formState.errors.confirm ? (
                      <p className="text-destructive text-xs">{regForm.formState.errors.confirm.message}</p>
                    ) : null}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="reg-api">API key (optional)</Label>
                    <Input id="reg-api" type="password" placeholder="Bring your own provider key" {...regForm.register('apiKey')} />
                  </div>
                  <button type="submit" className={cn(buttonVariants(), 'w-full')}>
                    Create account
                  </button>
                </form>
              </TabsContent>
            </Tabs>

            <Separator className="my-8" />

            <div className="space-y-3">
              <p className="text-muted-foreground text-center text-xs font-medium tracking-wide uppercase">
                OAuth (mock)
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className={cn(buttonVariants({ variant: 'outline' }), 'w-full gap-2')}
                  onClick={loginWithGithub}
                >
                  <FolderGit className="size-4" />
                  GitHub
                </button>
                <button
                  type="button"
                  className={cn(buttonVariants({ variant: 'outline' }), 'w-full gap-2')}
                  onClick={loginWithGoogle}
                >
                  Google
                </button>
              </div>
              <button
                type="button"
                className={cn(buttonVariants({ variant: 'secondary' }), 'w-full')}
                onClick={() => {
                  enterGuest()
                  toast.success('Guest mode — explore the app')
                  navigate('/dashboard')
                }}
              >
                Try without an account
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

function StrengthBar({ score }: { score: number }) {
  const labels = ['Weak', 'Fair', 'Good', 'Strong', 'Excellent']
  return (
    <div className="space-y-1">
      <div className="bg-muted flex h-1.5 gap-0.5 overflow-hidden rounded-full">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              'h-full flex-1 rounded-full transition-colors',
              i < score ? 'bg-primary' : 'bg-transparent',
            )}
          />
        ))}
      </div>
      <p className="text-muted-foreground text-[11px]">{labels[score] ?? 'Weak'}</p>
    </div>
  )
}

function PasswordReset() {
  const [email, setEmail] = useState('')
  return (
    <div className="border-border rounded-lg border p-4">
      <p className="text-sm font-medium">Password reset</p>
      <p className="text-muted-foreground mt-1 text-xs">We will email a reset link (demo — shows toast only).</p>
      <div className="mt-3 flex gap-2">
        <Input
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
        />
        <button
          type="button"
          className={buttonVariants({ variant: 'outline' })}
          onClick={() => {
            if (!email.trim()) {
              toast.error('Enter your email')
              return
            }
            toast.success('Reset link sent (mock)')
          }}
        >
          Send
        </button>
      </div>
    </div>
  )
}
