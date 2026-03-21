import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './AuthContext.jsx'

const savedTheme = localStorage.getItem('orbit_theme');
if (savedTheme) {
  document.body.className = `theme-${savedTheme.toLowerCase()}`;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
