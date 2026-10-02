import React from 'react'
import { hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import App from './App.jsx'
import { seedDetails } from './lib/details'
import './index.css'

// Detail data embedded by the prerenderer for this page (same object the
// static HTML was rendered from), so hydration matches exactly.
const pageData = document.getElementById('page-data')
if (pageData) {
  try {
    seedDetails(JSON.parse(pageData.textContent))
  } catch {
    /* fall back to fetching on demand */
  }
}

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
