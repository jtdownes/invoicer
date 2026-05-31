import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle, FileX } from 'lucide-react'

const fmt = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0)

const fmtDate = s => {
  if (!s) return '—'
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(s))) {
    const [y, m, d] = String(s).split('-')
    return new Date(+y, +m - 1, +d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const calcValidUntil = est => {
  if (!est) return '—'
  const base = est.estimate_date
    ? (() => { const [y, m, d] = String(est.estimate_date).slice(0, 10).split('-'); return new Date(+y, +m - 1, +d) })()
    : new Date(est.created_at)
  base.setDate(base.getDate() + (est.valid_days || 30))
  return base.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function PublicEstimate() {
  const { token } = useParams()
  const [est,          setEst]          = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [notFound,     setNotFound]     = useState(false)
  const [signerName,   setSignerName]   = useState('')
  const [agreed,       setAgreed]       = useState(false)
  const [submitting,   setSubmitting]   = useState(false)
  const [approved,     setApproved]     = useState(false)
  const [approveError, setApproveError] = useState('')

  useEffect(() => {
    fetch(`/api/public/e/${token}`)
      .then(r => {
        if (r.status === 404) { setNotFound(true); return null }
        return r.json()
      })
      .then(data => { if (data) setEst(data) })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [token])

  async function handleApprove(e) {
    e.preventDefault()
    if (!signerName.trim() || !agreed) return
    setSubmitting(true); setApproveError('')
    try {
      const res = await fetch(`/api/public/e/${token}/approve`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ signer_name: signerName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Approval failed')
      setApproved(true)
      setEst(e => ({ ...e, status: 'approved', approval: { signer_name: signerName.trim(), signed_at: new Date().toISOString() } }))
    } catch (err) {
      setApproveError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-sm text-gray-400">Loading estimate…</div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center gap-3 p-4 text-center">
        <FileX className="w-12 h-12 text-gray-300" />
        <div className="text-lg font-semibold text-gray-700">Estimate not found</div>
        <div className="text-sm text-gray-400">This link may be invalid or the estimate has been removed.</div>
      </div>
    )
  }

  const owner        = est.owner || {}
  const businessName = owner.business_name || `${owner.first_name || ''} ${owner.last_name || ''}`.trim() || 'Your Contractor'
  const initials     = businessName.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'B'
  const displayDate  = est.estimate_date ? fmtDate(String(est.estimate_date).slice(0, 10)) : fmtDate(est.created_at)
  const validUntil   = calcValidUntil(est)
  const discountAmt  = parseFloat(est.discount_amount) || 0
  const alreadyApproved = est.status === 'approved'

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-xl mx-auto flex items-center gap-2.5">
          <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-indigo-600 font-bold text-xs">{initials}</span>
          </div>
          <div>
            <div className="text-xs text-gray-400 leading-none">Estimate from</div>
            <div className="text-sm font-semibold text-gray-900 leading-tight">{businessName}</div>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto p-4 md:p-8">
        <div className="bg-white rounded-2xl shadow-[0_0_0_1px_rgba(0,0,0,.06),0_4px_6px_-1px_rgba(0,0,0,.07),0_12px_40px_rgba(0,0,0,.06)] p-6 md:p-10 mb-4">

          <div className="flex justify-between items-start mb-7">
            <div>
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center mb-2.5">
                <span className="text-indigo-600 font-bold text-sm">{initials}</span>
              </div>
              <div className="text-sm font-bold text-gray-900">{businessName}</div>
              {owner.business_phone   && <div className="text-xs text-gray-500 mt-0.5">{owner.business_phone}</div>}
              {owner.business_address && <div className="text-xs text-gray-500">{owner.business_address}</div>}
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-indigo-600 leading-none">ESTIMATE</div>
              <div className="text-xs text-gray-400 mt-2 font-mono">{est.estimate_number}</div>
            </div>
          </div>

          <div className="grid grid-cols-3 bg-gray-50 rounded-xl p-3 mb-5 gap-2">
            <div><div className="text-xs text-gray-400 mb-0.5">Date</div><div className="text-xs font-semibold text-gray-700">{displayDate}</div></div>
            <div><div className="text-xs text-gray-400 mb-0.5">Valid Until</div><div className="text-xs font-semibold text-gray-700">{validUntil}</div></div>
            <div><div className="text-xs text-gray-400 mb-0.5">Total</div><div className="text-sm font-bold text-indigo-600">{fmt(est.total)}</div></div>
          </div>

          <div className="mb-5">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Prepared For</div>
            {est.client_name
              ? <div>
                  <div className="text-sm font-semibold text-gray-900">{est.client_name}</div>
                  {est.client_email   && <div className="text-xs text-gray-500">{est.client_email}</div>}
                  {est.client_phone   && <div className="text-xs text-gray-500">{est.client_phone}</div>}
                  {est.client_address && <div className="text-xs text-gray-500">{est.client_address}</div>}
                </div>
              : <div className="text-xs text-gray-300 italic">—</div>
            }
          </div>

          {est.title && <div className="mb-4 pb-4 border-b border-gray-100"><div className="text-sm font-semibold text-gray-800">{est.title}</div></div>}

          <table className="w-full text-xs mb-1">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left text-xs font-semibold text-gray-400 pb-2">Description</th>
                <th className="text-center text-xs font-semibold text-gray-400 pb-2 w-10">Qty</th>
                <th className="text-right text-xs font-semibold text-gray-400 pb-2 w-20">Rate</th>
                <th className="text-right text-xs font-semibold text-gray-400 pb-2 w-20">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(est.line_items || []).map((item, i) => (
                <tr key={item.line_item_key ?? i} className={i % 2 === 1 ? 'bg-gray-50' : ''}>
                  <td className="py-2 pr-2 text-gray-700">{item.description}</td>
                  <td className="py-2 text-center text-gray-600">{item.quantity}</td>
                  <td className="py-2 text-right text-gray-600">{fmt(item.unit_price)}</td>
                  <td className="py-2 text-right font-semibold text-gray-800">{fmt(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t border-gray-200 pt-3 mt-1 space-y-1.5">
            <div className="flex justify-between text-xs text-gray-500"><span>Subtotal</span><span>{fmt(est.subtotal)}</span></div>
            {discountAmt > 0 && (
              <div className="flex justify-between text-xs text-gray-500">
                <span>Discount {est.discount_type === 'percent' ? `(${est.discount_value}%)` : ''}</span>
                <span className="text-red-500">−{fmt(discountAmt)}</span>
              </div>
            )}
            {parseFloat(est.tax_rate) > 0 && (
              <div className="flex justify-between text-xs text-gray-500">
                <span>Tax ({est.tax_rate}%)</span><span>{fmt(est.tax_amount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-gray-900 pt-2 border-t border-gray-200 mt-1">
              <span>Estimate Total</span><span className="text-indigo-600">{fmt(est.total)}</span>
            </div>
          </div>

          {est.notes && <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500 leading-relaxed">{est.notes}</div>}

          {est.terms && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Terms &amp; Conditions</div>
              <div className="text-xs text-gray-400 leading-relaxed">{est.terms}</div>
            </div>
          )}
        </div>

        {(approved || alreadyApproved) ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex items-start gap-4">
            <CheckCircle className="w-8 h-8 text-emerald-500 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-base font-semibold text-emerald-800 mb-1">Estimate Approved</div>
              {est.approval?.signer_name && (
                <div className="text-sm text-emerald-700">
                  Signed by <strong>{est.approval.signer_name}</strong>
                  {est.approval.signed_at && (
                    <> on {new Date(est.approval.signed_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</>
                  )}
                </div>
              )}
              {approved && (
                <div className="text-sm text-emerald-700 mt-1">
                  Thank you! <strong>{businessName}</strong> has been notified and will be in touch soon.
                </div>
              )}
            </div>
          </div>
        ) : est.status === 'declined' ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-sm text-red-700">This estimate has been declined.</div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8">
            <div className="mb-5">
              <div className="text-base font-semibold text-gray-900 mb-1">Approve This Estimate</div>
              <div className="text-sm text-gray-500 leading-relaxed">
                By typing your name below you agree to the terms of this estimate and authorize
                <strong className="text-gray-700"> {businessName} </strong>
                to begin work upon receipt of the required deposit.
              </div>
            </div>
            <form onSubmit={handleApprove} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Your Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  value={signerName}
                  onChange={e => setSignerName(e.target.value)}
                  placeholder="Type your full name as your e-signature"
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-indigo-600 flex-shrink-0" />
                <span className="text-sm text-gray-600 leading-relaxed">
                  I approve this estimate for <strong className="text-gray-900">{fmt(est.total)}</strong> and agree to the terms stated above.
                </span>
              </label>
              {approveError && (
                <div className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{approveError}</div>
              )}
              <button type="submit" disabled={!signerName.trim() || !agreed || submitting}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold text-sm py-3.5 rounded-xl transition-colors">
                {submitting ? 'Approving…' : `Approve Estimate — ${fmt(est.total)}`}
              </button>
              <p className="text-xs text-gray-400 text-center">
                Your typed name constitutes a legally binding electronic signature under the ESIGN Act.
              </p>
            </form>
          </div>
        )}

        <div className="mt-6 text-center text-xs text-gray-400">Powered by Invoicer</div>
      </div>
    </div>
  )
}
