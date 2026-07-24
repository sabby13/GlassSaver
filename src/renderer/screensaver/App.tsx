import { Background } from '../components/Background'
import { Clock } from '../components/Clock'
import { DateCard } from '../components/DateCard'

/**
 * The screensaver window: the wallpaper, with the clock and date centered
 * on top as a vertical stack.
 */
export function App(): JSX.Element {
  return (
    <div className="screensaver">
      <Background />
      <main className="stage">
        <div className="time-stack">
          <Clock />
          <DateCard />
        </div>
      </main>
    </div>
  )
}
