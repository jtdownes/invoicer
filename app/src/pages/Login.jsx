import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, FileText } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)

  const [emailError,    setEmailError]    = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [generalError,  setGeneralError]  = useState('')
  const [submitting,    setSubmitting]    = useState(false)

  const emailValid  = /^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/i.test(email)
  const isFormValid = emailValid && password.length > 0

  function handleEmailChange(value) {
    setEmail(value)
    if (value.length === 0 || /^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/i.test(value)) setEmailError('')
    else setEmailError('Enter a valid email address.')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!isFormValid || submitting) return
    setSubmitting(true)
    setGeneralError('')
    setEmailError('')
    setPasswordError('')
    try {
      await login(email.trim(), password)
      navigate('/app')
    } catch (err) {
      const msg = err.message || 'Login failed'
      if (msg.toLowerCase().includes('email'))         setEmailError(msg)
      else if (msg.toLowerCase().includes('password')) setPasswordError(msg)
      else                                             setGeneralError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 flex flex-col items-center gap-2">
        <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
          <FileText className="w-6 h-6 text-white" />
        </div>
        <span className="text-2xl font-bold text-slate-800 tracking-tight">Invoica</span>
      </div>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <h1 className="text-xl font-semibold text-slate-800 mb-1">Sign in</h1>
        <p className="text-sm text-slate-500 mb-6">Welcome back. Enter your credentials to continue.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
            <input id="email" type="email" autoComplete="email" placeholder="you@example.com"
              value={email} onChange={e => handleEmailChange(e.target.value)}
              className={`w-full px-3.5 py-2.5 rounded-lg border text-slate-900 placeholder-slate-400 bg-white outline-none transition-colors focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${emailError ? 'border-red-400 bg-red-50' : 'border-slate-300'}`} />
            {emailError && <p className="mt-1.5 text-xs text-red-500">{emailError}</p>}
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
            <div className="relative">
              <input id="password" type={showPw ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••••"
                value={password} onChange={e => { setPassword(e.target.value); setPasswordError('') }}
                className={`w-full px-3.5 py-2.5 pr-11 rounded-lg border text-slate-900 placeholder-slate-400 bg-white outline-none transition-colors focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${passwordError ? 'border-red-400 bg-red-50' : 'border-slate-300'}`} />
              <button type="button" tabIndex={-1} onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {passwordError && <p className="mt-1.5 text-xs text-red-500">{passwordError}</p>}
          </div>
          {generalError && <div className="px-3.5 py-2.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">{generalError}</div>}
          <button type="submit" disabled={!isFormValid || submitting}
            className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-all ${isFormValid && !submitting ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm cursor-pointer' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
      <p className="mt-6 text-sm text-slate-500">Need access? <span className="text-slate-600 font-medium">Contact an admin to receive an invite.</span></p>
    </div>
  )
}

export default Login
