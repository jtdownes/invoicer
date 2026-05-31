const STATUS = {
  // Invoice statuses
  paid:        ['bg-emerald-50 text-emerald-700', 'bg-emerald-500', 'Paid'],
  outstanding: ['bg-amber-50 text-amber-700',     'bg-amber-400',   'Outstanding'],
  overdue:     ['bg-red-50 text-red-700',          'bg-red-500',     'Overdue'],
  // Estimate statuses
  draft:       ['bg-gray-100 text-gray-500',       'bg-gray-400',    'Draft'],
  sent:        ['bg-blue-50 text-blue-700',         'bg-blue-500',    'Sent'],
  approved:    ['bg-emerald-50 text-emerald-700',   'bg-emerald-500', 'Approved'],
  declined:    ['bg-red-50 text-red-600',           'bg-red-400',     'Declined'],
}

export function Badge({ status }) {
  const [cls, dot, label] = STATUS[status?.toLowerCase()] ?? STATUS.draft
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  )
}
