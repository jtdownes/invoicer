import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, FileText, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const EMAIL_RE = /^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/i

function getPasswordStrength(pw) {
  const checks = {
    upper:   /[A-Z]/.test(pw),
    lower:   /[a-z]/.test(pw),
    number:  /\d/.test(pw),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(pw),
    length:  pw.length >= 8,
  }
  const missing = []
  if (!checks.upper)   missing.push('an uppercase letter')
  if (!checks.lower)   missing.push('a lowercase letter')
  if (!checks.number)  missing.push('a number')
  if (!checks.special) missing.push('a special character')
  if (!checks.length)  missing.push('at least 8 characters')
  const score = Object.values(checks).filter(Boolean).length
  return { valid: missing.length === 0, missing, score }
}

function formatPhone(value) {
  const digits = value.replace(/\D/g, '').substring(0, 10)
  if (digits.length > 6) return digits.replace(/(\d{3})(\d{3})(\d+)/, '$1-$2-$3')
  if (digits.length > 3) return digits.replace(/(\d{3})(\d+)/, '$1-$2')
  return digits
}

const STRENGTH_LABELS = ['', 'Weak', 'Weak', 'Fair', 'Good', 'Strong']
const STRENGTH_COLORS = ['', '#ef4444', '#ef4444', '#f59e0b', '#84cc16', '#10b981']

