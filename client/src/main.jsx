import React from 'react'
import { hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import App from './App.jsx'
import './index.css'

// Client entry: hydrates the prerendered HTML. BrowserRouter gives real
// paths (no hash routes) for all client-side navigation after hydration.
hydrateRoot(
  document.getElementById('root'),
  <HelmetProvider>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </HelmetProvider>,
)
