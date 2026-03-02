import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import ENV_CONFIG from './config/env'

// Log configuración en desarrollo
if (ENV_CONFIG.APP.DEBUG) {
  console.log('🔧 ENV Configuration:', ENV_CONFIG)
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

