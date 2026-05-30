import { useEffect, useState } from 'react'
import { Eye, EyeOff, ChevronRight, FileText, Plus } from 'lucide-react'
import { get } from '../api'
import { Badge } from '../components/Badge'
import { EmptyState } from '../components/EmptyState'

const fmt = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0)

const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

export function Dashboard({ onNew }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    get('/api/invoices/dashboard')
      .then(setData)
      .catch(() => setData({ stats: {}, recent_invoices: [] }))
      .finally(() => setLoading(false))
  }, [])

  const stats    = data?.stats ?? {}
  const invoices = data?.recent_invoices ?? []

  return (
    <>
      {/* Desktop top bar */}
      <div className="hidden md:flex items-center justify-between px-8 py-5 bg-white border-b border-gray-200 sticky top-0 z-10">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Dashboard</h1>
          <p className="text-xs text-gray-400 mt-0.5">{today}</p>
        </div>
        <button
          onClick={onNew}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> New Invoice
        </button>
      </div>

      <div className="px-4 md:px-8 py-4 md:py-6">

        {/* Mobile greeting */}
        <div className="md:hidden mb-4">
          <div className="text-lg font-bold text-gray-900">Good morning</div>
          <div className="text-xs text-gray-400 mt-0.5">{today}</div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Total Billed',    value: fmt(stats.total_billed),       sub: 'All time',                        cls: 'text-gray-900'    },
            { label: 'Outstanding',     value: fmt(stats.outstanding_amount),  sub: `${stats.outstanding_count ?? 0} invoices`, cls: 'text-amber-600'   },
            { label: 'Overdue',         value: fmt(stats.overdue_amount),      sub: 'Action needed',                   cls: 'text-red-600'     },
            { label: 'Paid This Month', value: fmt(stats.paid_this_month),     sub: 'Current month',                   cls: 'text-emerald-600' },
          ].map(({ label, value, sub, cls }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-xs text-gray-400 font-medium mb-1">{label}</div>
              <div className={`text-xl font-bold mb-0.5 leading-tight ${cls}`}>{value}</div>
              <div className="text-xs text-gray-400">{sub}</div>
            </div>
          ))}
        </div>

        {/* Recent invoices */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
          <div className="flex items-center justify-between px-4 md:px-6 py-3.5 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Recent Invoices</h2>
          </div>

          {loading ? (
            <div className="px-6 py-10 text-center text-xs text-gray-400">Loading…</div>
          ) : invoices.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No invoices yet"
              description="Create your first invoice to get started"
              action="New Invoice"
              onAction={onNew}
            />
          ) : (
            <>
              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-gray-100">
                {invoices.map(inv => (
                  <div key={inv.id} className="px-4 py-4 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-sm font-semibold text-gray-900 truncate">{inv.client_name}</span>
                        <span className="text-sm font-bold text-gray-900 flex-shrink-0">{fmt(inv.total)}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge status={inv.status} />
                        <span className="text-xs text-gray-400">Due {inv.due_date}</span>
                        {inv.viewed_at
                          ? <span className="flex items-center gap-0.5 text-xs text-emerald-600 font-medium"><Eye className="w-3 h-3" />Opened</span>
                          : <span className="flex items-center gap-0.5 text-xs text-gray-400"><EyeOff className="w-3 h-3" />Unseen</span>
                        }
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <table className="hidden md:table w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Invoice', 'Client', 'Amount', 'Status', 'Opened', 'Due', ''].map(h => (
                      <th key={h} className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-5 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv, i) => (
                    <tr key={inv.id} className={`hover:bg-gray-50 transition-colors ${i < invoices.length - 1 ? 'border-b border-gray-50' : ''}`}>
                      <td className="px-5 py-3.5 text-xs font-mono font-medium text-gray-700">{inv.number}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-800">{inv.client_name}</td>
                      <td className="px-5 py-3.5 text-sm font-semibold text-gray-900">{fmt(inv.total)}</td>
                      <td className="px-5 py-3.5"><Badge status={inv.status} /></td>
                      <td className="px-5 py-3.5">
                        {inv.viewed_at
                          ? <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium"><Eye className="w-3 h-3" />{inv.viewed_at}</span>
                          : <span className="flex items-center gap-1 text-xs text-gray-400"><EyeOff className="w-3 h-3" />Not opened</span>
                        }
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-500">{inv.due_date}</td>
                      <td className="px-5 py-3.5"><button className="text-xs text-indigo-600 font-medium">View</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>

        {/* Stripe Connect CTA */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 rounded-xl p-4 md:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="text-white font-semibold text-sm">Connect your bank for direct payouts</div>
            <div className="text-indigo-200 text-xs mt-0.5">Free standard (2 days) · 1% instant — better than PayPal’s 1.5% fee</div>
          </div>
          <button className="bg-white text-indigo-600 text-xs font-semibold py-2.5 px-4 rounded-lg whitespace-nowrap flex-shrink-0">
            Connect Bank
          </button>
        </div>
      </div>
    </>
  )
}
