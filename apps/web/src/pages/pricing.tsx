import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { BadgeCheck, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'

import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAuth } from '@/contexts/auth-context'
import { cn } from '@/lib/utils'

const customSchema = z.object({
  company: z.string().min(2, 'Company name required'),
  email: z.string().email(),
  notes: z.string().optional(),
})

type CustomForm = z.infer<typeof customSchema>

const features = [
  { key: 'READMEs / month', free: '5', pro: 'Unlimited', ent: 'Custom' },
  { key: 'Models', free: 'OpenAI / Gemini / Groq', pro: 'OpenAI / Gemini / Groq', ent: 'OpenAI / Gemini / Groq' },
  { key: 'API access', free: '—', pro: 'Included', ent: 'VPC / private' },
  { key: 'Support', free: 'Community', pro: 'Priority', ent: 'Dedicated' },
  { key: 'GitHub push', free: 'Manual', pro: 'OAuth', ent: 'Enterprise SSO' },
  { key: 'Fine-tuning', free: '—', pro: '—', ent: 'Available' },
]

export function PricingPage() {
  const navigate = useNavigate()
  const { user, token, updateUser, refreshUser } = useAuth()
  const [annual, setAnnual] = useState(true)
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const form = useForm<CustomForm>({
    resolver: zodResolver(customSchema),
    defaultValues: { company: '', email: '', notes: '' },
  })

  const proPrice = annual ? 99 : 9.99
  const proLabel = annual ? '/yr' : '/mo'
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
  const isPro = user?.plan === 'pro'

  useEffect(() => {
    if (!token) return
    void fetch(`${API_URL}/billing/status`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) return
        const data = await res.json()
        if (data.user) updateUser(data.user)
      })
      .catch(() => {})
  }, [API_URL, token, updateUser])

  async function startCheckout() {
    if (!token) {
      navigate('/auth')
      return
    }

    setIsCheckingOut(true)
    toast.promise(
      fetch(`${API_URL}/billing/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ planCode: annual ? 'pro-annual' : 'pro-monthly' }),
      }).then(async (res) => {
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || 'Failed to start checkout')
        }
        if (data.user) updateUser(data.user)
        if (!data.checkoutUrl) {
          throw new Error('Missing Razorpay checkout URL')
        }
        window.location.href = data.checkoutUrl
        return 'Redirecting to Razorpay...'
      }).finally(() => setIsCheckingOut(false)),
      {
        loading: 'Starting checkout...',
        success: (message) => message,
        error: (err) => err.message || 'Failed to start checkout',
      },
    )
  }

  async function cancelSubscription() {
    if (!token) return

    setIsCancelling(true)
    toast.promise(
      fetch(`${API_URL}/billing/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ cancelAtCycleEnd: true }),
      }).then(async (res) => {
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || 'Failed to schedule cancellation')
        }
        if (data.user) updateUser(data.user)
        await refreshUser()
        return 'Cancellation scheduled for the end of the billing cycle'
      }).finally(() => setIsCancelling(false)),
      {
        loading: 'Updating subscription...',
        success: (message) => message,
        error: (err) => err.message || 'Failed to update subscription',
      },
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Simple pricing</h1>
          <p className="text-muted-foreground mt-3 text-sm sm:text-base">
            Start free, upgrade when READMEs become part of every release.
          </p>
        </motion.div>
        <div className="mt-8 flex items-center justify-center gap-3">
          <span className={cn('text-sm', !annual && 'text-foreground font-medium')}>Monthly</span>
          <Switch checked={annual} onCheckedChange={setAnnual} aria-label="Toggle annual billing" />
          <span className={cn('text-sm', annual && 'text-foreground font-medium')}>
            Annual <BadgeCheck className="text-primary ml-1 inline size-4" />
            <span className="text-muted-foreground text-xs"> Save ~17%</span>
          </span>
        </div>
      </div>

      <div className="mt-14 grid gap-6 lg:grid-cols-3">
        <PlanCard
          name="Free"
          description="For side projects and first tries."
          price="$0"
          items={['5 generations / month', 'Basic models', 'Community support', 'Export .md']}
          cta="Start free"
          href="/auth"
        />
        <PlanCard
          name="Pro"
          description="For teams shipping weekly."
          price={`$${proPrice}`}
          period={proLabel}
          highlight
          items={[
            'Unlimited generations',
            'OpenAI, Gemini, Groq & BYOK',
            'Priority support',
            'Full API access',
            'GitHub OAuth & push',
          ]}
          cta={isPro ? 'Current plan' : isCheckingOut ? 'Starting checkout...' : 'Upgrade to Pro'}
          onClick={isPro ? undefined : startCheckout}
          disabled={isPro || isCheckingOut}
        />
        <PlanCard
          name="Enterprise"
          description="Compliance, VPC, custom models."
          price="Custom"
          items={['Dedicated support', 'Custom limits', 'Fine-tuning', 'Audit logs & SSO']}
          cta="Talk to sales"
          href="#custom"
        />
      </div>

      {user ? (
        <section className="mt-10">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Subscription</CardTitle>
              <CardDescription>
                {user.billing?.subscriptionId
                  ? `Status: ${user.billing.subscriptionStatus || 'pending'}`
                  : 'No active Razorpay subscription'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                Current plan: <span className="text-foreground font-medium">{user.plan}</span>
              </p>
              {user.billing?.currentEndAt ? (
                <p className="text-muted-foreground">
                  Billing period ends {new Date(user.billing.currentEndAt).toLocaleDateString()}
                </p>
              ) : null}
              {isPro && user.billing?.subscriptionId ? (
                <button
                  type="button"
                  className={buttonVariants({ variant: 'outline' })}
                  disabled={isCancelling || Boolean(user.billing?.cancelAtCycleEnd)}
                  onClick={cancelSubscription}
                >
                  {user.billing?.cancelAtCycleEnd ? 'Cancellation scheduled' : isCancelling ? 'Updating...' : 'Cancel at cycle end'}
                </button>
              ) : null}
            </CardContent>
          </Card>
        </section>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm">
        <span className="text-muted-foreground inline-flex items-center gap-2">
          <ShieldCheck className="text-primary size-4" />
          14-day money-back guarantee on Pro annual
        </span>
      </div>

      <section className="mt-20">
        <h2 className="text-xl font-semibold tracking-tight">Feature comparison</h2>
        <div className="border-border mt-6 overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Capability</TableHead>
                <TableHead>Free</TableHead>
                <TableHead>Pro</TableHead>
                <TableHead>Enterprise</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {features.map((row) => (
                <TableRow key={row.key}>
                  <TableCell className="font-medium">{row.key}</TableCell>
                  <TableCell>{row.free}</TableCell>
                  <TableCell>{row.pro}</TableCell>
                  <TableCell>{row.ent}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="mt-16">
        <h2 className="text-xl font-semibold tracking-tight">Billing FAQ</h2>
        <Accordion multiple={false} className="mt-4 max-w-2xl">
          <AccordionItem value="a1">
            <AccordionTrigger>Can I switch between monthly and annual?</AccordionTrigger>
            <AccordionContent className="text-muted-foreground text-sm">
              Yes — changes apply on your next cycle. Annual includes two months free vs monthly.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="a2">
            <AccordionTrigger>Do you offer refunds?</AccordionTrigger>
            <AccordionContent className="text-muted-foreground text-sm">
              Pro annual purchases include a 14-day satisfaction window. Enterprise terms are custom.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="a3">
            <AccordionTrigger>What payment methods are supported?</AccordionTrigger>
            <AccordionContent className="text-muted-foreground text-sm">
              Cards, ACH for annual contracts, and invoicing on Enterprise.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      <section id="custom" className="mt-20 scroll-mt-24">
        <Card>
          <CardHeader>
            <CardTitle>Request a custom plan</CardTitle>
            <CardDescription>Tell us about traffic, compliance, and model needs.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={form.handleSubmit(() => {
                toast.success('Thanks — our team will reach out (demo)')
                form.reset()
              })}
            >
              <div className="grid gap-2 sm:col-span-1">
                <Label htmlFor="co">Company</Label>
                <Input id="co" {...form.register('company')} />
                {form.formState.errors.company ? (
                  <p className="text-destructive text-xs">{form.formState.errors.company.message}</p>
                ) : null}
              </div>
              <div className="grid gap-2 sm:col-span-1">
                <Label htmlFor="em">Work email</Label>
                <Input id="em" type="email" {...form.register('email')} />
                {form.formState.errors.email ? (
                  <p className="text-destructive text-xs">{form.formState.errors.email.message}</p>
                ) : null}
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" rows={4} placeholder="Regions, SSO, expected monthly generations…" {...form.register('notes')} />
              </div>
              <div className="sm:col-span-2">
                <button type="submit" className={buttonVariants()}>
                  Submit request
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function PlanCard({
  name,
  description,
  price,
  period,
  items,
  cta,
  href,
  highlight,
  onClick,
  disabled,
}: {
  name: string
  description: string
  price: string
  period?: string
  items: string[]
  cta: string
  href?: string
  highlight?: boolean
  onClick?: () => void
  disabled?: boolean
}) {
  const inner = (
    <>
      <CardHeader>
        <CardTitle className="text-lg">{name}</CardTitle>
        <CardDescription>{description}</CardDescription>
        <p className="pt-2 text-3xl font-semibold">
          {price}
          {period ? <span className="text-muted-foreground text-base font-normal">{period}</span> : null}
        </p>
      </CardHeader>
      <CardContent>
        <ul className="text-muted-foreground space-y-2 text-sm">
          {items.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-primary">✓</span>
              {item}
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        {href ? (
          href.startsWith('#') ? (
            <a href={href} className={cn(buttonVariants({ variant: highlight ? 'default' : 'outline' }), 'w-full')}>
              {cta}
            </a>
          ) : (
            <Link to={href} className={cn(buttonVariants({ variant: highlight ? 'default' : 'outline' }), 'w-full')}>
              {cta}
            </Link>
          )
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            className={cn(buttonVariants({ variant: highlight ? 'default' : 'outline' }), 'w-full')}
          >
            {cta}
          </button>
        )}
      </CardFooter>
    </>
  )

  if (highlight) {
    return (
      <Card className="border-primary ring-primary/15 relative shadow-lg ring-2">{inner}</Card>
    )
  }
  return <Card className="border-border/80">{inner}</Card>
}
