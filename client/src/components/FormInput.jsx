import clsx from 'clsx'

export default function FormInput({ label, error, className, ...props }) {
  return (
    <label className="block space-y-1.5 text-sm font-medium text-dark-300">
      <span>{label}</span>
      <input
        className={clsx(
          'w-full rounded-xl border bg-dark-800/60 px-3.5 py-2.5 text-white placeholder-dark-500 outline-none transition-all duration-200',
          'border-dark-700/50 hover:border-dark-600/50',
          'focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 focus:bg-dark-800',
          error && 'border-red-500/50 ring-2 ring-red-500/20',
          className
        )}
        {...props}
      />
      {error ? (
        <span className="block text-xs font-medium text-red-400">{error}</span>
      ) : null}
    </label>
  )
}
