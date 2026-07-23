import type { ReactNode } from 'react'
import clsx from 'clsx'

export function Panel({ children, className, paper }: { children: ReactNode; className?: string; paper?: boolean }) {
  return (
    <div className={clsx(paper ? 'panel-paper' : 'panel-wood', 'rounded-sm shadow-lg', className)}>
      {children}
    </div>
  )
}

export function Button({
  children,
  onClick,
  disabled,
  variant = 'brass',
  className,
  title,
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: 'brass' | 'ghost' | 'danger'
  className?: string
  title?: string
}) {
  if (variant === 'ghost') {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={clsx(
          'px-3 py-1.5 rounded-sm text-sm border border-paper-300/40 bg-black/20 text-paper-100 hover:bg-black/35 transition disabled:opacity-40 disabled:cursor-not-allowed',
          className,
        )}
      >
        {children}
      </button>
    )
  }
  if (variant === 'danger') {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={clsx(
          'px-3 py-1.5 rounded-sm text-sm font-semibold bg-ember-500 text-paper-100 border border-black/30 hover:brightness-110 active:brightness-90 transition disabled:opacity-40 disabled:cursor-not-allowed',
          className,
        )}
      >
        {children}
      </button>
    )
  }
  return (
    <button onClick={onClick} disabled={disabled} title={title} className={clsx('btn-brass px-3 py-1.5 rounded-sm text-sm font-semibold transition', className)}>
      {children}
    </button>
  )
}
