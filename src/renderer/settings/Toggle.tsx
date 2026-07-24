export interface ToggleProps {
  checked: boolean
  onChange: (next: boolean) => void
  label?: string
}

/** A small, accessible on/off switch. */
export function Toggle({ checked, onChange, label }: ToggleProps): JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={checked ? 'toggle toggle--on' : 'toggle'}
      onClick={() => onChange(!checked)}
    >
      <span className="toggle__thumb" />
    </button>
  )
}
