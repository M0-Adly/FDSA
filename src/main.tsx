import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import './lib/i18n'
import App from './App.tsx'

const LoginPage     = lazy(() => import('./pages/LoginPage.tsx').then(m => ({ default: m.LoginPage })))
const CitizenPortal = lazy(() => import('./pages/CitizenPortal.tsx').then(m => ({ default: m.CitizenPortal })))
const AdminPanel    = lazy(() => import('./pages/AdminPanel.tsx').then(m => ({ default: m.AdminPanel })))

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#080c1a] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/"        element={<App />} />
          <Route path="/login"   element={<LoginPage />} />
          <Route path="/citizen" element={<CitizenPortal />} />
          <Route path="/admin"   element={<AdminPanel />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </StrictMode>,
)
