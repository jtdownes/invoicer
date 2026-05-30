import { useEffect, useState } from 'react'
import { FileText, Plus } from 'lucide-react'
import { get } from '../api'
import { Badge } from '../components/Badge'
import { EmptyState } from '../components/EmptyState'

const fmt = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0)

const FILTERS = ['All', 'Draft', 'Outstanding', 'Overdue', 'Paid']

export function Invoices({ onNew }) {
  const [invoices, setInvoices] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState('All')

  useEffect(() => {
    get('/api/invoices')
      .then(setInvoices)
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false))
  }, [])

  const visible = filter === 'All'
    ? invoices
    : invoices.filter(i => i.status?.toLowerCase() === filter.toLowerCase())

  return (
    <>
      {/* Desktop header */}
      <div className="hidden md:flex items-center justify-between px-8 py-5 bg-white border-b border-gray-200 sticky top-0 z-10">
        <h1 className="text-lg font-semibold text-gray-900">Invoices</h1>
        <button
          onClick={onNew}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> New Invoice
        </button>
      </div>
      <div className="px-4 md:px-8 py-4 md:py-6">
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors
                ${filter === f ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300'}`}
            >
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
              title={filter === 'All' ? 'No invoices yet' : `No ${filter.toLowerCase()} invoices`}
              description={filter === 'All' ? 'Create your first invoice to get started' : 'Try a different filter'}
              action={filter === 'All' ? 'New Invoice' : null}
              onAction={filter === 'All' ? onNew : null}
            />
          ) : (
            <>
              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-gray-100">
                {visible.map(inv => (
                  <div key={inv.id} className="px-4 py-4">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div>
                        <div className="text-xs font-mono text-gray-400 mb-0.5">{inv.number}</div>
                        <div className="text-sm font-semibold text-gray-900">{inv.client_name}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-bold text-gray-900">{fmt(inv.total)}</div>
                        <div className="text-xs text-gray-400 mt-0.5">Due {inv.due_date}</div>
                      </div>
                    </div>
                    <Badge status={inv.status} />
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <table className="hidden md:table w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Invoice', 'Client', 'Amount', 'Status', 'Due', ''].map(h => (
                      <th key={h} className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-5 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((inv, i) => (
                    <tr key={inv.id} className={`hover:bg-gray-50 transition-colors ${i < visible.length - 1 ? 'border-b border-gray-50' : ''}`}>
                      <td className="px-5 py-3.5 text-xs font-mono font-medium text-gray-500">{inv.number}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-800">{inv.client_name}</td>
                      <td className="px-5 py-3.5 text-sm font-semibold text-gray-900">{fmt(inv.total)}</td>
                      <td className="px-5 py-3.5"><Badge status={inv.status} /></td>
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
