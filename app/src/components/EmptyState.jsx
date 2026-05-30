export function EmptyState({ icon: Icon, title, description, action, onAction }) {
  return (
    <div className="flex-1 flex items-center justify-center py-20 px-8">
      <div className="text-center max-w-xs">
        {Icon && (
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Icon className="w-6 h-6 text-indigo-400" />
          </div>
        )}
        <p className="text-sm font-semibold text-gray-700 mb-1">{title}</p>
        {description && <p className="text-xs text-gray-400 mb-4">{description}</p>}
        {action && onAction && (
          <button
            onClick={onAction}
            className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            {action}
          </button>
        )}
      </div>
    </div>
  )
}
