import { Background } from '../components/Background'
import { Clock } from '../components/Clock'

/**
 * The screensaver window: the wallpaper, with the clock centered on top.
 * The DateCard is layered in beneath the clock in a later milestone.
 */
export function App(): JSX.Element {
  return (
    <div className="screensaver">
      <Background />
      <main className="stage">
        <Clock />
      </main>
    </div>
  )
}
