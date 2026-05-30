import { useEffect, useState } from 'react'
import { ArrowLeft, Send, Plus, Trash2, Check } from 'lucide-react'
import { get } from '../api'
import { useAuth } from '../context/AuthContext'

const fmt = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0)

const today      = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const thirtyDays = new Date(Date.now() + 30 * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

const PAY_METHODS = [
  { k: 'card',   label: 'Credit / Debit Card', sub: '2.9% + 30¢' },
  { k: 'paypal', label: 'PayPal',               sub: '3.49% + 49¢' },
  { k: 'klarna', label: 'Klarna (Pay Later)',    sub: '3.29% + 30¢' },
  { k: 'affirm', label: 'Affirm (Financing)',    sub: 'Varies' },
]

let _nextItemId = 1
const newItem = () => ({ id: _nextItemId++, desc: '', qty: 1, rate: 0 })

export function InvoiceBuilder({ onBack }) {
  const { user } = useAuth()

  const [clients, setClients] = useState([])
  const [clientsLoading, setClientsLoading] = useState(true)
  const [selectedClientId, setSelectedClientId] = useState(null)

  const [dueDate, setDueDate] = useState(thirtyDays)
  const [items,   setItems]   = useState([newItem()])
  const [taxRate, setTaxRate] = useState(0)
  const [notes,   setNotes]   = useState('')
  const [methods, setMethods] = useState({ card: true, paypal: false, klarna: false, affirm: false })
  const [tab,     setTab]     = useState('edit')

  useEffect(() => {
    get('/api/clients')
      .then(data => {
        setClients(data)
        if (data.length > 0) setSelectedClientId(data[0].id)
      })
      .catch(() => {})
      .finally(() => setClientsLoading(false))
  }, [])

  const selectedClient = clients.find(c => c.id === selectedClientId) ?? null
  const subtotal = items.reduce((s, i) => s + i.qty * i.rate, 0)
  const tax      = subtotal * taxRate / 100
  const total    = subtotal + tax
  const enabledMethods = PAY_METHODS.filter(m => methods[m.k]).map(m => m.label)

  const addItem    = () => setItems(it => [...it, newItem()])
  const removeItem = id => setItems(it => it.filter(i => i.id !== id))
  const updItem    = (id, f, v) =>
    setItems(it => it.map(i => i.id === id ? { ...i, [f]: f === 'qty' || f === 'rate' ? parseFloat(v) || 0 : v } : i))
  const toggleMethod = k => setMethods(m => ({ ...m, [k]: !m[k] }))

  const userName = user ? `${user.first_name} ${user.last_name}` : ''

  const Form = (
    <div className="space-y-6 p-4 md:p-7 overflow-y-auto flex-1">
      <div>
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Bill To</label>
        {clientsLoading ? (
          <div className="text-xs text-gray-400 py-3">Loading clients…</div>
        ) : clients.length === 0 ? (
          <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <span className="text-xs text-amber-700">No clients yet — add one first</span>
            <button className="text-xs text-indigo-600 font-semibold">Add Client</button>
          </div>
        ) : (
          <>
            <select value={selectedClientId ?? ''} onChange={e => setSelectedClientId(Number(e.target.value))}
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm text-gray-900 bg-white">
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {selectedClient && (
              <div className="mt-2 text-xs text-gray-400 space-y-0.5 pl-1">
                <div>{selectedClient.email}</div>
                {selectedClient.address && <div>{selectedClient.address}</div>}
              </div>
            )}
          </>
        )}
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Invoice Details</label>
        <div className="grid grid-cols-3 gap-2">
          <div><div className="text-xs text-gray-400 mb-1">Invoice #</div><input readOnly value="Auto" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-400 bg-gray-50" /></div>
          <div><div className="text-xs text-gray-400 mb-1">Issued</div><input readOnly value={today} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-400 bg-gray-50" /></div>
          <div><div className="text-xs text-gray-400 mb-1">Due Date</div><input value={dueDate} onInput={e => setDueDate(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900" /></div>
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Line Items</label>
        <div className="space-y-2.5">
          {items.map(item => (
            <div key={item.id} className="bg-gray-50 rounded-xl p-3 space-y-2">
              <input value={item.desc} onInput={e => updItem(item.id, 'desc', e.target.value)} placeholder="Item description"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white" />
              <div className="flex gap-2 items-center">
                <div className="flex-1"><div className="text-xs text-gray-400 mb-1">Qty</div><input type="number" value={item.qty} onInput={e => updItem(item.id, 'qty', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white text-center" /></div>
                <div className="flex-1"><div className="text-xs text-gray-400 mb-1">Rate ($)</div><input type="number" value={item.rate} onInput={e => updItem(item.id, 'rate', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white" /></div>
                <div className="text-right pt-4"><div className="text-sm font-semibold text-gray-900">{fmt(item.qty * item.rate)}</div><button onClick={() => removeItem(item.id)} className="text-gray-300 mt-1 p-1"><Trash2 className="w-3.5 h-3.5" /></button></div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={addItem} className="mt-3 flex items-center gap-1.5 text-sm text-indigo-600 font-semibold py-2">
          <Plus className="w-3.5 h-3.5" />Add line item
        </button>
      </div>
      <div className="flex items-center justify-between py-1">
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tax Rate</label>
        <div className="flex items-center gap-1.5">
          <input type="number" value={taxRate} onInput={e => setTaxRate(parseFloat(e.target.value) || 0)} className="w-20 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 text-right" />
          <span className="text-sm text-gray-400 font-medium">%</span>
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Notes</label>
        <textarea value={notes} onInput={e => setNotes(e.target.value)} rows={3} placeholder="Payment due within 30 days. Thank you for your business!" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 resize-none" />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Accept Payments Via</label>
        <div className="grid grid-cols-2 gap-2">
          {PAY_METHODS.map(m => (
            <button key={m.k} onClick={() => toggleMethod(m.k)}
              className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all ${methods[m.k] ? 'border-indigo-300 bg-indigo-50/60' : 'border-gray-200 bg-white'}`}>
              <div className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center ${methods[m.k] ? 'bg-indigo-600' : 'border-2 border-gray-300'}`}>
                {methods[m.k] && <Check className="w-2.5 h-2.5 text-white" />}
              </div>
              <div><div className="text-xs font-semibold text-gray-800 leading-tight">{m.label}</div><div className="text-xs text-gray-400">{m.sub}</div></div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  const Preview = (
    <div className="bg-gray-100 min-h-full flex items-start justify-center p-4 md:p-8 overflow-y-auto flex-1">
      <div className="w-full max-w-xl">
        <div className="hidden md:block text-xs text-gray-400 uppercase tracking-widest mb-4 text-center font-medium">Live Preview</div>
        <div className="bg-white rounded-2xl shadow-[0_0_0_1px_rgba(0,0,0,.06),0_4px_6px_-1px_rgba(0,0,0,.07),0_12px_40px_rgba(0,0,0,.06)] p-6 md:p-10">
          <div className="flex justify-between items-start mb-7">
            <div>
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center mb-2.5">
                <span className="text-indigo-600 font-bold text-sm">{userName.split(' ').map(w => w[0]).join('').toUpperCase() || 'Y'}</span>
              </div>
              <div className="text-sm font-bold text-gray-900">{userName || 'Your Business'}</div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-indigo-600 leading-none">INVOICE</div>
              <div className="text-xs text-gray-400 mt-2 font-mono">INV-XXXX</div>
            </div>
          </div>
          <div className="grid grid-cols-3 bg-gray-50 rounded-xl p-3 mb-5 gap-2">
            <div><div className="text-xs text-gray-400 mb-0.5">Issued</div><div className="text-xs font-semibold text-gray-700">{today}</div></div>
            <div><div className="text-xs text-gray-400 mb-0.5">Due</div><div className="text-xs font-semibold text-gray-700">{dueDate}</div></div>
            <div><div className="text-xs text-gray-400 mb-0.5">Amount Due</div><div className="text-sm font-bold text-indigo-600">{fmt(total)}</div></div>
          </div>
          <div className="mb-5">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Bill To</div>
            {selectedClient ? (<div><div className="text-sm font-semibold text-gray-900">{selectedClient.name}</div><div className="text-xs text-gray-500">{selectedClient.email}</div>{selectedClient.address && <div className="text-xs text-gray-500">{selectedClient.address}</div>}</div>) : (<div className="text-xs text-gray-300 italic">No client selected</div>)}
          </div>
          <table className="w-full text-xs mb-1">
            <thead><tr className="border-b-2 border-gray-200"><th className="text-left text-xs font-semibold text-gray-400 pb-2">Description</th><th className="text-center text-xs font-semibold text-gray-400 pb-2 w-10">Qty</th><th className="text-right text-xs font-semibold text-gray-400 pb-2 w-20">Rate</th><th className="text-right text-xs font-semibold text-gray-400 pb-2 w-20">Amt</th></tr></thead>
            <tbody>{items.map((item, i) => (<tr key={item.id} className={i % 2 === 1 ? 'bg-gray-50' : ''}><td className="py-2 pr-2 text-gray-700">{item.desc || <span className="text-gray-300 italic">—</span>}</td><td className="py-2 text-center text-gray-600">{item.qty}</td><td className="py-2 text-right text-gray-600">{fmt(item.rate)}</td><td className="py-2 text-right font-semibold text-gray-800">{fmt(item.qty * item.rate)}</td></tr>))}</tbody>
          </table>
          <div className="border-t border-gray-200 pt-3 mt-1 space-y-1.5">
            <div className="flex justify-between text-xs text-gray-500"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
            <div className="flex justify-between text-xs text-gray-500"><span>Tax ({taxRate}%)</span><span>{fmt(tax)}</span></div>
            <div className="flex justify-between text-sm font-bold text-gray-900 pt-2 border-t border-gray-200 mt-1"><span>Total Due</span><span className="text-indigo-600">{fmt(total)}</span></div>
          </div>
          {notes && <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-400 leading-relaxed">{notes}</div>}
          <div className="mt-5">
            <button className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl text-sm">Pay {fmt(total)}</button>
            {enabledMethods.length > 0 && <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2.5">{enabledMethods.map(m => <span key={m} className="text-xs text-gray-400">{m}</span>)}</div>}
            <div className="text-center text-xs text-gray-300 mt-2">Secured by Invoica · Powered by Stripe</div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <div className="flex items-center gap-3 px-4 md:px-6 py-3.5 bg-white border-b border-gray-200 flex-shrink-0 sticky top-0 z-20">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 font-medium min-h-[44px] pr-2"><ArrowLeft className="w-4 h-4" />Back</button>
        <span className="hidden md:block text-gray-300">|</span>
        <span className="text-sm font-semibold text-gray-800 flex-1">New Invoice</span>
        <div className="flex gap-2">
          <button className="px-3 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-300 rounded-lg min-h-[38px]">Draft</button>
          <button className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg min-h-[38px]"><Send className="w-3 h-3" />Send</button>
        </div>
      </div>
      <div className="md:hidden flex border-b border-gray-200 bg-white flex-shrink-0">
        {['edit', 'preview'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-semibold capitalize transition-colors ${tab === t ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-400'}`}>
            {t === 'edit' ? 'Edit' : 'Preview'}
          </button>
        ))}
      </div>
      <div className="flex-1 flex overflow-hidden">
        <div className={`${tab === 'edit' ? 'flex' : 'hidden'} flex-col w-full md:flex md:w-[46%] md:border-r md:border-gray-200 bg-white overflow-y-auto`}>{Form}</div>
        <div className={`${tab === 'preview' ? 'flex' : 'hidden'} flex-col flex-1 w-full md:flex overflow-y-auto`}>{Preview}</div>
      </div>
    </div>
  )
}
