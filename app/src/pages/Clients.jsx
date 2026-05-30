import { useEffect, useState } from 'react'
import { Users } from 'lucide-react'
import { get } from '../api'
import { EmptyState } from '../components/EmptyState'

export function Clients({ onNewInvoice }) {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    get('/api/clients')
      .then(setClients)
      .catch(() => setClients([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      {/* Desktop header */}
      <div className="hidden md:flex items-center justify-between px-8 py-5 bg-white border-b border-gray-200 sticky top-0 z-10">
        <h1 className="text-lg font-semibold text-gray-900">Clients</h1>
        <button className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2 px-4 rounded-lg transition-colors">
          + Add Client
        </button>
      </div>
      <div className="px-4 md:px-8 py-4 md:py-6">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="px-6 py-10 text-center text-xs text-gray-400">Loading…</div>
          ) : clients.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No clients yet"
              description="Add your first client to start sending invoices"
              action="New Invoice"
              onAction={onNewInvoice}
            />
          ) : (
            <table className="hidden md:table w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Name', 'Email', 'Phone', 'Invoices', ''].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clients.map((c, i) => (
                  <tr key={c.id} className={`hover:bg-gray-50 transition-colors ${i < clients.length - 1 ? 'border-b border-gray-50' : ''}`}>
                    <td className="px-5 py-3.5 text-sm font-medium text-gray-900">{c.name}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-500">{c.email}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-500">{c.phone}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-500">{c.invoice_count ?? 0}</td>
                    <td className="px-5 py-3.5"><button className="text-xs text-indigo-600 font-medium">View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}
