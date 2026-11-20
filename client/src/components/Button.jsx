import clsx from 'clsx'

const variants = {
  primary: 'gradient-brand text-white shadow-glow-sm hover:shadow-glow hover:brightness-110 active:brightness-95',
  secondary: 'bg-dark-700 text-dark-100 hover:bg-dark-600 active:bg-dark-700',
  outline: 'border border-dark-600/50 bg-dark-800/50 text-dark-200 hover:bg-dark-700/50 hover:border-dark-500/50 hover:text-white',
  ghost: 'text-dark-400 hover:bg-dark-800/60 hover:text-dark-200',
  danger: 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/30',
}

export default function Button({ children, className, variant = 'primary', type = 'button', ...props }) {
  return (
    <button
      type={type}
      className={clsx(
        'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dark-900',
        'transform active:scale-[0.97]',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
