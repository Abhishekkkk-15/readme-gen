import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { RootLayout } from '@/components/layout/root-layout'
import { AuthPage } from '@/pages/auth'
import { DashboardPage } from '@/pages/dashboard'
import { DocsPage } from '@/pages/docs'
import { GeneratePage } from '@/pages/generate'
import { LandingPage } from '@/pages/landing'
import { ModelsPage } from '@/pages/models'
import { PricingPage } from '@/pages/pricing'
import { TemplatesPage } from '@/pages/templates'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<RootLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/models" element={<ModelsPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/generate" element={<GeneratePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
