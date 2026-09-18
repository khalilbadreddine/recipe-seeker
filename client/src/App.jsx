import React, { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { FavoritesProvider } from './context/FavoritesContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './pages/Home'
import RecipePage from './pages/RecipePage'
import RecipesIndex from './pages/RecipesIndex'
import NutrientHub from './pages/NutrientHub'
import NutrientIndex from './pages/NutrientIndex'
import GuidePage from './pages/GuidePage'
import BlogIndex from './pages/BlogIndex'
import BlogPost from './pages/BlogPost'
import SearchPage from './pages/SearchPage'
import DayBuilderPage from './pages/DayBuilderPage'
import SavedPage from './pages/SavedPage'
import FibermaxPage from './pages/FibermaxPage'
import AboutPage from './pages/AboutPage'
import DisclaimerPage from './pages/DisclaimerPage'
import PrivacyPage from './pages/PrivacyPage'
import ContactPage from './pages/ContactPage'
import ReviewConsole from './pages/admin/ReviewConsole'
import Dashboard from './pages/admin/Dashboard'
import NotFound from './pages/NotFound'

/** Scroll to top on route change (client-side only effect; harmless in SSR). */
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  return (
    <AuthProvider>
      <FavoritesProvider>
        <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/recipes" element={<RecipesIndex />} />
          <Route path="/recipes/:slug" element={<RecipePage />} />
          <Route path="/nutrients" element={<NutrientIndex />} />
          <Route path="/nutrients/:slug" element={<NutrientHub />} />
          <Route path="/guides/:slug" element={<GuidePage />} />
          <Route path="/blog" element={<BlogIndex />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/day-builder" element={<DayBuilderPage />} />
          <Route path="/saved" element={<SavedPage />} />
          <Route path="/fibermax-reset" element={<FibermaxPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/disclaimer" element={<DisclaimerPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/admin/review" element={<ReviewConsole />} />
          <Route path="/admin/dashboard" element={<Dashboard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
        </div>
      </FavoritesProvider>
    </AuthProvider>
  )
}
