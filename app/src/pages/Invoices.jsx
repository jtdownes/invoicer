import { useEffect, useState } from 'react'
import { Eye, EyeOff, ChevronRight, FileText, Plus } from 'lucide-react'
import { get } from '../api'
import { Badge } from '../components/Badge'
import { EmptyState } from '../components/EmptyState'

const fmt = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0)

const FILTERS = ['All', 'Draft', 'Outstanding', 'Overdue', 'Paid']

export function Invoices({ onNew }) {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('All')

  useEffect(() => {
    get('/api/invoices')
      .then(setInvoices)
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false))
  }, [])

  const visible = filter === 'All'
    ? invoices
    : invoices.filter(inv => inv.status?.toLowerCase() === filter.toLowerCase())

  return (
    <>
      <div className="hidden md:flex items-center justify-between px-8 py-5 bg-white border-b border-gray-200 sticky top-0 z-10">
        <h1 className="text-lg font-semibold text-gray-900">Invoices</h1>
        <button onClick={onNew} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2 px-4 rounded-lg transition-colors">
          <Plus className="w-3.5 h-3.5" /> New Invoice
        </button>
      </div>
      <div className="px-4 md:px-8 py-4 md:py-6 max-w-5xl">
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-colors
                ${filter === f ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300'}`}>
              {f}
            </button>
          ))}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="px-6 py-10 text-center text-xs text-gray-400">Loading…</div>
          ) : visible.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={invoices.length === 0 ? 'No invoices yet' : `No ${filter.toLowerCase()} invoices`}
              description={invoices.length === 0 ? 'Create your first invoice to get started' : undefined}
              action={invoices.length === 0 ? 'New Invoice' : undefined}
              onAction={invoices.length === 0 ? onNew : undefined}
            />
          ) : (
            <>
              <div className="md:hidden divide-y divide-gray-100">
                {visible.map(inv => (
                  <div key={inv.id} className="px-4 py-4 flex items-center gap-3 active:bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-sm font-semibold text-gray-900 truncate">{inv.client_name}</span>
                        <span className="text-sm font-bold text-gray-900 flex-shrink-0">{fmt(inv.total)}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge status={inv.status} />
                        <span className="text-xs text-gray-400">{inv.number}</span>
                        <span className="text-xs text-gray-400">Due {inv.due_date}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  </div>
                ))}
              </div>
              <table className="hidden md:table w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Invoice', 'Client', 'Amount', 'Status', 'Opened', 'Issued', 'Due', ''].map(h => (
                      <th key={h} className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-5 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((inv, i) => (
                    <tr key={inv.id} className={`hover:bg-gray-50 transition-colors ${i < visible.length - 1 ? 'border-b border-gray-50' : ''}`}>
                      <td className="px-5 py-3.5 text-xs font-mono font-medium text-gray-700">{inv.number}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-800">{inv.client_name}</td>
                      <td className="px-5 py-3.5 text-sm font-semibold text-gray-900">{fmt(inv.total)}</td>
                      <td className="px-5 py-3.5"><Badge status={inv.status} /></td>
                      <td className="px-5 py-3.5">
                        {inv.viewed_at
                          ? <span className="flex items-center gap-1 text-xs text-emerald-600"><Eye className="w-3 h-3" />{inv.viewed_at}</span>
                          : <span className="flex items-center gap-1 text-xs text-gray-400"><EyeOff className="w-3 h-3" />Unseen</span>}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-500">{inv.issued_date}</td>
                      <td className="px-5 py-3.5 text-xs text-gray-500">{inv.due_date}</td>
                      <td className="px-5 py-3.5"><button className="text-xs text-indigo-600 font-medium">View</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </>
  )
}
