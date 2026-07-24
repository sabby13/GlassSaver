import { Fragment, useEffect, useState } from 'react'
import { DEFAULT_SETTINGS, type Settings } from '@shared/settings'
import { GlassCard } from './GlassCard'
import './Clock.css'

/** Zero-padded two-digit string. */
function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/** Build the time segments (["22", "02"] or ["10", "22", "05"]) for the given settings. */
function timeSegments(now: Date, use24Hour: boolean, showSeconds: boolean): string[] {
  let hours = now.getHours()
  if (!use24Hour) {
    hours = hours % 12
    if (hours === 0) hours = 12
  }

  const segments = [pad(hours), pad(now.getMinutes())]
  if (showSeconds) segments.push(pad(now.getSeconds()))
  return segments
}

/**
 * The clock. Reads the 12/24-hour and seconds preferences once on mount and
 * ticks every second. Purely a time display — all glass styling lives in
 * GlassCard, which this renders into.
 */
export function Clock(): JSX.Element {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [now, setNow] = useState<Date>(() => new Date())

  useEffect(() => {
    let active = true
    window.glass
      .getSettings()
      .then((s) => {
        if (active) setSettings(s)
      })
      .catch(() => {
        /* keep defaults */
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const segments = timeSegments(now, settings.use24Hour, settings.showSeconds)

  return (
    <GlassCard className="clock-card">
      <time className="clock" dateTime={now.toISOString()}>
        {segments.map((segment, index) => (
          <Fragment key={index}>
            {index > 0 && (
              <span className="clock__separator" aria-hidden="true">
                :
              </span>
            )}
            <span className="clock__segment">{segment}</span>
          </Fragment>
        ))}
      </time>
    </GlassCard>
  )
}
