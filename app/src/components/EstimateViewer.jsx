import { useEffect, useState } from 'react'
import { X, Send, Printer, ChevronDown } from 'lucide-react'
import { get, patch } from '../api'
import { Badge } from './Badge'
import { useAuth } from '../context/AuthContext'

const fmt = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0)

const fmtDate = s => {
  if (!s) return '—'
  // YYYY-MM-DD → treat as local date to avoid timezone shift
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

const STATUSES = ['draft', 'sent', 'approved', 'declined']

export function EstimateViewer({ jobKey, onClose }) {
  const { user } = useAuth()
  const [est,      setEst]      = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    setLoading(true)
    get(`/api/estimates/${jobKey}`)
      .then(setEst)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [jobKey])

  async function changeStatus(status) {
    setUpdating(true)
    try {
      await patch(`/api/estimates/${jobKey}/status`, { status })
      setEst(e => ({ ...e, status }))
    } catch (err) {
      console.error('Status update failed:', err)
    } finally {
      setUpdating(false)
    }
  }

  const businessName = user?.business_name || (user ? `${user.first_name} ${user.last_name}` : '')
  const initials     = businessName.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'Y'

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-100 flex items-center justify-center">
        <div className="text-sm text-gray-400">Loading estimate…</div>
      </div>
    )
  }

  if (!est) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-100 flex flex-col items-center justify-center gap-3">
        <div className="text-sm text-gray-500">Estimate not found.</div>
        <button onClick={onClose} className="text-xs text-indigo-600 font-semibold">Close</button>
      </div>
    )
  }

  const displayDate  = est.estimate_date ? fmtDate(String(est.estimate_date).slice(0, 10)) : fmtDate(est.created_at)
  const validUntil   = calcValidUntil(est)
  const discountAmt  = parseFloat(est.discount_amount) || 0

  return (
    <div className="fixed inset-0 z-50 bg-gray-100 flex flex-col">

      {/* ── Action bar (hidden on print) ──────────────────────────────────── */}
      <div className="print:hidden flex items-center gap-2 px-4 md:px-6 py-3 bg-white border-b border-gray-200 flex-shrink-0">
        <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 -ml-1">
          <X className="w-5 h-5" />
        </button>
        <span className="font-mono text-xs font-medium text-gray-500">{est.estimate_number}</span>
        <Badge status={est.status} />
        <div className="flex-1" />

        {/* Status dropdown */}
        <div className="relative">
          <select
            value={est.status}
            onChange={e => changeStatus(e.target.value)}
            disabled={updating}
            className="appearance-none text-xs font-medium text-gray-600 bg-gray-100 border border-gray-200 rounded-lg pl-3 pr-7 py-2 cursor-pointer disabled:opacity-50"
          >
            {STATUSES.map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
        </div>

        <button
          onClick={() => window.print()}
          className="hidden md:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <Printer className="w-3.5 h-3.5" /> Print / PDF
        </button>

        {est.status === 'draft' && (
          <button
            onClick={() => changeStatus('sent')}
            disabled={updating}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg disabled:opacity-50 hover:bg-indigo-500"
          >
            <Send className="w-3 h-3" /> Mark Sent
          </button>
        )}
      </div>

      {/* ── Estimate document ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto p-4 md:p-8 print:p-0 print:overflow-visible">
        <div className="w-full max-w-xl mx-auto">
          <div className="bg-white rounded-2xl shadow-[0_0_0_1px_rgba(0,0,0,.06),0_4px_6px_-1px_rgba(0,0,0,.07),0_12px_40px_rgba(0,0,0,.06)] p-6 md:p-10 print:shadow-none print:rounded-none">

            {/* Header */}
            <div className="flex justify-between items-start mb-7">
              <div>
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center mb-2.5">
                  <span className="text-indigo-600 font-bold text-sm">{initials}</span>
                </div>
                <div className="text-sm font-bold text-gray-900">{businessName || 'Your Business'}</div>
                {user?.business_phone   && <div className="text-xs text-gray-500 mt-0.5">{user.business_phone}</div>}
                {user?.business_address && <div className="text-xs text-gray-500">{user.business_address}</div>}
              </div>
              <div className="text-right">
                <div className="text-3xl font-black text-indigo-600 leading-none">ESTIMATE</div>
                <div className="text-xs text-gray-400 mt-2 font-mono">{est.estimate_number}</div>
              </div>
            </div>

            {/* Date / validity / total */}
            <div className="grid grid-cols-3 bg-gray-50 rounded-xl p-3 mb-5 gap-2">
              <div><div className="text-xs text-gray-400 mb-0.5">Date</div><div className="text-xs font-semibold text-gray-700">{displayDate}</div></div>
              <div><div className="text-xs text-gray-400 mb-0.5">Valid Until</div><div className="text-xs font-semibold text-gray-700">{validUntil}</div></div>
              <div><div className="text-xs text-gray-400 mb-0.5">Total</div><div className="text-sm font-bold text-indigo-600">{fmt(est.total)}</div></div>
            </div>

            {/* Prepared for */}
            <div className="mb-5">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Prepared For</div>
              {est.client_name
                ? <div>
                    <div className="text-sm font-semibold text-gray-900">{est.client_name}</div>
                    {est.client_email   && <div className="text-xs text-gray-500">{est.client_email}</div>}
                    {est.client_phone   && <div className="text-xs text-gray-500">{est.client_phone}</div>}
                    {est.client_address && <div className="text-xs text-gray-500">{est.client_address}</div>}
                  </div>
                : <div className="text-xs text-gray-300 italic">No client</div>
              }
            </div>

            {/* Title */}
            {est.title && (
              <div className="mb-4 pb-4 border-b border-gray-100">
                <div className="text-sm font-semibold text-gray-800">{est.title}</div>
              </div>
            )}

            {/* Line items */}
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

            {/* Totals */}
            <div className="border-t border-gray-200 pt-3 mt-1 space-y-1.5">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Subtotal</span><span>{fmt(est.subtotal)}</span>
              </div>
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

            {/* Notes */}
            {est.notes && (
              <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500 leading-relaxed">
                {est.notes}
              </div>
            )}

            {/* Terms */}
            {est.terms && (
              <div className="mt-4 pt-3 border-t border-gray-100">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Terms &amp; Conditions</div>
                <div className="text-xs text-gray-400 leading-relaxed">{est.terms}</div>
              </div>
            )}

            {/* Signature */}
            <div className="mt-6 pt-4 border-t-2 border-dashed border-gray-200">
              <div className="text-xs text-gray-400 mb-4">By signing below, you agree to the terms of this estimate and authorize work to begin upon deposit.</div>
              <div className="flex gap-6">
                <div className="flex-1"><div className="border-b border-gray-300 h-8 mb-1" /><div className="text-xs text-gray-400">Customer Signature</div></div>
                <div className="w-32"><div className="border-b border-gray-300 h-8 mb-1" /><div className="text-xs text-gray-400">Date</div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
