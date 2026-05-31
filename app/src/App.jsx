import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { Estimates } from './pages/Estimates'
import { Clients } from './pages/Clients'
import Login from './pages/Login'
import Register from './pages/Register'
import { EstimateBuilder } from './pages/EstimateBuilder'

function SettingsPage() {
  const { user, logout, updateUser } = useAuth()
  const [editing,    setEditing]    = useState(false)
  const [bizName,    setBizName]    = useState('')
  const [bizPhone,   setBizPhone]   = useState('')
  const [bizAddress, setBizAddress] = useState('')
  const [saving,     setSaving]     = useState(false)
  const [saveError,  setSaveError]  = useState('')

  // Keep form fields in sync with user data
  useEffect(() => {
    if (user) {
      setBizName(user.business_name    || '')
      setBizPhone(user.business_phone  || '')
      setBizAddress(user.business_address || '')
    }
  }, [user])

  function startEdit() {
    setBizName(user?.business_name    || '')
    setBizPhone(user?.business_phone  || '')
    setBizAddress(user?.business_address || '')
    setSaveError('')
    setEditing(true)
  }

  async function saveProfile(e) {
    e.preventDefault()
    setSaving(true); setSaveError('')
    try {
      await updateUser({
        business_name:    bizName.trim()    || null,
        business_phone:   bizPhone.trim()   || null,
        business_address: bizAddress.trim() || null,
      })
      setEditing(false)
    } catch (err) {
      setSaveError(err.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="px-4 md:px-8 py-6 max-w-lg">
      <div className="hidden md:block mb-6">
        <h1 className="text-lg font-semibold text-gray-900">Settings</h1>
      </div>

      {/* Business Profile */}
      <div className="bg-white rounded-xl border border-gray-200 mb-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Business Profile</div>
          {!editing && (
            <button onClick={startEdit} className="text-xs text-indigo-600 font-semibold hover:text-indigo-500">
              Edit
            </button>
          )}
        </div>
        {editing ? (
          <form onSubmit={saveProfile} className="px-5 py-4 space-y-3">
            <div>
              <label className="text-xs text-gray-500 font-medium mb-1 block">Business Name</label>
              <input value={bizName} onChange={e => setBizName(e.target.value)}
                placeholder="e.g. Leprechaun's Landscaping"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium mb-1 block">Business Phone</label>
              <input value={bizPhone} onChange={e => setBizPhone(e.target.value)}
                placeholder="(555) 000-0000"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium mb-1 block">Business Address</label>
              <input value={bizAddress} onChange={e => setBizAddress(e.target.value)}
                placeholder="123 Main St, City, State 00000"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900" />
            </div>
            {saveError && <p className="text-xs text-red-500">{saveError}</p>}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setEditing(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-300 rounded-lg">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        ) : (
          <div className="px-5 py-4 space-y-3">
            {[
              { label: 'Business Name',    value: user?.business_name    },
              { label: 'Business Phone',   value: user?.business_phone   },
              { label: 'Business Address', value: user?.business_address },
            ].map(({ label, value }) => (
              <div key={label}>
                <div className="text-xs text-gray-400 mb-0.5">{label}</div>
                <div className="text-sm text-gray-900">
                  {value || <span className="text-gray-300 italic">Not set</span>}
                </div>
              </div>
            ))}
            <p className="text-xs text-gray-400 pt-1">
              This info appears on your estimates — add it so customers see your business details.
            </p>
          </div>
        )}
      </div>

      {/* Account */}
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
          <button onClick={logout} className="text-sm text-red-500 hover:text-red-600 font-medium transition-colors">
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}

function AppShell() {
  const [view,     setView]     = useState('dashboard')
  const [building, setBuilding] = useState(false)

  if (building) return <EstimateBuilder onBack={() => setBuilding(false)} />

  return (
    <Layout view={view} setView={setView} onNew={() => setBuilding(true)}>
      {view === 'dashboard' && <Dashboard  onNew={() => setBuilding(true)} />}
      {view === 'estimates' && <Estimates  onNew={() => setBuilding(true)} />}
      {view === 'clients'   && <Clients    onNew={() => setBuilding(true)} />}
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
