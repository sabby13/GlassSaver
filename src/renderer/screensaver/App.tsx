import { Background } from '../components/Background'
import { Clock } from '../components/Clock'
import { DateCard } from '../components/DateCard'
import { ButterflyLayer } from '../components/ButterflyLayer'

/**
 * The screensaver window: the wallpaper, with the clock and date centered
 * on top as a vertical stack, and the butterfly as an atmospheric foreground.
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
      <ButterflyLayer />
    </div>
  )
}
