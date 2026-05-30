import { useEffect, useState } from 'react'
import { Users, ChevronRight, Plus } from 'lucide-react'
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
      <div className="hidden md:flex items-center justify-between px-8 py-5 bg-white border-b border-gray-200 sticky top-0 z-10">
        <h1 className="text-lg font-semibold text-gray-900">Clients</h1>
        <button className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2 px-4 rounded-lg transition-colors">
          <Plus className="w-3.5 h-3.5" /> Add Client
        </button>
      </div>
      <div className="px-4 md:px-8 py-4 md:py-6 max-w-3xl">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="px-6 py-10 text-center text-xs text-gray-400">Loading…</div>
          ) : clients.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No clients yet"
              description="Add your first client to start sending invoices"
              action="Add Client"
            />
          ) : (
            <div className="divide-y divide-gray-100">
              {clients.map(client => (
                <div key={client.id} className="px-4 md:px-6 py-4 flex items-center gap-3 hover:bg-gray-50 cursor-pointer">
                  <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold flex-shrink-0">
                    {client.name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900">{client.name}</div>
                    <div className="text-xs text-gray-400">{client.email}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
