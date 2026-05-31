import { useEffect, useState } from 'react'
import { ArrowLeft, Send, Plus, Trash2, UserPlus, X } from 'lucide-react'
import { get, post, patch } from '../api'
import { useAuth } from '../context/AuthContext'

const fmt = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0)

const formatPhone = val => {
  const d = val.replace(/\D/g, '').slice(0, 10)
  if (d.length < 4) return d
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
}

const todayISO = () => new Date().toISOString().split('T')[0]

const fmtLocalDate = iso => {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return new Date(+y, +m - 1, +d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const addDays = (iso, days) => {
  const [y, m, d] = iso.split('-')
  const date = new Date(+y, +m - 1, +d)
  date.setDate(date.getDate() + days)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

let _id = 1
const newItem = () => ({ id: _id++, desc: '', qty: 1, rate: 0 })

export function EstimateBuilder({ onBack }) {
  const { user } = useAuth()

  const [clients,        setClients]        = useState([])
  const [clientsLoading, setClientsLoading] = useState(true)
  const [selectedKey,    setSelectedKey]    = useState(null)
  const [addingClient,   setAddingClient]   = useState(false)
  const [newName,        setNewName]        = useState('')
  const [newEmail,       setNewEmail]       = useState('')
  const [newPhone,       setNewPhone]       = useState('')
  const [newAddress,     setNewAddress]     = useState('')
  const [addingLoading,  setAddingLoading]  = useState(false)

  const [title,         setTitle]         = useState('')
  const [estimateDate,  setEstimateDate]  = useState(todayISO)
  const [items,         setItems]         = useState([newItem()])
  const [taxRate,       setTaxRate]       = useState(0)
  const [discountType,  setDiscountType]  = useState('percent')
  const [discountValue, setDiscountValue] = useState(0)
  const [notes,         setNotes]         = useState('')
  const [terms,         setTerms]         = useState('This estimate is valid for 30 days from the date of issue. A 50% deposit is required to begin work.')
  const [validDays,     setValidDays]     = useState(30)
  const [tab,           setTab]           = useState('edit')
  const [saving,        setSaving]        = useState(false)
  const [saveError,     setSaveError]     = useState('')

  useEffect(() => {
    get('/api/clients')
      .then(data => {
        setClients(data)
        if (data.length > 0) setSelectedKey(data[0].client_key)
      })
      .catch(() => {})
      .finally(() => setClientsLoading(false))
  }, [])

  const selectedClient = clients.find(c => c.client_key === selectedKey) ?? null
  const subtotal        = items.reduce((s, i) => s + i.qty * i.rate, 0)
  const discountAmount  = discountType === 'percent'
    ? subtotal * discountValue / 100
    : Math.min(discountValue, subtotal)
  const discounted      = subtotal - discountAmount
  const tax             = discounted * taxRate / 100
  const total           = discounted + tax

  const addItem    = () => setItems(it => [...it, newItem()])
  const removeItem = id => setItems(it => it.filter(i => i.id !== id))
  const updItem    = (id, f, v) =>
    setItems(it => it.map(i => i.id === id ? { ...i, [f]: f === 'qty' || f === 'rate' ? parseFloat(v) || 0 : v } : i))

  async function handleAddClient() {
    if (!newName.trim()) return
    setAddingLoading(true)
    try {
      const client = await post('/api/clients', {
        name:    newName.trim(),
        email:   newEmail || null,
        phone:   newPhone || null,
        address: newAddress || null,
      })
      setClients(cs => [...cs, client])
      setSelectedKey(client.client_key)
      setAddingClient(false)
      setNewName(''); setNewEmail(''); setNewPhone(''); setNewAddress('')
    } catch (err) {
      console.error('Failed to add client:', err)
    } finally {
      setAddingLoading(false)
    }
  }

  async function save(andSend = false) {
    setSaving(true)
    setSaveError('')
    try {
      const payload = {
        client_key:     selectedKey,
        title:          title.trim() || null,
        estimate_date:  estimateDate || null,
        tax_rate:       taxRate,
        discount_type:  discountType,
        discount_value: discountValue,
        notes:          notes.trim() || null,
        terms:          terms.trim() || null,
        valid_days:     validDays,
        line_items:     items.filter(i => i.desc.trim()).map((i, idx) => ({
          description: i.desc, quantity: i.qty, unit_price: i.rate, sort_order: idx,
        })),
      }
      const est = await post('/api/estimates', payload)
      if (andSend) await patch(`/api/estimates/${est.job_key}/status`, { status: 'sent' })
      onBack()
    } catch (err) {
      setSaveError(err.message || 'Failed to save estimate')
    } finally {
      setSaving(false)
    }
  }

  const businessName = user?.business_name || (user ? `${user.first_name} ${user.last_name}` : '')
  const initials     = businessName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'Y'

  // ── Form ────────────────────────────────────────────────────────────────────────────────
  const Form = (
    <div className="space-y-6 p-4 md:p-7 overflow-y-auto flex-1">

      {/* Client */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Client</label>
          {!addingClient && clients.length > 0 && (
            <button onClick={() => setAddingClient(true)} className="flex items-center gap-1 text-xs text-indigo-600 font-semibold">
              <UserPlus className="w-3 h-3" /> Add New
            </button>
          )}
        </div>
        {clientsLoading ? (
          <div className="text-xs text-gray-400 py-3">Loading clients…</div>
        ) : addingClient ? (
          <div className="bg-gray-50 rounded-xl p-3 space-y-2 border border-gray-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-gray-600">New Client</span>
              <button onClick={() => { setAddingClient(false); setNewName(''); setNewEmail(''); setNewPhone(''); setNewAddress('') }}
                className="text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>
            </div>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Full name *"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white" />
            <input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="Email" type="email"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white" />
            <input value={newPhone} onChange={e => setNewPhone(formatPhone(e.target.value))} placeholder="(555) 000-0000"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white" />
            <input value={newAddress} onChange={e => setNewAddress(e.target.value)} placeholder="Address"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white" />
            <button onClick={handleAddClient} disabled={!newName.trim() || addingLoading}
              className="w-full bg-indigo-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-xs font-semibold py-2 rounded-lg">
              {addingLoading ? 'Adding…' : 'Add Client'}
            </button>
          </div>
        ) : clients.length === 0 ? (
          <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <span className="text-xs text-amber-700">No clients yet — add one first</span>
            <button onClick={() => setAddingClient(true)} className="text-xs text-indigo-600 font-semibold flex items-center gap-1">
              <UserPlus className="w-3 h-3" /> Add Client
            </button>
          </div>
        ) : (
          <>
            <select value={selectedKey ?? ''} onChange={e => setSelectedKey(Number(e.target.value))}
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm text-gray-900 bg-white">
              {clients.map(c => <option key={c.client_key} value={c.client_key}>{c.name}</option>)}
            </select>
            {selectedClient && (
              <div className="mt-2 text-xs text-gray-400 space-y-0.5 pl-1">
                {selectedClient.email   && <div>{selectedClient.email}</div>}
                {selectedClient.phone   && <div>{selectedClient.phone}</div>}
                {selectedClient.address && <div>{selectedClient.address}</div>}
              </div>
            )}
          </>
        )}
      </div>

      {/* Job title */}
      <div>
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Job Title</label>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Fence Installation, Lawn Service"
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900" />
      </div>

      {/* Estimate details */}
      <div>
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Estimate Details</label>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <div className="text-xs text-gray-400 mb-1">Number</div>
            <input readOnly value="Auto" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-400 bg-gray-50" />
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">Date</div>
            <input type="date" value={estimateDate} onChange={e => setEstimateDate(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900" />
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">Valid (days)</div>
            <input type="number" value={validDays} onChange={e => setValidDays(parseInt(e.target.value) || 30)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 text-center" />
          </div>
        </div>
      </div>

      {/* Line items */}
      <div>
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Line Items</label>
        <div className="space-y-2.5">
          {items.map(item => (
            <div key={item.id} className="bg-gray-50 rounded-xl p-3 space-y-2">
              <input value={item.desc} onChange={e => updItem(item.id, 'desc', e.target.value)} placeholder="Item description"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white" />
              <div className="flex gap-2 items-center">
                <div className="flex-1">
                  <div className="text-xs text-gray-400 mb-1">Qty</div>
                  <input type="number" value={item.qty} onChange={e => updItem(item.id, 'qty', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white text-center" />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-gray-400 mb-1">Rate ($)</div>
                  <input type="number" value={item.rate} onChange={e => updItem(item.id, 'rate', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white" />
                </div>
                <div className="text-right pt-4">
                  <div className="text-sm font-semibold text-gray-900">{fmt(item.qty * item.rate)}</div>
                  <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-red-400 mt-1 p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={addItem} className="mt-3 flex items-center gap-1.5 text-sm text-indigo-600 font-semibold py-2">
          <Plus className="w-3.5 h-3.5" />Add line item
        </button>
      </div>

      {/* Tax rate */}
      <div className="flex items-center justify-between py-1">
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tax Rate</label>
        <div className="flex items-center gap-1.5">
          <input type="number" value={taxRate} onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
            className="w-20 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 text-right" />
          <span className="text-sm text-gray-400 font-medium">%</span>
        </div>
      </div>

      {/* Discount */}
      <div className="flex items-center justify-between py-1">
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Discount</label>
        <div className="flex items-center gap-1.5">
          {/* Toggle */}
          <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
            <button type="button" onClick={() => setDiscountType('percent')}
              className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-colors ${discountType === 'percent' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
              %
            </button>
            <button type="button" onClick={() => setDiscountType('amount')}
              className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-colors ${discountType === 'amount' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
              $
            </button>
          </div>
          <input type="number" value={discountValue} onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)}
            className="w-20 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 text-right" />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Notes to Client</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Any additional info for the customer…"
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 resize-none" />
      </div>

      {/* Terms */}
      <div>
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Terms &amp; Conditions</label>
        <textarea value={terms} onChange={e => setTerms(e.target.value)} rows={3} placeholder="Deposit required, validity period, etc."
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 resize-none" />
      </div>
    </div>
  )

  // ── Preview ────────────────────────────────────────────────────────────────────────────────
  const Preview = (
    <div className="bg-gray-100 min-h-full flex items-start justify-center p-4 md:p-8 overflow-y-auto flex-1">
      <div className="w-full max-w-xl">
        <div className="hidden md:block text-xs text-gray-400 uppercase tracking-widest mb-4 text-center font-medium">Live Preview</div>
        <div className="bg-white rounded-2xl shadow-[0_0_0_1px_rgba(0,0,0,.06),0_4px_6px_-1px_rgba(0,0,0,.07),0_12px_40px_rgba(0,0,0,.06)] p-6 md:p-10">

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
              <div className="text-xs text-gray-400 mt-2 font-mono">EST-XXXX</div>
            </div>
          </div>

          {/* Date row */}
          <div className="grid grid-cols-3 bg-gray-50 rounded-xl p-3 mb-5 gap-2">
            <div><div className="text-xs text-gray-400 mb-0.5">Date</div><div className="text-xs font-semibold text-gray-700">{fmtLocalDate(estimateDate)}</div></div>
            <div><div className="text-xs text-gray-400 mb-0.5">Valid Until</div><div className="text-xs font-semibold text-gray-700">{addDays(estimateDate, validDays)}</div></div>
            <div><div className="text-xs text-gray-400 mb-0.5">Total</div><div className="text-sm font-bold text-indigo-600">{fmt(total)}</div></div>
          </div>

          {/* Prepared for */}
          <div className="mb-5">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Prepared For</div>
            {selectedClient
              ? <div>
                  <div className="text-sm font-semibold text-gray-900">{selectedClient.name}</div>
                  {selectedClient.email   && <div className="text-xs text-gray-500">{selectedClient.email}</div>}
                  {selectedClient.phone   && <div className="text-xs text-gray-500">{selectedClient.phone}</div>}
                  {selectedClient.address && <div className="text-xs text-gray-500">{selectedClient.address}</div>}
                </div>
              : <div className="text-xs text-gray-300 italic">No client selected</div>
            }
          </div>

          {/* Title */}
          {title && <div className="mb-4 pb-4 border-b border-gray-100"><div className="text-sm font-semibold text-gray-800">{title}</div></div>}

          {/* Line items table */}
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
              {items.map((item, i) => (
                <tr key={item.id} className={i % 2 === 1 ? 'bg-gray-50' : ''}>
                  <td className="py-2 pr-2 text-gray-700">{item.desc || <span className="text-gray-300 italic">—</span>}</td>
                  <td className="py-2 text-center text-gray-600">{item.qty}</td>
                  <td className="py-2 text-right text-gray-600">{fmt(item.rate)}</td>
                  <td className="py-2 text-right font-semibold text-gray-800">{fmt(item.qty * item.rate)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="border-t border-gray-200 pt-3 mt-1 space-y-1.5">
            <div className="flex justify-between text-xs text-gray-500"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
            {discountValue > 0 && (
              <div className="flex justify-between text-xs text-gray-500">
                <span>Discount {discountType === 'percent' ? `(${discountValue}%)` : ''}</span>
                <span className="text-red-500">−{fmt(discountAmount)}</span>
              </div>
            )}
            {taxRate > 0 && (
              <div className="flex justify-between text-xs text-gray-500">
                <span>Tax ({taxRate}%)</span><span>{fmt(tax)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-gray-900 pt-2 border-t border-gray-200 mt-1">
              <span>Estimate Total</span><span className="text-indigo-600">{fmt(total)}</span>
            </div>
          </div>

          {/* Notes */}
          {notes && <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500 leading-relaxed">{notes}</div>}

          {/* Terms */}
          {terms && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Terms &amp; Conditions</div>
              <div className="text-xs text-gray-400 leading-relaxed">{terms}</div>
            </div>
          )}

          {/* Signature lines */}
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
  )

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 md:px-6 py-3.5 bg-white border-b border-gray-200 flex-shrink-0 sticky top-0 z-20">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 font-medium min-h-[44px] pr-2">
          <ArrowLeft className="w-4 h-4" />Back
        </button>
        <span className="hidden md:block text-gray-300">|</span>
        <span className="text-sm font-semibold text-gray-800 flex-1">New Estimate</span>
        {saveError && <span className="text-xs text-red-500">{saveError}</span>}
        <div className="flex gap-2">
          <button onClick={() => save(false)} disabled={saving}
            className="px-3 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-300 rounded-lg min-h-[38px] disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Draft'}
          </button>
          <button onClick={() => save(true)} disabled={saving}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg min-h-[38px] disabled:opacity-50">
            <Send className="w-3 h-3" />{saving ? 'Sending…' : 'Send Estimate'}
          </button>
        </div>
      </div>

      {/* Mobile tab switcher */}
      <div className="md:hidden flex border-b border-gray-200 bg-white flex-shrink-0">
        {['edit', 'preview'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-semibold capitalize transition-colors ${tab === t ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-400'}`}>
            {t === 'edit' ? 'Edit' : 'Preview'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        <div className={`${tab === 'edit' ? 'flex' : 'hidden'} flex-col w-full md:flex md:w-[46%] md:border-r md:border-gray-200 bg-white overflow-y-auto`}>{Form}</div>
        <div className={`${tab === 'preview' ? 'flex' : 'hidden'} flex-col flex-1 w-full md:flex overflow-y-auto`}>{Preview}</div>
      </div>
    </div>
  )
}
