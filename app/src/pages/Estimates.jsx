import { useEffect, useState } from 'react'
import { FileText, Plus, Eye } from 'lucide-react'
import { get } from '../api'
import { Badge } from '../components/Badge'
import { EmptyState } from '../components/EmptyState'

const fmt = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0)
const fmtDate = s => s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

const FILTERS = ['All', 'Draft', 'Sent', 'Approved', 'Declined']

export function Estimates({ onNew }) {
  const [estimates, setEstimates] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [filter,    setFilter]    = useState('All')

  useEffect(() => {
    get('/api/estimates')
      .then(setEstimates)
      .catch(() => setEstimates([]))
      .finally(() => setLoading(false))
  }, [])

  const visible = filter === 'All'
    ? estimates
    : estimates.filter(e => e.status?.toLowerCase() === filter.toLowerCase())

  return (
    <>
      <div className="hidden md:flex items-center justify-between px-8 py-5 bg-white border-b border-gray-200 sticky top-0 z-10">
        <h1 className="text-lg font-semibold text-gray-900">Estimates</h1>
        <button onClick={onNew} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2 px-4 rounded-lg transition-colors">
          <Plus className="w-3.5 h-3.5" /> New Estimate
        </button>
      </div>

      <div className="px-4 md:px-8 py-4 md:py-6">
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors
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
              title={filter === 'All' ? 'No estimates yet' : `No ${filter.toLowerCase()} estimates`}
              description={filter === 'All' ? 'Create your first estimate to get started' : 'Try a different filter'}
              action={filter === 'All' ? 'New Estimate' : null}
              onAction={filter === 'All' ? onNew : null}
            />
          ) : (
            <>
              <div className="md:hidden divide-y divide-gray-100">
                {visible.map(est => (
                  <div key={est.job_key} className="px-4 py-4">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div>
                        <div className="text-xs font-mono text-gray-400 mb-0.5">{est.estimate_number}</div>
                        <div className="text-sm font-semibold text-gray-900">{est.client_name ?? 'No client'}</div>
                        {est.title && <div className="text-xs text-gray-400 mt-0.5">{est.title}</div>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-bold text-gray-900">{fmt(est.total)}</div>
                        {est.view_count > 0 && (
                          <div className="flex items-center gap-0.5 text-xs text-emerald-600 font-medium justify-end mt-0.5">
                            <Eye className="w-3 h-3" />{est.view_count}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge status={est.status} />
                      <span className="text-xs text-gray-400">{fmtDate(est.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <table className="hidden md:table w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Estimate', 'Client', 'Title', 'Amount', 'Status', 'Views', 'Date', ''].map(h => (
                      <th key={h} className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-5 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((est, i) => (
                    <tr key={est.job_key} className={`hover:bg-gray-50 transition-colors ${i < visible.length - 1 ? 'border-b border-gray-50' : ''}`}>
                      <td className="px-5 py-3.5 text-xs font-mono font-medium text-gray-500">{est.estimate_number}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-800">{est.client_name ?? <span className="text-gray-300 italic">—</span>}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-500 max-w-[180px] truncate">{est.title ?? <span className="text-gray-300 italic">—</span>}</td>
                      <td className="px-5 py-3.5 text-sm font-semibold text-gray-900">{fmt(est.total)}</td>
                      <td className="px-5 py-3.5"><Badge status={est.status} /></td>
                      <td className="px-5 py-3.5">
                        {est.view_count > 0
                          ? <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium"><Eye className="w-3 h-3" />{est.view_count}</span>
                          : <span className="text-xs text-gray-300">—</span>
                        }
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-500">{fmtDate(est.created_at)}</td>
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
