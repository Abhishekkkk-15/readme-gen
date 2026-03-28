import { Outlet } from 'react-router-dom'

import { Footer } from '@/components/layout/footer'
import { Navbar } from '@/components/layout/navbar'

export function RootLayout() {
  return (
    <div className="bg-background flex min-h-svh flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
