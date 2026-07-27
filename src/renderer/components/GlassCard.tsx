import type { HTMLAttributes, ReactNode } from 'react'
import './GlassCard.css'

export interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

/**
 * A reusable frosted-glass surface. Purely presentational — it holds no clock
 * or app logic and simply wraps its children in a glassmorphism container.
 * This is the foundation every future UI element builds on.
 *
 * Extra props (className, style, etc.) are forwarded to the root element so
 * callers can position or extend the card without touching its visual base.
 */
export function GlassCard({ children, className, ...rest }: GlassCardProps): JSX.Element {
  return (
    <div className={className ? `glass-card ${className}` : 'glass-card'} {...rest}>
      <span className="glass-card__refraction" aria-hidden="true" />
      <div className="glass-card__content">{children}</div>
    </div>
  )
}
