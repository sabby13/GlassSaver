import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// The screensaver UI (Background, Clock, DateCard) is added in the next step.
function Placeholder(): JSX.Element {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        background: '#000',
        color: '#fff',
        fontFamily: 'system-ui, sans-serif',
        letterSpacing: '0.05em'
      }}
    >
      GlassSaver — scaffold running
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Placeholder />
  </StrictMode>
)
