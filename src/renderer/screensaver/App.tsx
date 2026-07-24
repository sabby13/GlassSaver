import { Background } from '../components/Background'

/**
 * The screensaver window. For now it renders only the wallpaper; the clock
 * and glass cards are layered on top in later milestones.
 */
export function App(): JSX.Element {
  return (
    <div className="screensaver">
      <Background />
    </div>
  )
}
