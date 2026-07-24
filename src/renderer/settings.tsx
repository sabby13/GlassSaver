import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// The real settings form is added in a later step.
function Placeholder(): JSX.Element {
  return (
    <div
      style={{
        fontFamily: 'system-ui, sans-serif',
        color: '#f2f2f7',
        background: '#1c1c1e',
        height: '100vh',
        margin: 0,
        display: 'grid',
        placeItems: 'center'
      }}
    >
      Settings — coming next
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Placeholder />
  </StrictMode>
)