function Register() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [searchParams] = useSearchParams()
  const inviteToken = searchParams.get('invite')

  // Invite validation
  const [inviteStatus, setInviteStatus] = useState('checking') // checking | valid | invalid
  const [lockedEmail, setLockedEmail]   = useState(null)

  useEffect(() => {
    if (!inviteToken) { setInviteStatus('invalid'); return }
    fetch(`/api/invites/validate?token=${encodeURIComponent(inviteToken)}`)
      .then(r => r.json())
      .then(data => {
        if (data.valid) {
          setInviteStatus('valid')
          if (data.locked_email) {
            setLockedEmail(data.locked_email)
            setEmail(data.locked_email)
          }
        } else {
          setInviteStatus('invalid')
        }
      })
      .catch(() => setInviteStatus('invalid'))
  }, [inviteToken])

  // Form state
  const [firstName,       setFirstName]       = useState('')
  const [lastName,        setLastName]         = useState('')
  const [email,           setEmail]            = useState('')
  const [phone,           setPhone]            = useState('')
  const [password,        setPassword]         = useState('')
  const [confirmPassword, setConfirmPassword]  = useState('')
  const [showPw,          setShowPw]           = useState(false)
  const [showConfirmPw,   setShowConfirmPw]    = useState(false)

  // Errors
  const [emailError,    setEmailError]    = useState('')
  const [phoneError,    setPhoneError]    = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [confirmError,  setConfirmError]  = useState('')
  const [generalError,  setGeneralError]  = useState('')
  const [submitting,    setSubmitting]    = useState(false)

  // Derived validation
  const emailValid   = EMAIL_RE.test(email)
  const phoneDigits  = phone.replace(/\D/g, '')
  const phoneValid   = phoneDigits.length === 0 || phoneDigits.length === 10
  const { valid: passwordValid, score: passwordScore, missing: passwordMissing } = getPasswordStrength(password)
  const confirmValid = confirmPassword.length > 0 && confirmPassword === password

  const isFormValid =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    emailValid && phoneValid &&
    passwordValid && confirmValid

  // Handlers
  function handleEmailChange(value) {
    if (lockedEmail) return
    setEmail(value)
    setEmailError(value.length > 0 && !EMAIL_RE.test(value) ? 'Enter a valid email address.' : '')
  }

  function handlePhoneChange(value) {
    const formatted = formatPhone(value)
    setPhone(formatted)
    const d = formatted.replace(/\D/g, '')
    setPhoneError(d.length > 0 && d.length < 10 ? 'Phone number must be 10 digits.' : '')
  }

  function handlePasswordChange(value) {
    setPassword(value)
    if (value.length === 0) {
      setPasswordError('')
    } else {
      const { valid, missing } = getPasswordStrength(value)
      setPasswordError(valid ? '' : 'Password must include ' + missing.join(', ') + '.')
    }
    if (confirmPassword.length > 0) {
      setConfirmError(value !== confirmPassword ? 'Passwords do not match.' : '')
    }
  }

  function handleConfirmChange(value) {
    setConfirmPassword(value)
    setConfirmError(value.length > 0 && value !== password ? 'Passwords do not match.' : '')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!isFormValid || submitting) return
    setSubmitting(true)
    setGeneralError('')

    try {
      await register({
        invite_token:  inviteToken,
        first_name:    firstName.trim(),
        last_name:     lastName.trim(),
        email:         email.trim(),
        phone_number:  phoneDigits.length === 10 ? phone : null,
        password,
      })
      navigate('/dashboard')
    } catch (err) {
      const msg = err.message || 'Registration failed'
      if (msg.toLowerCase().includes('email')) {
        setEmailError(msg)
      } else {
        setGeneralError(msg)
      }
    } finally {
      setSubmitting(false)
    }
  }

  // ── Invite gate states ────────────────────────────────────────────────────

  if (inviteStatus === 'checking') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
          <span className="text-sm">Validating invite…</span>
        </div>
      </div>
    )
  }

  if (inviteStatus === 'invalid') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-12">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="w-12 h-12 bg-brand-600 rounded-xl flex items-center justify-center shadow-lg">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-slate-800 tracking-tight">Invoicer</span>
        </div>
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-lg font-semibold text-slate-800 mb-2">Invalid Invite</h1>
          <p className="text-sm text-slate-500 mb-6">
            This invite link is invalid or has expired.
            Contact an admin to request a new one.
          </p>
          <Link to="/login" className="text-sm text-brand-600 hover:text-brand-700 font-medium transition-colors">
            ← Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  // ── Registration form ─────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-12">

      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-2">
        <div className="w-12 h-12 bg-brand-600 rounded-xl flex items-center justify-center shadow-lg">
          <FileText className="w-6 h-6 text-white" />
        </div>
        <span className="text-2xl font-bold text-slate-800 tracking-tight">Invoicer</span>
      </div>

      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-slate-200 p-8">

        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-xl font-semibold text-slate-800">Create account</h1>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
            <CheckCircle className="w-3 h-3" /> Invited
          </span>
        </div>
        <p className="text-sm text-slate-500 mb-6">Fill in your details to get started.</p>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="first-name" className="block text-sm font-medium text-slate-700 mb-1.5">
                First name
              </label>
              <input
                id="first-name"
                type="text"
                autoComplete="given-name"
                placeholder="John"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900
                  placeholder-slate-400 bg-white outline-none transition-colors
                  focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
            <div>
              <label htmlFor="last-name" className="block text-sm font-medium text-slate-700 mb-1.5">
                Last name
              </label>
              <input
                id="last-name"
                type="text"
                autoComplete="family-name"
                placeholder="Doe"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900
                  placeholder-slate-400 bg-white outline-none transition-colors
                  focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              readOnly={!!lockedEmail}
              onChange={e => handleEmailChange(e.target.value)}
              className={`w-full px-3.5 py-2.5 rounded-lg border text-slate-900
                placeholder-slate-400 outline-none transition-colors
                focus:ring-2 focus:ring-brand-500 focus:border-brand-500
                ${emailError ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white'}
                ${lockedEmail ? 'opacity-70 cursor-not-allowed bg-slate-50' : ''}`}
            />
            {lockedEmail && (
              <p className="mt-1.5 text-xs text-slate-400 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-400" />
                This invite is locked to this email
              </p>
            )}
            {emailError && <p className="mt-1.5 text-xs text-red-500">{emailError}</p>}
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1.5">
              Phone <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel-national"
              placeholder="800-555-1234"
              value={phone}
              onChange={e => handlePhoneChange(e.target.value)}
              className={`w-full px-3.5 py-2.5 rounded-lg border text-slate-900
                placeholder-slate-400 bg-white outline-none transition-colors
                focus:ring-2 focus:ring-brand-500 focus:border-brand-500
                ${phoneError ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}
            />
            {phoneError && <p className="mt-1.5 text-xs text-red-500">{phoneError}</p>}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPw ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="••••••••"
                value={password}
                onChange={e => handlePasswordChange(e.target.value)}
                className={`w-full px-3.5 py-2.5 pr-11 rounded-lg border text-slate-900
                  placeholder-slate-400 bg-white outline-none transition-colors
                  focus:ring-2 focus:ring-brand-500 focus:border-brand-500
                  ${passwordError ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Strength bar */}
            {password.length > 0 && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {[1,2,3,4,5].map(i => (
                    <div
                      key={i}
                      className="h-1 flex-1 rounded-full transition-all duration-300"
                      style={{ backgroundColor: i <= passwordScore ? STRENGTH_COLORS[passwordScore] : '#e2e8f0' }}
                    />
                  ))}
                </div>
                <p className="text-xs font-medium" style={{ color: STRENGTH_COLORS[passwordScore] }}>
                  {STRENGTH_LABELS[passwordScore]}
                </p>
              </div>
            )}
            {passwordError && <p className="mt-1.5 text-xs text-red-500">{passwordError}</p>}
          </div>

          {/* Confirm password — only after main is valid */}
          {passwordValid && (
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-700 mb-1.5">
                Confirm password
              </label>
              <div className="relative">
                <input
                  id="confirm-password"
                  type={showConfirmPw ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={e => handleConfirmChange(e.target.value)}
                  className={`w-full px-3.5 py-2.5 pr-11 rounded-lg border text-slate-900
                    placeholder-slate-400 bg-white outline-none transition-colors
                    focus:ring-2 focus:ring-brand-500 focus:border-brand-500
                    ${confirmError ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowConfirmPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmError && <p className="mt-1.5 text-xs text-red-500">{confirmError}</p>}
            </div>
          )}

          {/* General error */}
          {generalError && (
            <div className="px-3.5 py-2.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
              {generalError}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!isFormValid || submitting}
            className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-all mt-2
              ${isFormValid && !submitting
                ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-sm cursor-pointer'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
          >
            {submitting ? 'Creating account…' : 'Create account'}
          </button>

          <p className="text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-600 hover:text-brand-700 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}

export default Register
