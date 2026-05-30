import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  // While the /me check is in-flight, hold on a blank slate bg so there's no flash
  if (user === undefined) return <div className="min-h-screen bg-slate-50" />
  if (!user) return <Navigate to="/login" replace />
  return children
}

function PublicOnlyRoute({ children }) {
  const { user } = useAuth()
  // Render the page immediately — if already authed it redirects after /me resolves
  if (user === undefined) return children
  if (user) return <Navigate to="/dashboard" replace />
  return children
}

function Dashboard() {
  const { user, logout } = useAuth()
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-sm w-full text-center">
        <p className="text-slate-600 text-sm mb-1">Signed in as</p>
        <p className="font-semibold text-slate-900 text-lg mb-1">
          {user.first_name} {user.last_name}
        </p>
        <p className="text-slate-500 text-sm mb-6">{user.email}</p>
        <button
          onClick={logout}
          className="text-sm text-red-500 hover:text-red-600 transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login"     element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
          <Route path="/register"  element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="*"          element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
