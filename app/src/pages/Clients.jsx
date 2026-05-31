import { useEffect, useState } from 'react'
import { Users, Plus, X } from 'lucide-react'
import { get, post } from '../api'
import { EmptyState } from '../components/EmptyState'

const formatPhone = val => {
  const d = val.replace(/\D/g, '').slice(0, 10)
  if (d.length < 4) return d
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
}

export function Clients({ onNew }) {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding,  setAdding]  = useState(false)
  const [name,    setName]    = useState('')
  const [email,   setEmail]   = useState('')
  const [phone,   setPhone]   = useState('')
  const [address, setAddress] = useState('')
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  useEffect(() => {
    get('/api/clients')
      .then(setClients)
      .catch(() => setClients([]))
      .finally(() => setLoading(false))
  }, [])

  async function handleAdd(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true); setError('')
    try {
      const client = await post('/api/clients', {
        name:    name.trim(),
        email:   email.trim() || null,
        phone:   phone.trim() || null,
        address: address.trim() || null,
      })
      setClients(cs => [...cs, client])
      setName(''); setEmail(''); setPhone(''); setAddress('')
      setAdding(false)
    } catch (err) {
      setError(err.message || 'Failed to add client')
    } finally {
      setSaving(false)
    }
  }

  function cancel() { setAdding(false); setName(''); setEmail(''); setPhone(''); setAddress(''); setError('') }

  return (
    <>
      <div className="hidden md:flex items-center justify-between px-8 py-5 bg-white border-b border-gray-200 sticky top-0 z-10">
        <h1 className="text-lg font-semibold text-gray-900">Clients</h1>
        <button onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2 px-4 rounded-lg transition-colors">
          <Plus className="w-3.5 h-3.5" /> Add Client
        </button>
      </div>

      <div className="px-4 md:px-8 py-4 md:py-6">
        {adding && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">New Client</h2>
              <button onClick={cancel} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleAdd} className="space-y-3">
              <div className="grid md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-500 font-medium mb-1 block">Name *</label>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" required
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium mb-1 block">Email</label>
                  <input value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" type="email"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium mb-1 block">Phone</label>
                  <input value={phone} onChange={e => setPhone(formatPhone(e.target.value))} placeholder="(555) 000-0000"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">Address</label>
                <input value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Main St, City, State 00000"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900" />
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <div className="flex gap-2 justify-end pt-1">
                <button type="button" onClick={cancel}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-300 rounded-lg">Cancel</button>
                <button type="submit" disabled={!name.trim() || saving}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 disabled:bg-gray-200 disabled:text-gray-400 rounded-lg">
                  {saving ? 'Saving…' : 'Add Client'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="px-6 py-10 text-center text-xs text-gray-400">Loading…</div>
          ) : clients.length === 0 ? (
            <EmptyState icon={Users} title="No clients yet" description="Add your first client to start sending estimates"
              action="Add Client" onAction={() => setAdding(true)} />
          ) : (
            <>
              <div className="md:hidden divide-y divide-gray-100">
                {clients.map(c => (
                  <div key={c.client_key} className="px-4 py-4">
                    <div className="text-sm font-semibold text-gray-900">{c.name}</div>
                    {c.email   && <div className="text-xs text-gray-400 mt-0.5">{c.email}</div>}
                    {c.phone   && <div className="text-xs text-gray-400">{c.phone}</div>}
                    {c.address && <div className="text-xs text-gray-400">{c.address}</div>}
                  </div>
                ))}
              </div>
              <table className="hidden md:table w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Name', 'Email', 'Phone', 'Address', ''].map(h => (
                      <th key={h} className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-5 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c, i) => (
                    <tr key={c.client_key}
                      className={`hover:bg-gray-50 transition-colors ${i < clients.length - 1 ? 'border-b border-gray-50' : ''}`}>
                      <td className="px-5 py-3.5 text-sm font-medium text-gray-900">{c.name}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-500">{c.email ?? <span className="text-gray-300">—</span>}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-500">{c.phone ?? <span className="text-gray-300">—</span>}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-500">{c.address ?? <span className="text-gray-300">—</span>}</td>
                      <td className="px-5 py-3.5">
                        <button onClick={onNew} className="text-xs text-indigo-600 font-medium">New Estimate</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>

        {!adding && (
          <button onClick={() => setAdding(true)}
            className="md:hidden mt-4 w-full flex items-center justify-center gap-1.5 bg-indigo-600 text-white text-sm font-semibold py-3 rounded-xl">
            <Plus className="w-4 h-4" /> Add Client
          </button>
        )}
      </div>
    </>
  )
}
