import { LayoutGrid, FileText, Users, Settings, Plus, Bell, DollarSign } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const NAV = [
  { id: 'dashboard', label: 'Dashboard', Icon: LayoutGrid },
  { id: 'estimates', label: 'Estimates', Icon: FileText   },
  { id: 'clients',   label: 'Clients',   Icon: Users      },
  { id: 'settings',  label: 'Settings',  Icon: Settings   },
]

const VIEW_TITLE = {
  dashboard: 'Dashboard',
  estimates: 'Estimates',
  clients:   'Clients',
  settings:  'Settings',
}

export function Layout({ children, view, setView, onNew }) {
  const { user } = useAuth()
  const initials = user
    ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase() || '?'
    : '?'

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">

      {/* ── Desktop Sidebar ─────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col flex-shrink-0 bg-slate-900 h-screen" style={{ width: 220 }}>

        {/* New Estimate button */}
        <div className="px-3 mt-5 mb-4">
          <button
            onClick={onNew}
            className="w-full flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2.5 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> New Estimate
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-2 space-y-0.5">
          {NAV.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium text-left transition-colors
                ${view === id
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </nav>

        {/* User footer */}
        <div className="px-2 pb-5">
          <div className="mt-3 flex items-center gap-2.5 px-3 py-2">
            <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="text-white text-xs font-medium truncate">
                {user ? `${user.first_name} ${user.last_name}` : '…'}
              </div>
              <div className="text-slate-400 text-xs truncate">{user?.email}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main area ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Mobile top bar */}
        <div className="flex md:hidden items-center justify-between px-4 py-3 bg-white border-b border-gray-200 sticky top-0 z-20">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-indigo-500 rounded-lg flex items-center justify-center">
              <DollarSign className="w-3 h-3 text-white" />
            </div>
            <span className="font-semibold text-sm text-gray-900">{VIEW_TITLE[view] ?? 'App'}</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative p-2 text-gray-400">
              <Bell className="w-5 h-5" />
            </button>
            <button
              onClick={onNew}
              className="flex items-center gap-1 bg-indigo-600 text-white text-xs font-semibold py-2 px-3 rounded-lg"
            >
              <Plus className="w-3 h-3" />New
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-auto pb-20 md:pb-0">
          {children}
        </div>

        {/* Mobile bottom nav */}
        <div className="flex md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-b z-30">
          <div className="flex items-end justify-around w-full pt-1">
            {[NAV[0], NAV[1]].map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setView(id)}
                className={`flex flex-col items-center gap-0.5 pb-2 px-3 pt-1 ${view === id ? 'text-indigo-600' : 'text-gray-400'}`}
              >
                <Icon className="w-5.5 h-5.5" style={{ width: 22, height: 22 }} />
                <span className="text-xs font-medium">{label}</span>
              </button>
            ))}
            <button onClick={onNew} className="flex flex-col items-center pb-1 px-2 -mt-4">
              <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg shadow-indigo-200">
                <Plus className="w-6 h-6 text-white" />
              </div>
            </button>
            {[NAV[2], NAV[3]].map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setView(id)}
                className={`flex flex-col items-center gap-0.5 pb-2 px-3 pt-1 ${view === id ? 'text-indigo-600' : 'text-gray-400'}`}
              >
                <Icon className="w-5.5 h-5.5" style={{ width: 22, height: 22 }} />
                <span className="text-xs font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
