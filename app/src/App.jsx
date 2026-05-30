import { useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { Invoices } from './pages/Invoices'
import { Clients } from './pages/Clients'
import Login from './pages/Login'
import Register from './pages/Register'
import { InvoiceBuilder } from './pages/InvoiceBuilder'

function SettingsPage() {
  const { user, logout } = useAuth()
  return (
    <div className="px-4 md:px-8 py-6 max-w-md">
      <div className="hidden md:block mb-6">
        <h1 className="text-lg font-semibold text-gray-900">Settings</h1>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        <div className="px-5 py-4">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Account</div>
          <div className="text-sm font-semibold text-gray-900">{user?.first_name} {user?.last_name}</div>
          <div className="text-xs text-gray-400 mt-0.5">{user?.email}</div>
          <div className="mt-1.5">
            <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
              user?.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>
              {user?.role}
            </span>
          </div>
        </div>
        <div className="px-5 py-4">
          <button onClick={logout} className="text-sm text-red-500 hover:text-red-600 font-medium transition-colors">Sign out</button>
        </div>
      </div>
    </div>
  )
}

function AppShell() {
  const [view,     setView]     = useState('dashboard')
  const [building, setBuilding] = useState(false)

  if (building) return <InvoiceBuilder onBack={() => setBuilding(false)} />

  return (
    <Layout view={view} setView={setView} onNew={() => setBuilding(true)}>
      {view === 'dashboard' && <Dashboard onNew={() => setBuilding(true)} />}
      {view === 'invoices'  && <Invoices  onNew={() => setBuilding(true)} />}
      {view === 'clients'   && <Clients   onNewInvoice={() => setBuilding(true)} />}
      {view === 'settings'  && <SettingsPage />}
    </Layout>
  )
}

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  if (user === undefined) return <div className="min-h-screen bg-slate-50" />
  if (!user) return <Navigate to="/login" replace />
  return children
}

function PublicOnlyRoute({ children }) {
  const { user } = useAuth()
  if (user === undefined) return children
  if (user) return <Navigate to="/app" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Routes>
          <Route path="/login"    element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
          <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
          <Route path="/app"      element={<ProtectedRoute><AppShell /></ProtectedRoute>} />
          <Route path="*"         element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
