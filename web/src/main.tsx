import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

const storedTheme = localStorage.getItem('theme')
const initialTheme = storedTheme === 'dark' || storedTheme === 'dim' ? 'dark' : 'light'
document.documentElement.dataset.theme = initialTheme
if (storedTheme === 'dim') localStorage.setItem('theme', 'dark')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
